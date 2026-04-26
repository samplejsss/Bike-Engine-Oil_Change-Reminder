"use client";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Image as Loader2, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

// Will use Tesseract dynamically to prevent build issues with Canvas/Node
// import Tesseract from "tesseract.js";

export default function MeterOCRUpload({ onOcrSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [parsedValue, setParsedValue] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Display preview
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    setLoading(true);
    setProgress(10);
    setParsedValue(null);

    try {
      // Dynamic import to avoid SSR errors
      const Tesseract = (await import("tesseract.js")).default;
      
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.max(10, Math.floor(m.progress * 100)));
            }
          }
        }
      );

      setProgress(100);
      const text = result.data.text;
      
      // Basic heuristic: find the largest contiguous number, or a number with 1 decimal
      const numberMatches = text.match(/\d+(\.\d{1})?/g);
      
      if (numberMatches && numberMatches.length > 0) {
        // Find the most likely odometer reading (largest number or last number)
        // This is a naive implementation; you could refine it
        const possibleKms = numberMatches.map(Number).filter(n => n > 0 && n < 999999);
        if (possibleKms.length > 0) {
          const highest = Math.max(...possibleKms);
          setParsedValue(highest);
          toast.success("Meter reading extracted!");
        } else {
          toast.error("Could not find a valid number.");
          setParsedValue("");
        }
      } else {
         toast.error("No numbers found in the image.");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      toast.error("Failed to read image. Please enter manually.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseValue = async () => {
     let imgbbUrl = null;
     if (imageFile && process.env.NEXT_PUBLIC_IMGBB_API_KEY) {
         setLoading(true);
         toast.loading("Uploading photo...", { id: "uploadingImage" });
         try {
             const formData = new FormData();
             formData.append('image', imageFile);
             
             const res = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`, {
                 method: 'POST',
                 body: formData
             });
             const data = await res.json();
             if (data.success) {
                 imgbbUrl = data.data.url;
             }
         } catch(e) {
            console.error("Image upload failed", e);
            toast.error("Failed to save image online, but reading continues.");
         } finally {
             toast.dismiss("uploadingImage");
             setLoading(false);
         }
     }
     onOcrSuccess(parsedValue, imgbbUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-white/10 rounded-xl p-4 mt-4"
    >
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Camera size={16} className="text-cyan-400" /> Auto-Read Meter
        </h4>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300">
          <XCircle size={16} />
        </button>
      </div>

      {!imagePreview ? (
        <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-10 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-cyan-500/50 hover:bg-cyan-500/5 group transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-cyan-500/20 transition-all">
                <Camera size={24} className="text-slate-400 group-hover:text-cyan-400" />
              </div>
              <span className="text-xs text-slate-400 font-medium">Take Photo / Upload</span>
            </button>
            <input 
              type="file" 
              accept="image/*" 
              // capture="environment" // Optional: prompts mobile camera immediately
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageCapture}
            />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10">
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src={imagePreview} alt="Meter preview" className="w-full h-full object-cover" />
             {loading && (
               <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-cyan-400" size={24} />
                  <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase">Analyzing {progress}%</span>
               </div>
             )}
          </div>
          
          {!loading && parsedValue !== null && (
            <div className="flex flex-col gap-3">
               <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex justify-between items-center">
                  <span className="text-xs text-cyan-200">Refined Result:</span>
                  <input
                    type="number"
                    value={parsedValue}
                    onChange={(e) => setParsedValue(e.target.value)}
                    className="bg-transparent border-b border-cyan-500/50 text-white font-mono text-xl w-24 text-right focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-sm text-cyan-400 font-bold ml-1">km</span>
               </div>
               
               <div className="flex gap-2">
                 <button
                   onClick={() => {
                      setImagePreview(null);
                      setParsedValue(null);
                   }}
                   className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700"
                 >
                   Retake
                 </button>
                 <button
                   onClick={handleUseValue}
                   disabled={loading}
                   className="flex-1 py-2 rounded-lg btn-glow text-white text-sm font-semibold flex justify-center items-center gap-1 disabled:opacity-50"
                 >
                   {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} 
                   {loading ? "Uploading..." : "Use Value"}
                 </button>
               </div>
            </div>
          )}
          {!loading && parsedValue === null && (
             <div className="flex justify-center">
                 <button
                   onClick={() => {
                      setImagePreview(null);
                   }}
                   className="py-2 px-4 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700"
                 >
                   Try Again
                 </button>
             </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
