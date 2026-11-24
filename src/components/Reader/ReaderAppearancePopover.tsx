import { useEffect, useRef } from 'react';
import {
  AlignLeft,
  Coffee,
  FileText,
  Minus,
  Moon,
  Plus,
  RotateCw,
  Sun,
} from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';
import { useReaderSettingsStore } from '@/stores/useReaderSettingsStore';
import { useTranslation } from '@/stores/useI18nStore';
import type { FitMode, LineSpacing, ReaderViewMode, ReadingTheme } from '@/types';
import './ReaderAppearancePopover.css';

interface ReaderAppearancePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: ReaderViewMode;
  onChangeViewMode: (mode: ReaderViewMode) => void;
  fitMode: FitMode;
  zoom: number;
  onSetFitMode: (mode: FitMode) => void;
  onSetZoom: (updater: (z: number) => number) => void;
  onResetZoom: () => void;
}

export function ReaderAppearancePopover({
  isOpen,
  onClose,
  viewMode,
  onChangeViewMode,
  fitMode,
  zoom,
  onSetFitMode,
  onSetZoom,
  onResetZoom,
}: ReaderAppearancePopoverProps) {
  const { t } = useTranslation();
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const readerSettings = useReaderSettingsStore((s) => s.settings);
  const setFontSize = useReaderSettingsStore((s) => s.setFontSize);
  const setLineSpacing = useReaderSettingsStore((s) => s.setLineSpacing);
  const setReadingTheme = useReaderSettingsStore((s) => s.setReadingTheme);

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const spacingOptions: { key: LineSpacing; label: string }[] = [
    { key: 'compact', label: t('reader.spacing.compact') },
    { key: 'comfortable', label: t('reader.spacing.comfortable') },
    { key: 'wide', label: t('reader.spacing.wide') },
  ];

  const readingThemeOptions: { key: ReadingTheme; label: string; icon: React.ReactNode }[] = [
    { key: 'original', label: t('reader.readingTheme.original'), icon: <Sun size={13} /> },
    { key: 'sepia', label: t('reader.readingTheme.sepia'), icon: <Coffee size={13} /> },
    { key: 'dark', label: t('reader.readingTheme.dark'), icon: <Moon size={13} /> },
  ];

  return (
    <div
      ref={popoverRef}
      className="appearance-popover"
      role="dialog"
      aria-label={t('reader.appearance')}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Modo de Leitura */}
      <div className="appearance-section">
        <span className="appearance-label">{t('reader.readingMode')}</span>
        <div className="appearance-segmented">
          <button
            type="button"
            className={`appearance-seg-btn ${viewMode === 'pdf' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('pdf')}
          >
            <FileText size={14} />
            <span>{t('reader.modePdf')}</span>
          </button>
          <button
            type="button"
            className={`appearance-seg-btn ${viewMode === 'fluid' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('fluid')}
          >
            <AlignLeft size={14} />
            <span>{t('reader.modeFluid')}</span>
          </button>
        </div>
      </div>

      {/* Tema da Leitura (Página PDF / Texto Fluido — independente do app) */}
      <div className="appearance-section">
        <span className="appearance-label">{t('reader.readingTheme')}</span>
        <div className="appearance-themes">
          {readingThemeOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`appearance-theme-btn ${readerSettings.readingTheme === opt.key ? 'active' : ''}`}
              onClick={() => void setReadingTheme(opt.key)}
              title={opt.label}
            >
              {opt.icon}
              <span className="truncate">{opt.key === 'original' ? 'Original' : opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Controles específicos do modo ativo */}
      {viewMode === 'pdf' ? (
        <div className="appearance-section">
          <span className="appearance-label">Zoom ({Math.round(zoom * 100)}%)</span>
          <div className="appearance-stepper">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onSetFitMode('manual');
                onSetZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))));
              }}
              disabled={zoom <= 0.5}
            >
              <Minus size={14} />
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onResetZoom}>
              <RotateCw size={13} />
              <span>100%</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onSetFitMode('manual');
                onSetZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))));
              }}
              disabled={zoom >= 3.0}
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="appearance-segmented" style={{ marginTop: 6 }}>
            <button
              type="button"
              className={`appearance-seg-btn ${fitMode === 'height' ? 'active' : ''}`}
              onClick={() => {
                onSetFitMode('height');
                onSetZoom(() => 1);
              }}
            >
              {t('reader.fitHeight')}
            </button>
            <button
              type="button"
              className={`appearance-seg-btn ${fitMode === 'width' ? 'active' : ''}`}
              onClick={() => {
                onSetFitMode('width');
                onSetZoom(() => 1);
              }}
            >
              {t('reader.fitWidth')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="appearance-section">
            <span className="appearance-label">
              {t('reader.fontSize')} ({readerSettings.fontSize}px)
            </span>
            <div className="appearance-stepper">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void setFontSize(readerSettings.fontSize - 1)}
                disabled={readerSettings.fontSize <= 14}
              >
                A-
              </button>
              <span className="appearance-value">{readerSettings.fontSize}px</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void setFontSize(readerSettings.fontSize + 1)}
                disabled={readerSettings.fontSize >= 28}
              >
                A+
              </button>
            </div>
          </div>

          <div className="appearance-section">
            <span className="appearance-label">{t('reader.lineSpacing')}</span>
            <div className="appearance-themes">
              {spacingOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`appearance-theme-btn ${readerSettings.lineSpacing === opt.key ? 'active' : ''}`}
                  onClick={() => void setLineSpacing(opt.key)}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tema do Aplicativo (interface ao redor — independente da leitura) */}
      <div className="appearance-section appearance-divider-top">
        <span className="appearance-label">{t('reader.theme')}</span>
        <div className="appearance-themes">
          <button
            type="button"
            className={`appearance-theme-btn ${resolvedTheme === 'dark' ? 'active' : ''}`}
            onClick={() => void setTheme('dark')}
          >
            <Moon size={13} />
            <span className="truncate">{t('settings.theme.dark')}</span>
          </button>
          <button
            type="button"
            className={`appearance-theme-btn ${resolvedTheme === 'light' ? 'active' : ''}`}
            onClick={() => void setTheme('light')}
          >
            <Sun size={13} />
            <span className="truncate">{t('settings.theme.light')}</span>
          </button>
          <button
            type="button"
            className={`appearance-theme-btn ${resolvedTheme === 'sepia' ? 'active' : ''}`}
            onClick={() => void setTheme('sepia')}
          >
            <Coffee size={13} />
            <span className="truncate">{t('settings.theme.sepia')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
