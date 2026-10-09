import * as FileSystem from 'expo-file-system/legacy';
import type { PDFDocument } from 'pdf-lib';
import type { ConversionResult } from './types';
import { MAX_INPUT_BYTES, outputIsValid, parsePageRanges, replaceExtension, uniqueName } from './validation';
import { converterDir, fileSize, listOutputNames, readBase64, writeBase64 } from './fileIO';

/**
 * pdf-lib is loaded lazily (not at module scope) so a PDF-engine problem
 * can never break app startup or unrelated screens: every operation below
 * converts a load failure into an honest error result instead.
 */
function loadPdfLib(): typeof import('pdf-lib') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('pdf-lib') as typeof import('pdf-lib');
  } catch {
    return null;
  }
}

const PDF_ENGINE_UNAVAILABLE = 'The PDF engine is unavailable in this build. Reinstall the app from a fresh development build and try again.';

/**
 * Real PDF operations via pdf-lib (pure JS, runs on-device in the dev
 * build). Every function validates inputs, refuses oversized or corrupt
 * files with clear messages, and verifies the output file exists and is
 * non-empty before reporting success.
 */

async function loadPdf(uri: string, label: string): Promise<PDFDocument> {
  const lib = loadPdfLib();
  if (!lib) throw new Error(PDF_ENGINE_UNAVAILABLE);
  const size = await fileSize(uri);
  if (size <= 0) throw new Error(`${label} is empty or unreadable.`);
  if (size > MAX_INPUT_BYTES) throw new Error(`${label} is too large to process on this device.`);
  const bytes = await readBase64(uri);
  try {
    return await lib.PDFDocument.load(BufferFromBase64(bytes), { ignoreEncryption: false });
  } catch {
    throw new Error(`${label} is corrupted, encrypted, or not a valid PDF.`);
  }
}

// pdf-lib expects Uint8Array; decode base64 without loading helpers.
function BufferFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function saveChecked(doc: PDFDocument, name: string): Promise<ConversionResult> {
  const existing = await listOutputNames();
  const outputName = uniqueName(name, existing);
  const outputUri = `${converterDir()}/${outputName}`;
  const bytes = await doc.save({ useObjectStreams: true });
  await writeBase64(outputUri, toBase64(bytes));
  // Success is reported only when the output exists and is non-empty.
  const valid = await outputIsValid(
    async (uri: string) => {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || info.isDirectory) return { exists: false, size: 0 };
        return { exists: true, size: info.size ?? 0 };
      } catch {
        return { exists: false, size: 0 };
      }
    },
    outputUri,
  );
  if (!valid) {
    return { ok: false, error: 'The output file could not be verified. Nothing was saved.' };
  }
  return { ok: true, outputUri, outputName, mimeType: 'application/pdf', size: await fileSize(outputUri) };
}

export async function mergePdfs(uris: string[], firstName: string): Promise<ConversionResult & { pageCount?: number }> {
  try {
    const lib = loadPdfLib();
    if (!lib) return { ok: false, error: PDF_ENGINE_UNAVAILABLE };
    if (uris.length < 2) return { ok: false, error: 'Pick at least two PDFs to merge.' };
    const out = await lib.PDFDocument.create();
    let total = 0;
    for (const uri of uris) {
      const src = await loadPdf(uri, 'One of the selected files');
      const pages = await out.copyPages(src, src.getPageIndices());
      for (const page of pages) out.addPage(page);
      total += pages.length;
    }
    const base = firstName.toLowerCase().endsWith('.pdf') ? firstName.slice(0, -4) : firstName;
    const saved = await saveChecked(out, `${base}-merged.pdf`);
    return { ...saved, pageCount: total };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Merging failed.' };
  }
}

export async function splitPdf(uri: string, ranges: string, sourceName: string): Promise<ConversionResult & { pageCount?: number }> {
  try {
    const lib = loadPdfLib();
    if (!lib) return { ok: false, error: PDF_ENGINE_UNAVAILABLE };
    const src = await loadPdf(uri, 'The selected file');
    const count = src.getPageCount();
    const parsed = parsePageRanges(ranges, count);
    if ('error' in parsed) return { ok: false, error: parsed.error };
    const out = await lib.PDFDocument.create();
    const pages = await out.copyPages(src, parsed.pages.map((p) => p - 1));
    for (const page of pages) out.addPage(page);
    const saved = await saveChecked(out, replaceExtension(sourceName, 'pdf').replace(/\.pdf$/i, '-split.pdf'));
    return { ...saved, pageCount: parsed.pages.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Splitting failed.' };
  }
}

export async function pdfPageCount(uri: string): Promise<number | null> {
  try {
    if (!loadPdfLib()) return null;
    const src = await loadPdf(uri, 'The selected file');
    return src.getPageCount();
  } catch {
    return null;
  }
}
