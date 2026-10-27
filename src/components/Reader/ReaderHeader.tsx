import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sidebar,
  Eye,
  Maximize,
  Minimize,
  BookOpen,
  ListTree,
  GraduationCap,
} from 'lucide-react';
import { ReaderZoomControls } from './ReaderZoomControls';
import type { FitMode } from '@/types';

interface ReaderHeaderProps {
  title: string;
  currentPage: number;
  totalPages: number;
  fitMode: FitMode;
  zoom: number;
  showThumbnails: boolean;
  showOutline: boolean;
  studentMode: boolean;
  focusMode: boolean;
  isFullscreen: boolean;
  doublePage: boolean;
  onBack: () => void;
  onGoToPage: (page: number) => void;
  onSetFitMode: (mode: FitMode) => void;
  onSetZoom: (updater: (z: number) => number) => void;
  onResetZoom: () => void;
  onToggleThumbnails: () => void;
  onToggleOutline: () => void;
  onToggleStudentMode: () => void;
  onToggleFocusMode: () => void;
  onToggleFullscreen: () => void;
  onToggleDoublePage: () => void;
}

export function ReaderHeader({
  title,
  currentPage,
  totalPages,
  fitMode,
  zoom,
  showThumbnails,
  showOutline,
  studentMode,
  focusMode,
  isFullscreen,
  doublePage,
  onBack,
  onGoToPage,
  onSetFitMode,
  onSetZoom,
  onResetZoom,
  onToggleThumbnails,
  onToggleOutline,
  onToggleStudentMode,
  onToggleFocusMode,
  onToggleFullscreen,
  onToggleDoublePage,
}: ReaderHeaderProps) {
  const [inputPage, setInputPage] = useState(String(currentPage));

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onGoToPage(p);
    } else {
      setInputPage(String(currentPage));
    }
  };

  return (
    <header className="reader-header">
      <div className="reader-header-left">
        <button className="btn btn-ghost btn-icon" onClick={onBack} title="Voltar para Biblioteca">
          <ArrowLeft size={18} />
        </button>
        <span className="reader-book-title truncate" title={title}>
          {title}
        </span>
      </div>

      <div className="reader-header-center">
        <form onSubmit={handlePageInputSubmit} className="page-nav-form">
          <input
            type="text"
            className="input page-input"
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onBlur={handlePageInputSubmit}
            title="Digite a página e pressione Enter"
          />
          <span className="page-total">de {totalPages || '—'}</span>
        </form>
      </div>

      <div className="reader-header-right">
        <ReaderZoomControls
          fitMode={fitMode}
          zoom={zoom}
          onSetFitMode={onSetFitMode}
          onSetZoom={onSetZoom}
          onResetZoom={onResetZoom}
        />

        <div className="divider-v" />

        <button
          className={`btn btn-ghost btn-icon ${doublePage ? 'active' : ''}`}
          onClick={onToggleDoublePage}
          title={doublePage ? 'Modo Página Única' : 'Modo Página Dupla'}
          aria-pressed={doublePage}
        >
          <BookOpen size={18} />
        </button>

        <button
          className={`btn btn-ghost btn-icon ${showThumbnails ? 'active' : ''}`}
          onClick={onToggleThumbnails}
          title="Miniaturas das Páginas"
        >
          <Sidebar size={18} />
        </button>

        <button
          className={`btn btn-ghost btn-icon ${showOutline ? 'active' : ''}`}
          onClick={onToggleOutline}
          title="Sumário"
          aria-pressed={showOutline}
        >
          <ListTree size={18} />
        </button>

        <button
          className={`btn btn-ghost ${studentMode ? 'active' : ''}`}
          onClick={onToggleStudentMode}
          title="Abrir Modo Estudante ao lado do PDF"
          aria-pressed={studentMode}
          style={{ gap: '6px', padding: '0 10px', height: '32px', fontSize: '12.5px' }}
        >
          <GraduationCap size={17} />
          <span>Modo Estudante</span>
        </button>

        <button
          className={`btn btn-ghost btn-icon ${focusMode ? 'active' : ''}`}
          onClick={onToggleFocusMode}
          title={focusMode ? 'Sair do Modo Foco (Esc)' : 'Modo Foco'}
        >
          <Eye size={18} />
        </button>

        <button
          className="btn btn-ghost btn-icon"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
    </header>
  );
}
