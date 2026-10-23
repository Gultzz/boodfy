import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import type { FitMode } from '@/types';

interface ReaderZoomControlsProps {
  fitMode: FitMode;
  zoom: number;
  onSetFitMode: (mode: FitMode) => void;
  onSetZoom: (updater: (z: number) => number) => void;
  onResetZoom: () => void;
}

export function ReaderZoomControls({
  fitMode,
  zoom,
  onSetFitMode,
  onSetZoom,
  onResetZoom,
}: ReaderZoomControlsProps) {
  const handleZoomIn = () => {
    onSetFitMode('manual');
    onSetZoom((z) => Math.min(z + 0.15, 3.0));
  };

  const handleZoomOut = () => {
    onSetFitMode('manual');
    onSetZoom((z) => Math.max(z - 0.15, 0.5));
  };

  return (
    <div className="zoom-controls">
      <button
        className={`btn btn-ghost btn-sm ${fitMode === 'height' ? 'active' : ''}`}
        onClick={() => {
          onSetFitMode('height');
          onSetZoom(() => 1);
        }}
        title="Ajustar à Altura"
      >
        Ajustar Altura
      </button>
      <button
        className={`btn btn-ghost btn-sm ${fitMode === 'width' ? 'active' : ''}`}
        onClick={() => {
          onSetFitMode('width');
          onSetZoom(() => 1);
        }}
        title="Ajustar à Largura"
      >
        Ajustar Largura
      </button>
      <button
        className="btn btn-ghost btn-icon"
        onClick={handleZoomOut}
        disabled={zoom <= 0.5}
        title="Diminuir Zoom"
      >
        <ZoomOut size={16} />
      </button>
      <span className="zoom-text">{Math.round(zoom * 100)}%</span>
      <button
        className="btn btn-ghost btn-icon"
        onClick={handleZoomIn}
        disabled={zoom >= 3.0}
        title="Aumentar Zoom"
      >
        <ZoomIn size={16} />
      </button>
      {zoom !== 1 && (
        <button
          className="btn btn-ghost btn-icon"
          onClick={onResetZoom}
          title="Redefinir Zoom"
        >
          <RotateCw size={14} />
        </button>
      )}
    </div>
  );
}

