import { useState, useEffect } from 'react';

export default function ImageLightbox({ src, onClose }) {
  const [zoom, setZoom] = useState(1);

  const clamp = (z) => Math.min(5, Math.max(0.5, Math.round(z * 100) / 100));
  const zoomIn = () => setZoom((z) => clamp(z + 0.25));
  const zoomOut = () => setZoom((z) => clamp(z - 0.25));
  const reset = () => setZoom(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative bg-white rounded-xl shadow-2xl w-[min(90vw,480px)] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-11 shrink-0 border-b border-gray-200">
          <span className="text-sm text-slate-600 tabular-nums">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-slate-600 flex items-center justify-center text-lg leading-none transition"
            title="Close"
          >
            ×
          </button>
        </div>

        <div
          className="flex-1 overflow-auto flex items-center justify-center bg-black min-h-0"
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => clamp(z + (e.deltaY < 0 ? 0.15 : -0.15)));
          }}
        >
          <img
            src={src}
            alt=""
            className="object-contain transition-transform duration-100 select-none max-w-none"
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />
        </div>

        <div className="flex items-center justify-center gap-3 h-12 shrink-0 border-t border-gray-200">
          <button onClick={zoomOut} className="w-8 h-8 rounded-full hover:bg-gray-100 text-slate-700 text-lg leading-none transition" title="Zoom out">
            −
          </button>
          <button onClick={reset} className="px-3 h-8 rounded-full hover:bg-gray-100 text-slate-700 text-sm transition" title="Reset">
            1:1
          </button>
          <button onClick={zoomIn} className="w-8 h-8 rounded-full hover:bg-gray-100 text-slate-700 text-lg leading-none transition" title="Zoom in">
            +
          </button>
        </div>
      </div>
    </div>
  );
}
