import { useEffect } from 'react';
import { LibraryPage } from '@/components/Library/LibraryPage';
import { ReaderPage } from '@/components/Reader/ReaderPage';
import { HistoryPage } from '@/components/History/HistoryPage';
import { SettingsPage } from '@/components/Settings/SettingsPage';
import { StudyPage } from '@/components/Study/StudyPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppStore } from '@/stores/useAppStore';
import { useThemeStore } from '@/stores/useThemeStore';

export function App() {
  const initializeTheme = useThemeStore((s) => s.initializeTheme);
  const currentPage = useAppStore((s) => s.currentPage);
  const currentBook = useAppStore((s) => s.currentBook);
  const readerEntry = useAppStore((s) => s.readerEntry);
  const openBookById = useAppStore((s) => s.openBookById);
  const backToLibrary = useAppStore((s) => s.backToLibrary);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

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
