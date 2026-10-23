import { useMemo } from 'react';
import { Document, Page as PdfPage } from 'react-pdf';
import { X } from 'lucide-react';
import './PageThumbnails.css';

interface PageThumbnailsProps {
  pdfData: ArrayBuffer;
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
  onClose: () => void;
}

export function PageThumbnails({
  pdfData,
  totalPages,
  currentPage,
  onSelectPage,
  onClose,
}: PageThumbnailsProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const fileSource = useMemo(() => {
    if (!pdfData) return null;
    return { data: new Uint8Array(pdfData.slice(0)) };
  }, [pdfData]);

  return (
    <aside className="thumbnails-sidebar">
      <div className="thumbnails-header">
        <h4>Páginas ({totalPages})</h4>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="Fechar miniaturas">
          <X size={16} />
        </button>
      </div>

      <div className="thumbnails-list">
        {pages.map((pageNum) => {
          const isSelected = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              className={`thumbnail-item ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectPage(pageNum)}
            >
              <div className="thumbnail-preview">
                {fileSource && (
                  <Document
                    file={fileSource}
                    loading={<div className="thumb-loading" />}
                  >
                    <PdfPage
                      pageNumber={pageNum}
                      width={110}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                  </Document>
                )}
              </div>
              <span className="thumbnail-num">{pageNum}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
