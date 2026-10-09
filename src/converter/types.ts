/**
 * Converter domain types. All conversions run on-device; personal files are
 * never uploaded anywhere.
 */

export type ConverterToolId =
  | 'pdf-merge'
  | 'pdf-split'
  | 'pdf-extract'
  | 'pdf-to-text'
  | 'pdf-compress'
  | 'pdf-to-word'
  | 'images-to-pdf'
  | 'image-convert'
  | 'image-resize'
  | 'image-compress'
  | 'docx-to-pdf'
  | 'txt-to-pdf'
  | 'text-to-docx';

export type ToolAvailability =
  | { available: true }
  | { available: false; reason: string };

export interface ConverterTool {
  id: ConverterToolId;
  title: string;
  description: string;
  category: 'PDF' | 'Image' | 'Document';
  availability: ToolAvailability;
  /** MIME filter for the system file picker. */
  pickMime: string[];
  /** Whether the tool accepts several input files. */
  multiple: boolean;
}

export type ConversionStatus = 'completed' | 'failed';

export interface ConversionRecord {
  id: string;
  toolId: ConverterToolId;
  toolTitle: string;
  inputName: string;
  outputName: string;
  outputUri: string;
  mimeType: string | null;
  size: number;
  status: ConversionStatus;
  error: string | null;
  createdAt: number;
}

export interface ConversionResult {
  ok: boolean;
  outputUri?: string;
  outputName?: string;
  mimeType?: string | null;
  size?: number;
  error?: string;
}
