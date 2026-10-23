import { useEffect } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';

export function useLibrary() {
  const library = useLibraryStore((s) => s.library);
  const progress = useLibraryStore((s) => s.progress);
  const loading = useLibraryStore((s) => s.loading);
  const loadLibrary = useLibraryStore((s) => s.loadLibrary);
  const addFiles = useLibraryStore((s) => s.addFiles);
  const addFolder = useLibraryStore((s) => s.addFolder);
  const refreshWatchFolder = useLibraryStore((s) => s.refreshWatchFolder);
  const removeBook = useLibraryStore((s) => s.removeBook);
  const relocateBook = useLibraryStore((s) => s.relocateBook);
  const getFilteredBooks = useLibraryStore((s) => s.getFilteredBooks);
  const getLastReadBook = useLibraryStore((s) => s.getLastReadBook);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  return {
    library,
    progress,
    loading,
    reload: loadLibrary,
    addFiles,
    addFolder,
    refreshWatchFolder,
    removeBook,
    relocateBook,
    getFilteredBooks,
    getLastReadBook,
  };
}
