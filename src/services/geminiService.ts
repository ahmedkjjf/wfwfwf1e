import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface FaceBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export async function detectFaces(base64Image: string): Promise<FaceBox[]> {
  // Extract data from data URL
  const base64Data = base64Image.split(',')[1];
  const mimeType = base64Image.split(';')[0].split(':')[1];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: "Detect all faces in this image. Return the bounding box coordinates for each face as a JSON array of objects with keys 'ymin', 'xmin', 'ymax', 'xmax'. Values should be normalized from 0 to 1000 based on image dimensions.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            ymin: { type: Type.NUMBER },
            xmin: { type: Type.NUMBER },
            ymax: { type: Type.NUMBER },
            xmax: { type: Type.NUMBER },
          },
          required: ["ymin", "xmin", "ymax", "xmax"],
        },
      },
    },
  });

  try {
    const faces = JSON.parse(response.text.trim());
    return faces;
  } catch (error) {
    console.error("Failed to parse faces from Gemini response", error);
    return [];
  }
}
