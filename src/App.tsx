import { useState } from 'react';
import { LibraryPage } from '@/components/Library/LibraryPage';
import { ReaderPage } from '@/components/Reader/ReaderPage';
import { HistoryPage } from '@/components/History/HistoryPage';
import { SettingsPage } from '@/components/Settings/SettingsPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useTheme } from '@/hooks/useTheme';
import { storage } from '@/services/storage';
import type { Book, Page } from '@/types';

export function App() {
  useTheme(); // Initialize theme
  const [currentPage, setCurrentPage] = useState<Page>('library');
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  const handleOpenBook = (book: Book) => {
    setCurrentBook(book);
    setCurrentPage('reader');
  };

  const handleOpenBookById = async (bookId: string) => {
    const lib = await storage.getLibrary();
    const found = lib.books.find((b) => b.id === bookId);
    if (found) {
      handleOpenBook(found);
    }
  };

  const handleBackToLibrary = () => {
    setCurrentBook(null);
    setCurrentPage('library');
  };

  return (
    <div className="app-root" style={{ width: '100%', height: '100%' }}>
      {currentPage === 'library' && (
        <LibraryPage onOpenBook={handleOpenBook} onNavigate={setCurrentPage} />
      )}

      {currentPage === 'reader' && currentBook && (
        <ErrorBoundary onReset={handleBackToLibrary}>
          <ReaderPage book={currentBook} onBack={handleBackToLibrary} />
        </ErrorBoundary>
      )}

      {currentPage === 'history' && (
        <HistoryPage onBack={handleBackToLibrary} onOpenBookById={handleOpenBookById} />
      )}

      {currentPage === 'settings' && <SettingsPage onBack={handleBackToLibrary} />}
    </div>
  );
}
export default App;
