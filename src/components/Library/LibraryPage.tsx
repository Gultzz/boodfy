import { useState } from 'react';
import {
  Search,
  Plus,
  FolderOpen,
  Settings,
  History,
  Grid3x3,
  List,
  RefreshCw,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import { BookCard } from './BookCard';
import { BookListItem } from './BookListItem';
import { BookContextMenu } from './BookContextMenu';
import type { Book, ViewMode, FilterMode, SortMode, Page } from '@/types';
import './LibraryPage.css';

interface LibraryPageProps {
  onOpenBook: (book: Book) => void;
  onNavigate: (page: Page) => void;
}

export function LibraryPage({ onOpenBook, onNavigate }: LibraryPageProps) {
  const {
    library,
    loading,
    addFiles,
    addFolder,
    refreshWatchFolder,
    removeBook,
    relocateBook,
    getFilteredBooks,
    getLastReadBook,
  } = useLibrary();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('lastRead');
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState<{ book: Book; x: number; y: number } | null>(null);

  const filteredBooks = getFilteredBooks(filter, sort, search);
  const lastReadBook = getLastReadBook();

  const filters: { key: FilterMode; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'not-started', label: 'Não iniciados' },
    { key: 'reading', label: 'Em andamento' },
    { key: 'completed', label: 'Concluídos' },
    { key: 'recent', label: 'Recentes' },
  ];

  const sorts: { key: SortMode; label: string }[] = [
    { key: 'lastRead', label: 'Última leitura' },
    { key: 'title', label: 'Título' },
    { key: 'addedAt', label: 'Data de adição' },
  ];

  const handleContextMenu = (e: React.MouseEvent, book: Book) => {
    e.preventDefault();
    setContextMenu({ book, x: e.clientX, y: e.clientY });
  };

  const handleRemoveBook = async (bookId: string, deleteFile: boolean) => {
    await removeBook(bookId, deleteFile);
    setContextMenu(null);
  };

  const handleRelocateBook = async (bookId: string) => {
    await relocateBook(bookId);
    setContextMenu(null);
  };

  if (loading) {
    return (
      <div className="library-loading">
        <div className="spinner" />
        <p>Carregando biblioteca...</p>
      </div>
    );
  }

  return (
    <div className="library-page" onClick={() => setContextMenu(null)}>
      {/* Header */}
      <header className="library-header">
        <div className="library-header-left">
          <h1 className="library-title">
            <BookOpen size={24} />
            BooklyPDF
          </h1>
        </div>
        <div className="library-header-center">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="input search-input"
              placeholder="Pesquisar livros..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="library-header-right">
          <button className="btn btn-primary" onClick={addFiles} title="Adicionar PDFs">
            <Plus size={16} />
            Adicionar
          </button>
          <button className="btn btn-ghost btn-icon" onClick={addFolder} title="Adicionar pasta">
            <FolderOpen size={18} />
          </button>
          {library.watchFolder && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={refreshWatchFolder}
              title="Atualizar pasta monitorada"
            >
              <RefreshCw size={18} />
            </button>
          )}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onNavigate('history')}
            title="Histórico"
          >
            <History size={18} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onNavigate('settings')}
            title="Configurações"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Continue reading section */}
      {lastReadBook && (
        <section className="continue-section">
          <button className="continue-card" onClick={() => onOpenBook(lastReadBook)}>
            <div className="continue-info">
              <span className="continue-label">Continuar leitura</span>
              <span className="continue-title">{lastReadBook.title}</span>
              <span className="continue-page">
                Página {lastReadBook.currentPage} de {lastReadBook.totalPages}
              </span>
            </div>
            <ArrowRight size={20} className="continue-arrow" />
          </button>
        </section>
      )}

      {/* Toolbar */}
      <div className="library-toolbar">
        <div className="filter-tabs">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`filter-tab ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <select
            className="input sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
          >
            {sorts.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="view-toggle">
            <button
              className={`btn btn-icon btn-ghost ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Visualização em grade"
            >
              <Grid3x3 size={18} />
            </button>
            <button
              className={`btn btn-icon btn-ghost ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Visualização em lista"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Books */}
      {filteredBooks.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={64} className="empty-state-icon" />
          <h2 className="empty-state-title">
            {library.books.length === 0 ? 'Sua biblioteca está vazia' : 'Nenhum livro encontrado'}
          </h2>
          <p className="empty-state-text">
            {library.books.length === 0
              ? 'Adicione seus PDFs para começar a ler. Você pode selecionar arquivos individuais ou uma pasta inteira.'
              : 'Tente ajustar os filtros ou o termo de pesquisa.'}
          </p>
          {library.books.length === 0 && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary btn-lg" onClick={addFiles}>
                <Plus size={18} />
                Adicionar PDFs
              </button>
              <button className="btn btn-secondary btn-lg" onClick={addFolder}>
                <FolderOpen size={18} />
                Adicionar pasta
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`books-container ${viewMode === 'grid' ? 'books-grid' : 'books-list'}`}>
          {filteredBooks.map((book) =>
            viewMode === 'grid' ? (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => onOpenBook(book)}
                onContextMenu={(e) => handleContextMenu(e, book)}
              />
            ) : (
              <BookListItem
                key={book.id}
                book={book}
                onClick={() => onOpenBook(book)}
                onContextMenu={(e) => handleContextMenu(e, book)}
              />
            ),
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <BookContextMenu
          book={contextMenu.book}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRemove={handleRemoveBook}
          onRelocate={handleRelocateBook}
        />
      )}
    </div>
  );
}
