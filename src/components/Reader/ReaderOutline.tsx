import { useEffect, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { X } from 'lucide-react';
import './ReaderOutline.css';

interface OutlineNode {
  title: string;
  bold?: boolean;
  italic?: boolean;
  dest: string | Array<unknown> | null;
  url?: string | null;
  items?: OutlineNode[] | null;
}

interface ReaderOutlineProps {
  pdf: PDFDocumentProxy | null;
  onSelectPage: (page: number) => void;
  onClose: () => void;
}

/**
 * Resolve o destino de um item do sumário em um número de página.
 * O destino pode ser nomeado (string) ou um array de destino explícito,
 * cujo primeiro elemento é a referência da página.
 */
async function resolvePage(
  pdf: PDFDocumentProxy,
  dest: string | Array<unknown> | null,
): Promise<number | null> {
  try {
    if (!dest) return null;
    let target: Array<unknown> | null = null;
    if (typeof dest === 'string') {
      target = await pdf.getDestination(dest);
    } else if (Array.isArray(dest)) {
      target = dest;
    }
    if (!target || target.length === 0) return null;
    const ref = target[0];
    if (!ref || typeof ref !== 'object') return null;
    const index = await pdf.getPageIndex(ref as { num: number; gen: number });
    return index + 1;
  } catch (err) {
    console.error('Erro ao resolver o destino do sumário:', err);
    return null;
  }
}

export function ReaderOutline({ pdf, onSelectPage, onClose }: ReaderOutlineProps) {
  const [nodes, setNodes] = useState<OutlineNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdf) {
      setNodes(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setNodes(null);
    setError(null);

    pdf
      .getOutline()
      .then((outline) => {
        if (!cancelled) setNodes((outline as OutlineNode[] | undefined) ?? []);
      })
      .catch((err) => {
        console.error('Erro ao ler o sumário do PDF:', err);
        if (!cancelled) setError('Não foi possível ler o sumário deste PDF.');
      });

    return () => {
      cancelled = true;
    };
  }, [pdf]);

  const handleSelect = useCallback(
    async (node: OutlineNode) => {
      if (!pdf) return;
      const page = await resolvePage(pdf, node.dest);
      if (page !== null) onSelectPage(page);
    },
    [pdf, onSelectPage],
  );

  const renderNodes = (items: OutlineNode[], depth: number, path: string) =>
    items.map((node, index) => {
      const key = `${path}-${index}`;
      const children = node.items ?? [];
      const title = node.title?.trim() || 'Sem título';

      return (
        <div key={key} className="outline-group">
          <button
            className="outline-item"
            style={{ paddingLeft: `${10 + depth * 14}px` }}
            onClick={() => handleSelect(node)}
            title={title}
          >
            <span
              className="outline-item-title"
              style={{
                fontWeight: node.bold ? 600 : undefined,
                fontStyle: node.italic ? 'italic' : undefined,
              }}
            >
              {title}
            </span>
          </button>
          {children.length > 0 && renderNodes(children, depth + 1, key)}
        </div>
      );
    });

  return (
    <aside className="outline-sidebar">
      <div className="outline-header">
        <h4>Sumário</h4>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="Fechar sumário">
          <X size={16} />
        </button>
      </div>

      <div className="outline-list">
        {nodes === null && !error && (
          <div className="outline-loading">
            <div className="spinner" />
            <p>Lendo sumário...</p>
          </div>
        )}

        {error && <p className="outline-empty">{error}</p>}

        {nodes !== null && !error && nodes.length === 0 && (
          <p className="outline-empty">Este PDF não possui sumário.</p>
        )}

        {nodes !== null && nodes.length > 0 && renderNodes(nodes, 0, 'n')}
      </div>
    </aside>
  );
}
