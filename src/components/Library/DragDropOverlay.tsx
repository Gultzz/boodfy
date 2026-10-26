import { UploadCloud } from 'lucide-react';
import './DragDropOverlay.css';

export function DragDropOverlay() {
  return (
    <div className="drag-drop-overlay">
      <div className="drag-drop-box">
        <UploadCloud size={64} className="drag-drop-icon" />
        <div className="drag-drop-title">Solte seus PDFs aqui</div>
        <div className="drag-drop-subtitle">
          Arraste um ou mais livros PDF para adicioná-los instantaneamente à sua biblioteca
        </div>
      </div>
    </div>
  );
}

