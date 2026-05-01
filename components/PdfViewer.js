"use client";
import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

// Setup PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ url }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState(null);

  // Resize handler for responsiveness
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById("pdf-container");
      if (container) {
        setContainerWidth(container.clientWidth - 32); // 32px for padding
      }
    };
    
    // Initial size
    setTimeout(handleResize, 100);
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset) {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden relative">
      <div 
        id="pdf-container"
        className="flex-1 overflow-auto bg-slate-950 flex justify-center py-4 px-4"
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center h-full text-cyan-400 gap-3">
              <Loader2 className="animate-spin w-8 h-8" />
              <span className="text-sm font-medium">Loading Document...</span>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center h-full text-red-400 gap-3">
              <AlertCircle className="w-8 h-8" />
              <span className="text-sm font-medium">Failed to load PDF file.</span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 mt-2 rounded-xl bg-slate-800 text-white text-sm hover:bg-slate-700 transition">
                Download Instead
              </a>
            </div>
          }
        >
          {numPages && (
            <Page
              pageNumber={pageNumber}
              width={containerWidth ? containerWidth * scale : undefined}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-2xl rounded overflow-hidden max-w-full"
            />
          )}
        </Document>
      </div>

      {numPages && (
        <div className="flex items-center justify-between p-3 bg-slate-900 border-t border-white/10 z-10">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))} 
              className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-medium text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button 
              onClick={() => setScale(s => Math.min(2.5, s + 0.25))} 
              className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={pageNumber <= 1}
              onClick={previousPage}
              className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition disabled:opacity-30 disabled:hover:bg-white/5"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium text-slate-300">
              Page {pageNumber} of {numPages}
            </span>
            <button
              disabled={pageNumber >= numPages}
              onClick={nextPage}
              className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition disabled:opacity-30 disabled:hover:bg-white/5"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition font-medium"
          >
            Open Native
          </a>
        </div>
      )}
    </div>
  );
}
