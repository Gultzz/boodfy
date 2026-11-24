import { useEffect } from 'react';
import { LibraryPage } from '@/components/Library/LibraryPage';
import { ReaderPage } from '@/components/Reader/ReaderPage';
import { HistoryPage } from '@/components/History/HistoryPage';
import { SettingsPage } from '@/components/Settings/SettingsPage';
import { StudyPage } from '@/components/Study/StudyPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppStore } from '@/stores/useAppStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useI18nStore } from '@/stores/useI18nStore';
import { useReaderSettingsStore } from '@/stores/useReaderSettingsStore';
import { useAnnotationsStore } from '@/stores/useAnnotationsStore';

export function App() {
  const initializeTheme = useThemeStore((s) => s.initializeTheme);
  const initializeLanguage = useI18nStore((s) => s.initializeLanguage);
  const initializeReaderSettings = useReaderSettingsStore((s) => s.initialize);
  const loadAnnotations = useAnnotationsStore((s) => s.load);

  const currentPage = useAppStore((s) => s.currentPage);
  const currentBook = useAppStore((s) => s.currentBook);
  const readerEntry = useAppStore((s) => s.readerEntry);
  const openBookById = useAppStore((s) => s.openBookById);
  const backToLibrary = useAppStore((s) => s.backToLibrary);

  useEffect(() => {
    void initializeTheme();
    void initializeLanguage();
    void initializeReaderSettings();
    void loadAnnotations();
  }, [initializeTheme, initializeLanguage, initializeReaderSettings, loadAnnotations]);

  useEffect(() => {
    window.electronAPI
      .consumeLaunchBook()
      .then((bookId) => {
        if (bookId) {
          void openBookById(bookId);
        }
      })
      .catch(() => {
        // ignore
      });

    const unsubscribe = window.electronAPI.onOpenBookFromShortcut((bookId) => {
      void openBookById(bookId);
    });

    return () => {
      unsubscribe();
    };
  }, [openBookById]);

  return (
    <div className="app-root" style={{ width: '100%', height: '100%' }}>
      {currentPage === 'library' && <LibraryPage />}

      {currentPage === 'reader' && currentBook && (
        <ErrorBoundary onReset={backToLibrary}>
          <ReaderPage
            key={currentBook.id}
            book={currentBook}
            onBack={backToLibrary}
            startPage={readerEntry.page}
            initialStudyChapterId={readerEntry.chapterId}
            initialPanel={readerEntry.initialPanel}
          />
        </ErrorBoundary>
      )}

      {currentPage === 'history' && <HistoryPage />}

      {currentPage === 'study' && <StudyPage />}

      {currentPage === 'settings' && <SettingsPage />}
    </div>
  );
}

export default App;
