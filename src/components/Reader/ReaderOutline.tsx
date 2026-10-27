import { useEffect, useMemo, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ListOrdered, X } from 'lucide-react';
import type { Chapter } from '@/types';
import { buildChapters, chapterForPage } from '@/services/study-chapters';
import { ChapterOutlineList } from '@/components/common/ChapterOutlineList';
import './ReaderOutline.css';

interface ReaderOutlineProps {
  pdf: PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
  onClose: () => void;
}

export function ReaderOutline({
  pdf,
  totalPages,
  currentPage,
  onSelectPage,
  onClose,
}: ReaderOutlineProps) {
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdf || totalPages <= 0) {
      setChapters(null);
      setUsedFallback(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setChapters(null);
    setError(null);

    buildChapters(pdf, totalPages)
      .then((result) => {
        if (cancelled) return;
        setChapters(result.chapters);
        setUsedFallback(result.fallback);
      })
      .catch((err) => {
        console.error('Erro ao ler o sumário do PDF:', err);
        if (!cancelled) {
          setError('Não foi possível ler o sumário deste PDF.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pdf, totalPages]);

  const activeChapter = useMemo(
    () => (chapters && chapters.length > 0 ? chapterForPage(chapters, currentPage) : undefined),
    [chapters, currentPage],
  );

  return (
    <aside className="outline-sidebar" aria-label="Sumário do livro">
      <div className="outline-header">
        <div className="outline-header-title">
          <ListOrdered size={15} className="outline-header-icon" />
          <h4>Sumário</h4>
          {chapters && chapters.length > 0 && (
            <span className="outline-header-count">{chapters.length}</span>
          )}
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="Fechar sumário">
          <X size={16} />
        </button>
      </div>

      {chapters === null && !error && (
        <div className="outline-loading">
          <div className="spinner" />
          <p>Lendo sumário...</p>
        </div>
      )}

      {error && <p className="outline-empty">{error}</p>}

      {chapters !== null && !error && chapters.length === 0 && (
        <p className="outline-empty">Este PDF não possui sumário.</p>
      )}

      {chapters !== null && !error && chapters.length > 0 && (
        <ChapterOutlineList
          chapters={chapters}
          activeChapterId={activeChapter?.id ?? null}
          usedFallback={usedFallback}
          onSelectChapter={(chapter) => onSelectPage(chapter.startPage)}
        />
      )}
    </aside>
  );
}
