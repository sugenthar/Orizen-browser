import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import type { ConversionResult } from './types';
import { MAX_INPUT_BYTES, replaceExtension, uniqueName } from './validation';
import { converterDir, deleteQuietly, fileSize, listOutputNames } from './fileIO';

/**
 * Real image operations via the native image manipulator (runs on-device).
 * Supported formats: PNG, JPEG, WebP (verified against the installed SDK).
 */

export type ImageFormat = 'png' | 'jpeg' | 'webp';

function toSaveFormat(format: ImageFormat): ImageManipulator.SaveFormat {
  switch (format) {
    case 'png':
      return ImageManipulator.SaveFormat.PNG;
    case 'webp':
      return ImageManipulator.SaveFormat.WEBP;
    default:
      return ImageManipulator.SaveFormat.JPEG;
  }
}

function mimeFor(format: ImageFormat): string {
  return format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
}

async function verifiedCopy(tmpUri: string, outputName: string): Promise<ConversionResult> {
  const existing = await listOutputNames();
  const finalName = uniqueName(outputName, existing);
  const finalUri = `${converterDir()}/${finalName}`;
  // Move into the converter folder and verify before reporting success.
  await FileSystem.moveAsync({ from: tmpUri, to: finalUri });
  const size = await fileSize(finalUri);
  if (size <= 0) {
    await deleteQuietly(finalUri);
    return { ok: false, error: 'The converted image could not be verified.' };
  }
  return { ok: true, outputUri: finalUri, outputName: finalName, mimeType: null, size };
}

export async function convertImage(uri: string, sourceName: string, format: ImageFormat): Promise<ConversionResult> {
  try {
    if ((await fileSize(uri)) > MAX_INPUT_BYTES) return { ok: false, error: 'The image is too large to process on this device.' };
    const out = await ImageManipulator.manipulateAsync(uri, [], { compress: 1, format: toSaveFormat(format) });
    const r = await verifiedCopy(out.uri, replaceExtension(sourceName, format === 'jpeg' ? 'jpg' : format));
    if (r.ok) r.mimeType = mimeFor(format);
    return r;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Image conversion failed.' };
  }
}

export async function resizeImage(uri: string, sourceName: string, maxWidth: number): Promise<ConversionResult> {
  try {
    if (!Number.isFinite(maxWidth) || maxWidth < 16 || maxWidth > 8192) {
      return { ok: false, error: 'Choose a width between 16 and 8192 pixels.' };
    }
    if ((await fileSize(uri)) > MAX_INPUT_BYTES) return { ok: false, error: 'The image is too large to process on this device.' };
    const lower = sourceName.toLowerCase();
    const format = lower.endsWith('.png') ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG;
    const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: Math.round(maxWidth) } }], {
      compress: 1,
      format,
    });
    const ext = format === ImageManipulator.SaveFormat.PNG ? 'png' : 'jpg';
    const r = await verifiedCopy(out.uri, replaceExtension(sourceName, ext).replace(/\.(png|jpg)$/i, `-resized.$1`));
    if (r.ok) r.mimeType = mimeFor(ext as ImageFormat);
    return r;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Resizing failed.' };
  }
}

export async function compressImage(uri: string, sourceName: string, quality: number): Promise<ConversionResult> {
  try {
    if (!Number.isFinite(quality) || quality < 0.1 || quality > 1) {
      return { ok: false, error: 'Choose a quality between 10 and 100.' };
    }
    if ((await fileSize(uri)) > MAX_INPUT_BYTES) return { ok: false, error: 'The image is too large to process on this device.' };
    // Quality applies to JPEG encoding; PNG input is re-encoded as JPEG.
    const out = await ImageManipulator.manipulateAsync(uri, [], {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const r = await verifiedCopy(out.uri, replaceExtension(sourceName, 'jpg').replace(/\.jpg$/i, '-compressed.jpg'));
    if (r.ok) r.mimeType = 'image/jpeg';
    return r;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Compression failed.' };
  }
}
