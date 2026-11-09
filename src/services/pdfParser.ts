import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker for pdfjs in Vite / browser environment
try {
  // Use Vite's URL resolution for the worker script
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
} catch {
  // Fallback if URL constructor fails in specific sub-environment
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface ParsedPdfResult {
  text: string;
  thumbnailBase64?: string;
  pageCount: number;
  fileName: string;
}

/**
 * Extracts all readable text and renders a lightweight first-page thumbnail from a PDF file.
 * This runs entirely on the client, keeping network payloads tiny (~150KB) and avoiding
 * HTTP 413 (Payload Too Large) gateway errors on large multi-megabyte architectural brochures.
 */
export async function parsePdfBrochure(file: File): Promise<ParsedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const maxPagesToRead = Math.min(pageCount, 8); // Read up to first 8 pages for property specs

    let fullText = '';
    let thumbnailBase64: string | undefined;

    for (let pageNum = 1; pageNum <= maxPagesToRead; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // Extract text content
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      
      fullText += `\n--- PAGE ${pageNum} ---\n${pageText}`;

      // Render thumbnail of Page 1 for visual layout & cover photo
      if (pageNum === 1 && typeof document !== 'undefined') {
        try {
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const targetWidth = 900;
          const scale = Math.min(1.5, targetWidth / unscaledViewport.width);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');

          if (ctx) {
            // Fill white background first in case of transparent PDF page
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Render page onto canvas
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (page.render as any)({
              canvasContext: ctx,
              viewport,
            }).promise;

            thumbnailBase64 = canvas.toDataURL('image/jpeg', 0.82);
          }
        } catch (canvasErr) {
          console.warn('Could not generate PDF page 1 thumbnail:', canvasErr);
        }
      }
    }

    return {
      text: fullText.trim(),
      thumbnailBase64,
      pageCount,
      fileName: file.name,
    };
  } catch (pdfErr) {
    console.warn('pdfjs parse warning, attempting fallback text extraction:', pdfErr);
    // Fallback simple string extraction from raw bytes if pdfjs fails
    const rawText = fallbackExtractTextFromBuffer(arrayBuffer);
    return {
      text: rawText,
      pageCount: 1,
      fileName: file.name,
    };
  }
}

/**
 * Fallback heuristic text extractor for simple unencrypted PDFs
 */
function fallbackExtractTextFromBuffer(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    let str = '';
    // Sample first 500KB of bytes for readable ASCII strings
    const limit = Math.min(bytes.length, 500 * 1024);
    for (let i = 0; i < limit; i++) {
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
        str += String.fromCharCode(b);
      } else if (str.length > 0 && str[str.length - 1] !== ' ') {
        str += ' ';
      }
    }
    // Extract strings that look like real words or property terms
    const words = str
      .split(/\s+/)
      .filter((w) => w.length > 2 && /^[A-Za-z0-9$,.%/:-]+$/.test(w))
      .slice(0, 800);
    return words.join(' ');
  } catch {
    return '';
  }
}
