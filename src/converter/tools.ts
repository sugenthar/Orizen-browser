import type { ConverterTool, ConverterToolId } from './types';

/**
 * Converter tool catalog. Availability reflects what can genuinely run
 * on-device in an Expo development build — tools without a reliable local
 * engine are listed as unavailable with the technical reason, never faked.
 */
export const CONVERTER_TOOLS: ConverterTool[] = [
  // PDF
  {
    id: 'pdf-merge',
    title: 'Merge PDFs',
    description: 'Combine several PDFs into one, in the order you pick them.',
    category: 'PDF',
    availability: { available: true },
    pickMime: ['application/pdf'],
    multiple: true,
  },
  {
    id: 'pdf-split',
    title: 'Split PDF',
    description: 'Save selected page ranges (e.g. 1-3, 5) as a new PDF.',
    category: 'PDF',
    availability: { available: true },
    pickMime: ['application/pdf'],
    multiple: false,
  },
  {
    id: 'pdf-extract',
    title: 'Extract pages',
    description: 'Copy chosen pages into a separate PDF file.',
    category: 'PDF',
    availability: { available: true },
    pickMime: ['application/pdf'],
    multiple: false,
  },
  {
    id: 'pdf-to-text',
    title: 'PDF to text',
    description: 'Extract selectable text from a PDF.',
    category: 'PDF',
    availability: {
      available: false,
      reason: 'No reliable on-device text-extraction engine is bundled. Scanned pages would need OCR, which is not included.',
    },
    pickMime: ['application/pdf'],
    multiple: false,
  },
  {
    id: 'pdf-compress',
    title: 'Compress PDF',
    description: 'Reduce PDF file size.',
    category: 'PDF',
    availability: {
      available: false,
      reason: 'No genuine PDF recompression engine is available on-device. Re-saving alone does not reliably shrink files, so this is not offered.',
    },
    pickMime: ['application/pdf'],
    multiple: false,
  },
  {
    id: 'pdf-to-word',
    title: 'PDF to Word',
    description: 'Convert PDF pages to an editable .docx document.',
    category: 'PDF',
    availability: {
      available: false,
      reason:
        'No genuine offline PDF-to-DOCX engine is integrated. Real conversion needs text extraction with reading order, paragraph reconstruction and layout handling — plus OCR for scanned pages. Complex layouts, tables, columns and images would not survive. This stays unavailable until such an engine is added; nothing is uploaded anywhere.',
    },
    pickMime: ['application/pdf'],
    multiple: false,
  },
  // Image
  {
    id: 'images-to-pdf',
    title: 'Images to PDF',
    description: 'Combine images into one PDF in the order you pick them.',
    category: 'Image',
    availability: { available: true },
    pickMime: ['image/*'],
    multiple: true,
  },
  {
    id: 'image-convert',
    title: 'Convert image',
    description: 'Convert between PNG, JPEG and WebP.',
    category: 'Image',
    availability: { available: true },
    pickMime: ['image/*'],
    multiple: false,
  },
  {
    id: 'image-resize',
    title: 'Resize image',
    description: 'Scale an image to a maximum width you choose.',
    category: 'Image',
    availability: { available: true },
    pickMime: ['image/*'],
    multiple: false,
  },
  {
    id: 'image-compress',
    title: 'Compress image',
    description: 'Re-encode a JPEG with lower quality for a smaller file.',
    category: 'Image',
    availability: { available: true },
    pickMime: ['image/jpeg', 'image/*'],
    multiple: false,
  },
  // Document
  {
    id: 'docx-to-pdf',
    title: 'Word to PDF',
    description: 'Convert a .docx document to PDF.',
    category: 'Document',
    availability: {
      available: false,
      reason: 'Rendering Word documents (fonts, pagination, embedded objects) needs a document renderer that is not bundled on-device.',
    },
    pickMime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    multiple: false,
  },
  {
    id: 'txt-to-pdf',
    title: 'Text to PDF',
    description: 'Turn a plain-text file into a readable PDF.',
    category: 'Document',
    availability: { available: true },
    pickMime: ['text/plain'],
    multiple: false,
  },
  {
    id: 'text-to-docx',
    title: 'Text to Word',
    description: 'Create an editable .docx file from text.',
    category: 'Document',
    availability: {
      available: false,
      reason: 'No local .docx writer is bundled. A hand-rolled ZIP/XML writer would risk corrupt output, so this stays unavailable.',
    },
    pickMime: ['text/plain'],
    multiple: false,
  },
];

export function getConverterTool(id: ConverterToolId): ConverterTool {
  const tool = CONVERTER_TOOLS.find((t) => t.id === id);
  if (!tool) throw new Error(`Unknown converter tool: ${id}`);
  return tool;
}
