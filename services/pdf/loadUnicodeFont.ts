import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';

export async function loadUnicodeFont(pdf: PDFDocument): Promise<PDFFont> {
  // Fallback to a built-in font if no bundled unicode TTF is available.
  return pdf.embedFont(StandardFonts.Helvetica);
}
