import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * File picking and app-managed output storage for the converter.
 * Outputs live in Orizen's private converter folder; the user opens or
 * shares them explicitly. Originals are never modified or deleted.
 */

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export const CONVERTER_DIR_NAME = 'orizen-converter';
export const CONVERTER_TMP_NAME = 'orizen-converter-tmp';

export function converterDir(): string {
  return `${FileSystem.documentDirectory ?? ''}${CONVERTER_DIR_NAME}`;
}

export function converterTmpDir(): string {
  return `${converterDir()}/${CONVERTER_TMP_NAME}`;
}

export async function ensureConverterDirs(): Promise<void> {
  for (const dir of [converterDir(), converterTmpDir()]) {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export type PickResult = { canceled: true } | { canceled: false; files: PickedFile[] };

/** System file picker. Cancellation is a normal outcome, not an error. */
export async function pickFiles(mimeTypes: string[], multiple: boolean): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: mimeTypes.length > 0 ? mimeTypes : '*/*',
    multiple,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) return { canceled: true };
  return {
    canceled: false,
    files: result.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size })),
  };
}

export async function readBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function writeBase64(uri: string, base64: string): Promise<void> {
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
}

export async function fileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory) return 0;
    return info.size ?? 0;
  } catch {
    return 0;
  }
}

export async function outputExists(name: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(`${converterDir()}/${name}`);
    return info.exists;
  } catch {
    return false;
  }
}

export async function listOutputNames(): Promise<string[]> {
  try {
    const names = await FileSystem.readDirectoryAsync(converterDir());
    return names.filter((n) => n !== CONVERTER_TMP_NAME);
  } catch {
    return [];
  }
}

export async function deleteQuietly(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // cleanup must never throw
  }
}

/** Remove all temporary working files. Originals and outputs are kept. */
export async function cleanTempFiles(): Promise<void> {
  try {
    const names = await FileSystem.readDirectoryAsync(converterTmpDir());
    for (const name of names) await deleteQuietly(`${converterTmpDir()}/${name}`);
  } catch {
    // ignore
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
