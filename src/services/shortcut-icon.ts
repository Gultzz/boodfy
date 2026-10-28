import { Book } from '../types';
import { generatePdfCover } from './cover-service';

// Logo oficial do Boodfy em formato Base64 PNG (128x128) para garantir carregamento instantâneo e offline
const BOODFY_LOGO_BASE64 =
  'data:image/png;base64,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';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Obtém a imagem da capa do livro em formato DataURL.
 * Tenta em sequência:
 * 1. book.coverDataUrl se já for data:
 * 2. IPC readCoverAsDataUrl
 * 3. Gerar nova capa via PDF (generatePdfCover)
 */
async function resolveBookCoverUrl(book: Book): Promise<string | null> {
  if (book.coverDataUrl && book.coverDataUrl.startsWith('data:image/')) {
    return book.coverDataUrl;
  }

  try {
    const fromDisk = await window.electronAPI.readCoverAsDataUrl(book.id);
    if (fromDisk && fromDisk.startsWith('data:image/')) {
      return fromDisk;
    }
  } catch {
    // continua para a próxima tentativa
  }

  if (book.coverDataUrl && book.coverDataUrl.startsWith('bookly-cover://')) {
    return book.coverDataUrl;
  }

  try {
    const generated = await generatePdfCover(book.filePath);
    if (generated?.coverDataUrl) {
      return generated.coverDataUrl;
    }
  } catch {
    // fallback final
  }

  return null;
}

/**
 * Gera um ícone 256x256 PNG para o atalho da Área de Trabalho:
 * - Capa do livro com proporção realista, cantos arredondados, sombra e vinco 3D na lombada
 * - Logo do Boodfy em um selo circular estilizado no canto inferior direito
 */
export async function generateBookShortcutIcon(book: Book): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dimensões e posicionamento do livro no canvas 256x256
    const bookX = 22;
    const bookY = 14;
    const bookW = 156;
    const bookH = 226;
    const radius = 6;

    // Tenta carregar a capa do livro
    const coverUrl = await resolveBookCoverUrl(book);
    let coverImg: HTMLImageElement | null = null;
    if (coverUrl) {
      try {
        coverImg = await loadImage(coverUrl);
      } catch {
        coverImg = null;
      }
    }

    // 1. Sombra suave realista do livro
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.50)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;
    ctx.beginPath();
    ctx.roundRect(bookX, bookY, bookW, bookH, [2, radius, radius, 2]);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.restore();

    // 2. Desenho do miolo/capa do livro com recorte de cantos arredondados
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bookX, bookY, bookW, bookH, [2, radius, radius, 2]);
    ctx.clip();

    if (coverImg && coverImg.naturalWidth > 0 && coverImg.naturalHeight > 0) {
      // Ajuste proporcional tipo "cover" (preenche sem distorcer)
      const imgAspect = coverImg.naturalWidth / coverImg.naturalHeight;
      const boxAspect = bookW / bookH;
      let drawW = bookW;
      let drawH = bookH;
      let drawX = bookX;
      let drawY = bookY;

      if (imgAspect > boxAspect) {
        drawW = bookH * imgAspect;
        drawX = bookX - (drawW - bookW) / 2;
      } else {
        drawH = bookW / imgAspect;
        drawY = bookY - (drawH - bookH) / 2;
      }

      ctx.drawImage(coverImg, drawX, drawY, drawW, drawH);
    } else {
      // Capa elegante alternativa caso o PDF não possua imagem
      const fallbackGrad = ctx.createLinearGradient(bookX, bookY, bookX + bookW, bookY + bookH);
      fallbackGrad.addColorStop(0, '#312e81');
      fallbackGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = fallbackGrad;
      ctx.fillRect(bookX, bookY, bookW, bookH);

      // Marca-página central sutil
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(bookX + (bookW - 24) / 2, bookY, 24, 38);
      ctx.beginPath();
      ctx.moveTo(bookX + (bookW - 24) / 2, bookY + 38);
      ctx.lineTo(bookX + bookW / 2, bookY + 28);
      ctx.lineTo(bookX + (bookW + 24) / 2, bookY + 38);
      ctx.closePath();
      ctx.fillStyle = '#312e81';
      ctx.fill();

      // Iniciais do título do livro
      const words = book.title.trim().split(/\s+/).filter(Boolean);
      const initials = words
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || '')
        .join('');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials || 'PDF', bookX + bookW / 2, bookY + bookH / 2);
    }

    // 3. Efeito 3D na lombada (lado esquerdo)
    const spineGrad = ctx.createLinearGradient(bookX, bookY, bookX + 16, bookY);
    spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    spineGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.25)');
    spineGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
    spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(bookX, bookY, 16, bookH);

    // 4. Efeito de páginas na borda direita
    const pageGrad = ctx.createLinearGradient(bookX + bookW - 5, bookY, bookX + bookW, bookY);
    pageGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    pageGrad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = pageGrad;
    ctx.fillRect(bookX + bookW - 5, bookY, 5, bookH);

    // 5. Borda sutil de acabamento
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bookX, bookY, bookW, bookH, [2, radius, radius, 2]);
    ctx.stroke();
    ctx.restore();

    // 6. Selo circular com a logo do Boodfy no canto inferior direito
    const badgeX = 196;
    const badgeY = 196;
    const badgeRadius = 40;

    // Sombra do selo
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.60)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.restore();

    // Fundo escuro do selo
    ctx.save();
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#090d16';
    ctx.fill();

    // Anel externo com degradê índigo Boodfy
    const ringGrad = ctx.createLinearGradient(
      badgeX - badgeRadius,
      badgeY - badgeRadius,
      badgeX + badgeRadius,
      badgeY + badgeRadius
    );
    ringGrad.addColorStop(0, '#818cf8');
    ringGrad.addColorStop(1, '#4f46e5');
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Anel interno sutil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius - 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 7. Desenhar a logo do Boodfy centralizada dentro do selo
    try {
      const badgeImg = await loadImage(BOODFY_LOGO_BASE64);
      const logoSize = 52;
      ctx.drawImage(
        badgeImg,
        badgeX - logoSize / 2,
        badgeY - logoSize / 2,
        logoSize,
        logoSize
      );
    } catch {
      // Se por algum motivo a logo não carregar, desenha a letra B estilizada
      ctx.fillStyle = '#6366f1';
      ctx.font = 'bold 32px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('B', badgeX, badgeY);
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Erro ao gerar ícone composto do livro para atalho:', err);
    return null;
  }
}

