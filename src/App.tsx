import { useState, useCallback, useRef } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Trash2, 
  RotateCcw, 
  ZoomIn, 
  Crop, 
  Download, 
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Loader2,
  Layers,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import getCroppedImg from './lib/cropImage';
import { detectFaces } from './services/geminiService';

interface ImageItem {
  id: string;
  src: string;
  name: string;
  crop: Point;
  zoom: number;
  rotation: number;
  croppedAreaPixels: Area | null;
  croppedImage: string | null;
  detecting?: boolean;
}

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [allDetecting, setAllDetecting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImage = images[currentIndex];

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setImages(prev => prev.map((img, i) => 
      i === currentIndex ? { ...img, croppedAreaPixels } : img
    ));
  }, [currentIndex]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).slice(0, 20); // Limit to 20
      const newImages: ImageItem[] = [];
      
      files.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = () => {
          setImages(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            src: reader.result as string,
            name: file.name,
            crop: { x: 0, y: 0 },
            zoom: 1,
            rotation: 0,
            croppedAreaPixels: null,
            croppedImage: null
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const onSelectFile = () => {
    fileInputRef.current?.click();
  };

  const updateCurrentImage = (updates: Partial<ImageItem>) => {
    setImages(prev => prev.map((img, i) => 
      i === currentIndex ? { ...img, ...updates } : img
    ));
  };

  const showCroppedImage = async () => {
    try {
      setLoading(true);
      if (currentImage && currentImage.src && currentImage.croppedAreaPixels) {
        const cropped = await getCroppedImg(
          currentImage.src, 
          currentImage.croppedAreaPixels, 
          currentImage.rotation
        );
        updateCurrentImage({ croppedImage: cropped });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const cropAllImages = async () => {
    try {
      setLoading(true);
      const updatedImages = await Promise.all(images.map(async (img) => {
        if (img.src && img.croppedAreaPixels && !img.croppedImage) {
          const cropped = await getCroppedImg(img.src, img.croppedAreaPixels, img.rotation);
          return { ...img, croppedImage: cropped };
        }
        return img;
      }));
      setImages(updatedImages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const autoDetectFace = async (index: number) => {
    const img = images[index];
    if (!img.src) return;
    
    try {
      setImages(prev => prev.map((item, i) => i === index ? { ...item, detecting: true } : item));
      const faces = await detectFaces(img.src);
      if (faces.length > 0) {
        const face = faces[0];
        const fx = (face.xmin + face.xmax) / 2;
        const fy = (face.ymin + face.ymax) / 2;
        const cropX = -(fx - 500) / 10;
        const cropY = -(fy - 500) / 10;
        
        const faceWidth = (face.xmax - face.xmin);
        const faceHeight = (face.ymax - face.ymin);
        const maxDim = Math.max(faceWidth, faceHeight);
        const targetZoom = Math.min(Math.max(1000 / (maxDim * 1.8), 1), 3);

        setImages(prev => prev.map((item, i) => 
          i === index ? { ...item, crop: { x: cropX, y: cropY }, zoom: targetZoom, detecting: false } : item
        ));
      } else {
        setImages(prev => prev.map((item, i) => i === index ? { ...item, detecting: false } : item));
      }
    } catch (error) {
      console.error(error);
      setImages(prev => prev.map((item, i) => i === index ? { ...item, detecting: false } : item));
    }
  };

  const detectAllFaces = async () => {
    setAllDetecting(true);
    for (let i = 0; i < images.length; i++) {
      if (!images[i].croppedImage) {
        await autoDetectFace(i);
      }
    }
    setAllDetecting(false);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (currentIndex >= filtered.length) {
        setCurrentIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const reset = () => {
    setImages([]);
    setCurrentIndex(0);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-hidden bg-bg-editor selection:bg-zinc-100 selection:text-zinc-900" dir="rtl">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-bg-editor/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-100 rounded flex items-center justify-center">
              <Crop className="w-5 h-5 text-zinc-900" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">قَص PRO</span>
          </div>
          <div className="h-4 w-px bg-zinc-800 hidden sm:block"></div>
          {images.length > 0 && (
            <div className="hidden sm:flex gap-4 items-center">
              <span className="text-xs text-zinc-500 font-mono">{images.length} / 20 صور</span>
              <button onClick={reset} className="text-sm text-zinc-400 hover:text-white transition-colors">إفراغ القائمة</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {images.length > 0 && (
            <>
              <button 
                onClick={detectAllFaces}
                disabled={allDetecting || loading}
                className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {allDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                التعرف التلقائي للكل
              </button>
              <button 
                onClick={cropAllImages}
                disabled={loading || allDetecting}
                className="px-4 py-2 text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-white rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? "جاري القَص الجماعي..." : "قَص جميع الصور"}
              </button>
            </>
          )}
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-16 border-l border-zinc-800 flex flex-col items-center py-6 gap-6 bg-bg-editor z-20">
          <button onClick={onSelectFile} className="p-3 bg-zinc-800 rounded-xl text-zinc-100 shadow-lg hover:bg-zinc-700 transition-colors">
            <Upload className="w-5 h-5" />
          </button>
          <div className="h-px w-8 bg-zinc-800"></div>
          <button 
            disabled={!currentImage}
            onClick={() => autoDetectFace(currentIndex)}
            className="p-3 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400 rounded-xl transition-all disabled:opacity-50"
          >
            {currentImage?.detecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          </button>
          <button 
            disabled={!currentImage}
            onClick={() => updateCurrentImage({ rotation: (currentImage.rotation + 90) % 360 })}
            className="p-3 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 rounded-xl transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </aside>

        {/* Gallery Sidebar */}
        {images.length > 0 && (
          <aside className="w-48 border-l border-zinc-800 bg-bg-editor/50 overflow-y-auto p-4 hidden md:flex flex-col gap-3">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">معرض الصور</h3>
             {images.map((img, idx) => (
               <div 
                key={img.id}
                onClick={() => setCurrentIndex(idx)}
                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${currentIndex === idx ? 'border-zinc-100 ring-2 ring-zinc-100/20' : 'border-transparent hover:border-zinc-700'}`}
               >
                 <img src={img.src} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                 {img.croppedImage && (
                   <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                     <CheckCircle2 className="w-6 h-6 text-emerald-400 drop-shadow-lg" />
                   </div>
                 )}
                 <button 
                  onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                  className="absolute top-1 left-1 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <X className="w-3 h-3" />
                 </button>
               </div>
             ))}
          </aside>
        )}

        {/* Main Workspace */}
        <main className="flex-1 bg-bg-workspace relative flex items-center justify-center p-8">
          <div className="absolute inset-0 editor-grid pointer-events-none"></div>
          
          <AnimatePresence mode="wait">
            {images.length === 0 ? (
              <motion.div
                key="uploader"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full max-w-xl z-10"
              >
                <div 
                  onClick={onSelectFile}
                  className="border-2 border-dashed border-zinc-800 bg-bg-editor/50 rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 hover:bg-bg-editor transition-all group backdrop-blur-sm shadow-2xl"
                >
                  <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-zinc-800 group-hover:border-zinc-600">
                    <Upload className="w-8 h-8 text-zinc-500 group-hover:text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">الرفع المتعدد</h2>
                  <p className="text-zinc-500 mb-8">ارفع حتى 20 صورة للقص الجماعي</p>
                  <div className="px-6 py-3 bg-zinc-100 text-zinc-900 rounded-xl font-bold group-hover:bg-white transition-colors">
                    اختر الصور
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    multiple
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                  />
                </div>
              </motion.div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                {/* Image Navigation */}
                <div className="absolute top-0 inset-x-0 flex justify-between items-center z-20 pointer-events-none">
                  <button 
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    className="p-4 bg-zinc-900/80 text-white rounded-full ml-4 pointer-events-auto hover:bg-zinc-800 disabled:opacity-0 transition-opacity"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="bg-zinc-900/80 px-4 py-1 rounded-full text-[10px] font-mono text-zinc-400 backdrop-blur-sm">
                    {currentIndex + 1} / {images.length}
                  </div>
                  <button 
                    disabled={currentIndex === images.length - 1}
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="p-4 bg-zinc-900/80 text-white rounded-full mr-4 pointer-events-auto hover:bg-zinc-800 disabled:opacity-0 transition-opacity"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </div>

                {!currentImage.croppedImage ? (
                  <motion.div
                    key={`cropper-${currentImage.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative w-full max-w-[700px] aspect-square bg-zinc-900 shadow-2xl ring-1 ring-white/10 rounded-xl overflow-hidden"
                  >
                    <Cropper
                      image={currentImage.src}
                      crop={currentImage.crop}
                      zoom={currentImage.zoom}
                      rotation={currentImage.rotation}
                      aspect={1}
                      onCropChange={(c) => updateCurrentImage({ crop: c })}
                      onRotationChange={(r) => updateCurrentImage({ rotation: r })}
                      onCropComplete={onCropComplete}
                      onZoomChange={(z) => updateCurrentImage({ zoom: z })}
                    />
                    
                    {/* Controls Overlay */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-zinc-900/95 border border-zinc-800 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md z-10 w-max">
                       <div className="flex items-center gap-4">
                         <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">تكبير</span>
                         <input
                            type="range"
                            value={currentImage.zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            onChange={(e) => updateCurrentImage({ zoom: Number(e.target.value) })}
                            className="w-24"
                          />
                       </div>
                       <div className="w-px h-6 bg-zinc-800"></div>
                       <div className="flex items-center gap-4">
                         <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">تدوير</span>
                         <input
                            type="range"
                            value={currentImage.rotation}
                            min={0}
                            max={360}
                            step={1}
                            onChange={(e) => updateCurrentImage({ rotation: Number(e.target.value) })}
                            className="w-24"
                          />
                       </div>
                       <div className="w-px h-6 bg-zinc-800"></div>
                       <button 
                        onClick={showCroppedImage}
                        disabled={loading}
                        className="text-[10px] font-bold text-zinc-100 bg-emerald-600 px-4 py-1 rounded-md hover:bg-emerald-500 disabled:opacity-50"
                       >
                         {loading ? "..." : "تأكيد"}
                       </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`result-${currentImage.id}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg z-10 text-center"
                  >
                    <div className="relative mb-8 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
                      <img src={currentImage.croppedImage} alt="Cropped" className="w-full" />
                      <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <CheckCircle2 className="w-20 h-20 text-emerald-400/50" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => updateCurrentImage({ croppedImage: null })}
                          className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all border border-zinc-700"
                        >
                          تعديل القَص
                        </button>
                        <a
                          href={currentImage.croppedImage}
                          download={`cropped-${currentImage.name}`}
                          className="px-8 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-bold transition-all shadow-xl flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          تحميل
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Sidebar */}
        <aside className="w-64 border-r border-zinc-800 p-6 hidden xl:flex flex-col gap-8 bg-bg-editor z-20">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-6">إحصائيات المجموعة</h3>
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                 <div className="flex items-center gap-3 mb-4">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-zinc-300">إجمالي الـصور</span>
                    <span className="mr-auto text-sm font-mono">{images.length}</span>
                 </div>
                 <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500" 
                      style={{ width: `${(images.filter(i => i.croppedImage).length / images.length) * 100}%` }}
                    ></div>
                 </div>
                 <div className="mt-4 flex justify-between items-center text-[10px] text-zinc-500">
                    <span>مكتمل: {images.filter(i => i.croppedImage).length}</span>
                    <span>متبقي: {images.filter(i => !i.croppedImage).length}</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <button 
              onClick={onSelectFile}
              className="w-full p-4 border border-zinc-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-3 h-3" />
              إضافة المزيد
            </button>
          </div>
        </aside>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-10 border-t border-zinc-800 bg-bg-editor flex items-center justify-between px-8 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] ${allDetecting ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
               {allDetecting ? 'جاري التعرف على الوجوه...' : 'المعالجة النشطة'}
            </span>
          </div>
          <span className="text-[10px] text-zinc-700">|</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
            {images.length > 0 && `الصورة ${currentIndex + 1} من ${images.length}`}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-zinc-600">{new Date().getFullYear()} © قَص PRO | أتمتة الذكاء الاصطناعي</span>
        </div>
      </footer>
    </div>
  );
}
