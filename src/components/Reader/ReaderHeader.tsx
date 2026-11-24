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
  Highlighter,
  NotebookPen,
  Bookmark,
  Type,
} from 'lucide-react';
import { ReaderAppearancePopover } from './ReaderAppearancePopover';
import { ANNOTATION_COLORS, ANNOTATION_COLOR_ORDER } from '@/lib/colors';
import { useTranslation } from '@/stores/useI18nStore';
import type { AnnotationColor, FitMode, ReaderViewMode } from '@/types';

interface ReaderHeaderProps {
  title: string;
  currentPage: number;
  totalPages: number;
  viewMode: ReaderViewMode;
  fitMode: FitMode;
  zoom: number;
  showThumbnails: boolean;
  showOutline: boolean;
  showNotebook: boolean;
  showBookmarks: boolean;
  studentMode: boolean;
  focusMode: boolean;
  isFullscreen: boolean;
  doublePage: boolean;
  highlighterActive: boolean;
  activeHighlightColor: AnnotationColor;
  isCurrentPageBookmarked: boolean;
  notebookCount: number;
  onBack: () => void;
  onGoToPage: (page: number) => void;
  onChangeViewMode: (mode: ReaderViewMode) => void;
  onSetFitMode: (mode: FitMode) => void;
  onSetZoom: (updater: (z: number) => number) => void;
  onResetZoom: () => void;
  onToggleHighlighter: () => void;
  onSelectHighlightColor: (color: AnnotationColor) => void;
  onToggleNotebook: () => void;
  onToggleBookmarks: () => void;
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
  viewMode,
  fitMode,
  zoom,
  showThumbnails,
  showOutline,
  showNotebook,
  showBookmarks,
  studentMode,
  focusMode,
  isFullscreen,
  doublePage,
  highlighterActive,
  activeHighlightColor,
  isCurrentPageBookmarked,
  notebookCount,
  onBack,
  onGoToPage,
  onChangeViewMode,
  onSetFitMode,
  onSetZoom,
  onResetZoom,
  onToggleHighlighter,
  onSelectHighlightColor,
  onToggleNotebook,
  onToggleBookmarks,
  onToggleThumbnails,
  onToggleOutline,
  onToggleStudentMode,
  onToggleFocusMode,
  onToggleFullscreen,
  onToggleDoublePage,
}: ReaderHeaderProps) {
  const { t } = useTranslation();
  const [inputPage, setInputPage] = useState(String(currentPage));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

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

  return (
    <header className="reader-header">
      {/* Lado Esquerdo: Voltar e Título */}
      <div className="reader-header-left">
        <button
          className="btn btn-ghost btn-icon"
          onClick={onBack}
          title={t('reader.backToLibrary')}
          aria-label={t('reader.backToLibrary')}
        >
          <ArrowLeft size={18} />
        </button>
        <span className="reader-book-title truncate" title={title}>
          {title}
        </span>
      </div>

      {/* Centro: Controle de Página */}
      <div className="reader-header-center">
        <form onSubmit={handlePageInputSubmit} className="page-nav-form">
          <input
            type="text"
            className="input page-input"
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onBlur={handlePageInputSubmit}
            title={`${t('common.page')} ${currentPage}`}
          />
          <span className="page-total">
            {t('common.of')} {totalPages || '—'}
          </span>
        </form>
      </div>

      {/* Direita: Ferramentas essenciais sempre visíveis + menu compacto */}
      <div className="reader-header-right">
        {/* Grupo Marca-texto com seletor de 4 cores quando ativo */}
        <div className={`highlighter-toolbar-group ${highlighterActive ? 'active' : ''}`}>
          <button
            type="button"
            className={`btn btn-ghost btn-icon ${highlighterActive ? 'active' : ''}`}
            onClick={onToggleHighlighter}
            title={t('reader.highlighterHint')}
            aria-pressed={highlighterActive}
          >
            <Highlighter
              size={17}
              style={highlighterActive ? { color: ANNOTATION_COLORS[activeHighlightColor].hex } : undefined}
            />
          </button>
          {highlighterActive && (
            <div className="header-color-dots" role="radiogroup" aria-label={t('reader.highlighter')}>
              {ANNOTATION_COLOR_ORDER.map((c) => {
                const meta = ANNOTATION_COLORS[c];
                const active = activeHighlightColor === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`highlight-color-dot ${active ? 'active' : ''}`}
                    style={{ backgroundColor: meta.hex }}
                    onClick={() => onSelectHighlightColor(c)}
                    title={t(`annotation.${c}`)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Caderno & Marcações */}
        <button
          type="button"
          className={`btn btn-ghost btn-icon reader-badge-btn ${showNotebook ? 'active' : ''}`}
          onClick={onToggleNotebook}
          title={t('reader.notebook')}
          aria-pressed={showNotebook}
        >
          <NotebookPen size={17} />
          {notebookCount > 0 && <span className="reader-mini-count">{notebookCount}</span>}
        </button>

        {/* Marcadores de Página */}
        <button
          type="button"
          className={`btn btn-ghost btn-icon ${showBookmarks ? 'active' : ''}`}
          onClick={onToggleBookmarks}
          title={t('reader.bookmarks')}
          aria-pressed={showBookmarks}
        >
          <Bookmark
            size={17}
            fill={isCurrentPageBookmarked ? 'currentColor' : 'none'}
            style={isCurrentPageBookmarked ? { color: '#f59e0b' } : undefined}
          />
        </button>

        {/* Aparência & Leitura em Tempo Real (Ícone T) */}
        <div className="reader-popover-anchor">
          <button
            type="button"
            className={`btn btn-ghost btn-icon ${appearanceOpen ? 'active' : ''}`}
            onClick={() => setAppearanceOpen((prev) => !prev)}
            title={t('reader.appearance')}
            aria-expanded={appearanceOpen}
          >
            <Type size={17} />
          </button>
          <ReaderAppearancePopover
            isOpen={appearanceOpen}
            onClose={() => setAppearanceOpen(false)}
            viewMode={viewMode}
            onChangeViewMode={onChangeViewMode}
            fitMode={fitMode}
            zoom={zoom}
            onSetFitMode={onSetFitMode}
            onSetZoom={onSetZoom}
            onResetZoom={onResetZoom}
          />
        </div>

        <div className="divider-v desktop-only-control" />

        {/* Controles Desktop estendidos */}
        <div className="desktop-actions">
          {viewMode === 'pdf' && (
            <button
              type="button"
              className={`btn btn-ghost btn-icon ${doublePage ? 'active' : ''}`}
              onClick={onToggleDoublePage}
              title={doublePage ? t('reader.singlePage') : t('reader.doublePage')}
              aria-pressed={doublePage}
            >
              <BookOpen size={17} />
            </button>
          )}

          <button
            type="button"
            className={`btn btn-ghost btn-icon ${showThumbnails ? 'active' : ''}`}
            onClick={onToggleThumbnails}
            title={t('reader.thumbnails')}
          >
            <Sidebar size={17} />
          </button>

          <button
            type="button"
            className={`btn btn-ghost btn-icon ${showOutline ? 'active' : ''}`}
            onClick={onToggleOutline}
            title={t('reader.outline')}
            aria-pressed={showOutline}
          >
            <ListTree size={17} />
          </button>

          <button
            type="button"
            className={`btn btn-ghost ${studentMode ? 'active' : ''}`}
            onClick={onToggleStudentMode}
            title={t('reader.studentMode')}
            aria-pressed={studentMode}
            style={{ gap: '6px', padding: '0 10px', height: '32px', fontSize: '12.5px' }}
          >
            <GraduationCap size={17} />
            <span>{t('reader.studentMode')}</span>
          </button>

          <button
            type="button"
            className={`btn btn-ghost btn-icon ${focusMode ? 'active' : ''}`}
            onClick={onToggleFocusMode}
            title={focusMode ? t('reader.exitFocusMode') : t('reader.focusMode')}
          >
            <Eye size={17} />
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onToggleFullscreen}
            title={isFullscreen ? t('reader.exitFullscreen') : t('reader.fullscreen')}
          >
            {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>
        </div>

        {/* Menu Compacto para janelas estreitas */}
        <div className="reader-header-mobile" ref={menuRef}>
          <button
            type="button"
            className={`btn btn-ghost btn-icon ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title={t('library.options')}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          {isMenuOpen && (
            <div className="reader-mobile-dropdown">
              <div className="mobile-dropdown-actions">
                {viewMode === 'pdf' && (
                  <button
                    type="button"
                    className={`mobile-menu-item ${doublePage ? 'active' : ''}`}
                    onClick={() => {
                      onToggleDoublePage();
                      setIsMenuOpen(false);
                    }}
                  >
                    <BookOpen size={17} />
                    <span>{doublePage ? t('reader.singlePage') : t('reader.doublePage')}</span>
                  </button>
                )}

                <button
                  type="button"
                  className={`mobile-menu-item ${showThumbnails ? 'active' : ''}`}
                  onClick={() => {
                    onToggleThumbnails();
                    setIsMenuOpen(false);
                  }}
                >
                  <Sidebar size={17} />
                  <span>{t('reader.thumbnails')}</span>
                </button>

                <button
                  type="button"
                  className={`mobile-menu-item ${showOutline ? 'active' : ''}`}
                  onClick={() => {
                    onToggleOutline();
                    setIsMenuOpen(false);
                  }}
                >
                  <ListTree size={17} />
                  <span>{t('reader.outline')}</span>
                </button>

                <button
                  type="button"
                  className={`mobile-menu-item ${studentMode ? 'active' : ''}`}
                  onClick={() => {
                    onToggleStudentMode();
                    setIsMenuOpen(false);
                  }}
                >
                  <GraduationCap size={17} />
                  <span>{t('reader.studentMode')}</span>
                </button>

                <button
                  type="button"
                  className={`mobile-menu-item ${focusMode ? 'active' : ''}`}
                  onClick={() => {
                    onToggleFocusMode();
                    setIsMenuOpen(false);
                  }}
                >
                  <Eye size={17} />
                  <span>{focusMode ? t('reader.exitFocusMode') : t('reader.focusMode')}</span>
                </button>

                <button
                  type="button"
                  className="mobile-menu-item"
                  onClick={() => {
                    onToggleFullscreen();
                    setIsMenuOpen(false);
                  }}
                >
                  {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
                  <span>{isFullscreen ? t('reader.exitFullscreen') : t('reader.fullscreen')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
