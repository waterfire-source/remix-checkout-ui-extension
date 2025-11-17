import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Alternative to S3: Store PDFs on the server's file system
 * This stores PDFs in a 'public/pdfs' directory and serves them via a route
 *
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {string} fileName - The file name for the PDF
 * @returns {Promise<string>} The URL to access the PDF
 */
export async function storePdfLocally(pdfBuffer, fileName) {
  const pdfsDir = join(process.cwd(), "public", "pdfs");

  if (!existsSync(pdfsDir)) {
    await mkdir(pdfsDir, { recursive: true });
  }

  const filePath = join(pdfsDir, fileName);
  await writeFile(filePath, pdfBuffer);

  return `/pdfs/${fileName}`;
}

/**
 * Alternative: Store PDFs in database as base64 (NOT RECOMMENDED for large files)
 * Only use this for very small PDFs or if you have no other option
 *
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {string} fileName - The file name for the PDF
 * @returns {Promise<string>} The base64 encoded PDF data URL
 */
export async function storePdfAsBase64(pdfBuffer, fileName) {
  const base64 = pdfBuffer.toString("base64");

  return `data:application/pdf;base64,${base64}`;
}
