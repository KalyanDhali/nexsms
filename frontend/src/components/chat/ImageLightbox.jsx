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
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <span className="text-white text-sm tabular-nums">{(zoom * 100).toFixed(0)}%</span>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl leading-none transition"
          title="Close"
        >
          ×
        </button>
      </div>

      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0"
        onClick={(e) => e.stopPropagation()}
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

      <div className="flex items-center justify-center gap-3 h-14 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={zoomOut} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg leading-none transition" title="Zoom out">
          −
        </button>
        <button onClick={reset} className="px-3 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition" title="Reset">
          1:1
        </button>
        <button onClick={zoomIn} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg leading-none transition" title="Zoom in">
          +
        </button>
      </div>
    </div>
  );
}
