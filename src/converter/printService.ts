import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import type { ConversionResult } from './types';
import { MAX_INPUT_BYTES, replaceExtension, uniqueName } from './validation';
import { converterDir, deleteQuietly, escapeHtml, fileSize, listOutputNames } from './fileIO';

/**
 * PDF creation via the OS print pipeline (expo-print, fully offline).
 * Images and text are rendered to HTML and printed to a PDF file, which is
 * then moved into the converter folder and verified before success.
 */

async function finishPrintedPdf(tmpUri: string, outputName: string): Promise<ConversionResult> {
  const existing = await listOutputNames();
  const finalName = uniqueName(outputName, existing);
  const finalUri = `${converterDir()}/${finalName}`;
  await FileSystem.moveAsync({ from: tmpUri, to: finalUri });
  const size = await fileSize(finalUri);
  if (size <= 0) {
    await deleteQuietly(finalUri);
    return { ok: false, error: 'The PDF could not be verified.' };
  }
  return { ok: true, outputUri: finalUri, outputName: finalName, mimeType: 'application/pdf', size };
}

function imgTag(fileUri: string): string {
  // expo-print renders local files referenced by URI.
  const safe = fileUri.replace(/"/g, '%22');
  return `<img src="${safe}" style="width:100%;height:auto;page-break-inside:avoid;display:block;margin:0 auto;" />`;
}

export async function imagesToPdf(files: Array<{ uri: string; name: string }>): Promise<ConversionResult> {
  try {
    if (files.length === 0) return { ok: false, error: 'Pick at least one image.' };
    for (const f of files) {
      if ((await fileSize(f.uri)) > MAX_INPUT_BYTES) return { ok: false, error: `"${f.name}" is too large to process on this device.` };
    }
    const html = `<html><body style="margin:0;padding:0;">${files.map((f) => imgTag(f.uri)).join('<div style="page-break-after:always;"></div>')}</body></html>`;
    const printed = await Print.printToFileAsync({ html });
    if (!printed.uri) return { ok: false, error: 'The system printer produced no file.' };
    const first = files[0]?.name ?? 'images';
    const stem = first.replace(/\.(png|jpe?g|webp)$/i, '');
    return finishPrintedPdf(printed.uri, `${stem || 'images'}-images.pdf`);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Creating the PDF failed.' };
  }
}

export async function textToPdf(uri: string, sourceName: string): Promise<ConversionResult> {
  try {
    if ((await fileSize(uri)) > MAX_INPUT_BYTES) return { ok: false, error: 'The file is too large to process on this device.' };
    const text = await FileSystem.readAsStringAsync(uri);
    const paragraphs = escapeHtml(text)
      .split(/\r?\n/)
      .map((line) => (line.trim() === '' ? '<div style="height:1em;"></div>' : `<p style="margin:0 0 0.6em 0;">${line}</p>`))
      .join('');
    const html = `<html><body style="font-family:sans-serif;font-size:12pt;line-height:1.5;color:#111;">${paragraphs || '<p>Empty file.</p>'}</body></html>`;
    const printed = await Print.printToFileAsync({ html });
    if (!printed.uri) return { ok: false, error: 'The system printer produced no file.' };
    return finishPrintedPdf(printed.uri, replaceExtension(sourceName, 'pdf'));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Creating the PDF failed.' };
  }
}
