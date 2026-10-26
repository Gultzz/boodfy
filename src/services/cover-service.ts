import { pdfjs } from 'react-pdf';

const COVER_WIDTH = 280;
const WEBP_QUALITY = 0.8;

export interface PdfCoverResult {
  coverDataUrl: string;
  totalPages: number;
}

export async function generatePdfCover(filePath: string): Promise<PdfCoverResult | null> {
  let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']> | null = null;

  try {
    const exists = await window.electronAPI.fileExists(filePath);
    if (!exists) return null;

    const buffer = await window.electronAPI.readPdf(filePath);
    const data = new Uint8Array(buffer.slice(0));
    pdf = await pdfjs.getDocument({ data }).promise;

    const page = await pdf.getPage(1);
    const unscaled = page.getViewport({ scale: 1 });
    const scale = COVER_WIDTH / unscaled.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return null;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    // Use WebP format with PNG fallback for optimal compression and speed
    let coverDataUrl = canvas.toDataURL('image/webp', WEBP_QUALITY);
    if (!coverDataUrl.startsWith('data:image/webp')) {
      coverDataUrl = canvas.toDataURL('image/png');
    }

    return {
      coverDataUrl,
      totalPages: pdf.numPages,
    };
  } catch (err) {
    console.error('Erro ao gerar capa do PDF:', err);
    return null;
  } finally {
    try {
      await pdf?.destroy();
    } catch {
      // ignore
    }
  }
}
