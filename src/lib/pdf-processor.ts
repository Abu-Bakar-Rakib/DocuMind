import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface TextChunk {
  content: string;
  page: number;
  chunkIndex: number;
}

// Extract text from PDF page by page
export async function extractPdfText(file: File): Promise<ExtractedPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: ExtractedPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');

    pages.push({
      pageNumber: i,
      text: text.trim(),
    });
  }

  return pages;
}

// Split text into overlapping chunks
export function createChunks(pages: ExtractedPage[], chunkSize = 800, overlap = 120): TextChunk[] {
  const chunks: TextChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    if (!page.text) continue;

    let start = 0;
    while (start < page.text.length) {
      const end = Math.min(start + chunkSize, page.text.length);
      const content = page.text.slice(start, end).trim();

      if (content.length > 0) {
        chunks.push({
          content,
          page: page.pageNumber,
          chunkIndex: globalChunkIndex++,
        });
      }

      start += chunkSize - overlap;
      if (start < 0) start = 0;
    }
  }

  return chunks;
}
