import { useEffect } from 'react';
import { LibraryPage } from '@/components/Library/LibraryPage';
import { ReaderPage } from '@/components/Reader/ReaderPage';
import { HistoryPage } from '@/components/History/HistoryPage';
import { SettingsPage } from '@/components/Settings/SettingsPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppStore } from '@/stores/useAppStore';
import { useThemeStore } from '@/stores/useThemeStore';

export function App() {
  const initializeTheme = useThemeStore((s) => s.initializeTheme);
  const currentPage = useAppStore((s) => s.currentPage);
  const currentBook = useAppStore((s) => s.currentBook);
  const backToLibrary = useAppStore((s) => s.backToLibrary);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return (
    <div className="app-root" style={{ width: '100%', height: '100%' }}>
      {currentPage === 'library' && <LibraryPage />}

      {currentPage === 'reader' && currentBook && (
        <ErrorBoundary onReset={backToLibrary}>
          <ReaderPage book={currentBook} onBack={backToLibrary} />
        </ErrorBoundary>
      )}

      {currentPage === 'history' && <HistoryPage />}

      {currentPage === 'settings' && <SettingsPage />}
    </div>
  );
}

export default App;
