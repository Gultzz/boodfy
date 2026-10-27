import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Sidebar,
  Eye,
  Maximize,
  Minimize,
  BookOpen,
  ListTree,
  GraduationCap,
  Menu,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onGoToPage(p);
    } else {
      setInputPage(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    onSetFitMode('manual');
    onSetZoom((z) => Math.min(z + 0.15, 3.0));
  };

  const handleZoomOut = () => {
    onSetFitMode('manual');
    onSetZoom((z) => Math.max(z - 0.15, 0.5));
  };

  return (
    <header className="reader-header">
      {/* Lado Esquerdo: Voltar e Título */}
      <div className="reader-header-left">
        <button className="btn btn-ghost btn-icon" onClick={onBack} title="Voltar para Biblioteca">
          <ArrowLeft size={18} />
        </button>
        <span className="reader-book-title truncate" title={title}>
          {title}
        </span>
      </div>

      {/* Centro Absoluto: Controle de Páginas (sempre no centro superior) */}
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

      <div className="reader-header-right desktop-actions">
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

      <div className="reader-header-mobile" ref={menuRef}>
        <button
          className={`btn btn-ghost btn-icon ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          title="Opções do Leitor"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {isMenuOpen && (
          <div className="reader-mobile-dropdown">
            {/* Seção 1: Ajuste de visualização */}
            <div className="mobile-dropdown-section">
              <span className="mobile-dropdown-label">Ajuste de Tela</span>
              <div className="mobile-fit-grid">
                <button
                  className={`mobile-pill-btn ${fitMode === 'height' ? 'active' : ''}`}
                  onClick={() => {
                    onSetFitMode('height');
                    onSetZoom(() => 1);
                  }}
                >
                  <Maximize2 size={14} />
                  <span>Ajustar Altura</span>
                </button>
                <button
                  className={`mobile-pill-btn ${fitMode === 'width' ? 'active' : ''}`}
                  onClick={() => {
                    onSetFitMode('width');
                    onSetZoom(() => 1);
                  }}
                >
                  <Maximize2 size={14} style={{ transform: 'rotate(90deg)' }} />
                  <span>Ajustar Largura</span>
                </button>
              </div>
            </div>

            {/* Seção 2: Controle de Zoom */}
            <div className="mobile-dropdown-section">
              <span className="mobile-dropdown-label">Zoom ({Math.round(zoom * 100)}%)</span>
              <div className="mobile-zoom-bar">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  title="Diminuir Zoom"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  className="btn btn-secondary btn-sm mobile-zoom-reset"
                  onClick={onResetZoom}
                  title="Redefinir 100%"
                >
                  <RotateCw size={14} />
                  <span>100%</span>
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3.0}
                  title="Aumentar Zoom"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

            <div className="mobile-dropdown-divider" />

            {/* Seção 3: Ações e Modos */}
            <div className="mobile-dropdown-section">
              <span className="mobile-dropdown-label">Ferramentas de Leitura</span>
              <div className="mobile-dropdown-actions">
                <button
                  className={`mobile-menu-item ${doublePage ? 'active' : ''}`}
                  onClick={() => {
                    onToggleDoublePage();
                    setIsMenuOpen(false);
                  }}
                >
                  <BookOpen size={18} />
                  <span>{doublePage ? 'Modo Página Única' : 'Modo Página Dupla'}</span>
                </button>

                <button
                  className={`mobile-menu-item ${showThumbnails ? 'active' : ''}`}
                  onClick={() => {
                    onToggleThumbnails();
                    setIsMenuOpen(false);
                  }}
                >
                  <Sidebar size={18} />
                  <span>Miniaturas das Páginas</span>
                </button>

                <button
                  className={`mobile-menu-item ${showOutline ? 'active' : ''}`}
                  onClick={() => {
                    onToggleOutline();
                    setIsMenuOpen(false);
                  }}
                >
                  <ListTree size={18} />
                  <span>Sumário do Livro</span>
                </button>

                <button
                  className={`mobile-menu-item ${studentMode ? 'active' : ''}`}
                  onClick={() => {
                    onToggleStudentMode();
                    setIsMenuOpen(false);
                  }}
                >
                  <GraduationCap size={18} />
                  <span>Modo Estudante & Quizzes</span>
                </button>

                <button
                  className={`mobile-menu-item ${focusMode ? 'active' : ''}`}
                  onClick={() => {
                    onToggleFocusMode();
                    setIsMenuOpen(false);
                  }}
                >
                  <Eye size={18} />
                  <span>{focusMode ? 'Sair do Modo Foco' : 'Modo Foco'}</span>
                </button>

                <button
                  className="mobile-menu-item"
                  onClick={() => {
                    onToggleFullscreen();
                    setIsMenuOpen(false);
                  }}
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  <span>{isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

