import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface PageText {
  pageNumber: number;
  text: string;
}

interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
}

/**
 * Extrai o texto de um intervalo de páginas do PDF, limpando hifenizações de fim de linha
 * e espaços duplicados.
 */
export async function extractPagesText(
  pdf: PDFDocumentProxy,
  startPage: number,
  endPage: number,
): Promise<PageText[]> {
  const from = Math.max(1, Math.min(startPage, pdf.numPages));
  const to = Math.max(from, Math.min(endPage, pdf.numPages));
  const pages: PageText[] = [];

  for (let pageNumber = from; pageNumber <= to; pageNumber++) {
    try {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const rawParts: string[] = [];

      for (const item of content.items as TextItemLike[]) {
        if (typeof item.str !== 'string') continue;
        rawParts.push(item.str);
        rawParts.push(item.hasEOL ? '\n' : ' ');
      }

      const cleaned = rawParts
        .join('')
        .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, '$1$2')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      pages.push({ pageNumber, text: cleaned });
    } catch (err) {
      console.warn(`Erro ao extrair texto da página ${pageNumber}:`, err);
      pages.push({ pageNumber, text: '' });
    }
  }

  return pages;
}

