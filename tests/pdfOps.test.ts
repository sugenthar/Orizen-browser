import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Proves the installed pdf-lib entry point resolves and the exact API
 * sequence used by src/converter/pdfService.ts (load → copyPages →
 * save → reload) works: merge, split/extract, invalid input handling.
 * (Runs in Node; on-device Hermes execution still needs a device to verify.)
 */
async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) {
    const page = doc.addPage([200, 200]);
    page.drawText(`page ${i + 1}`, { x: 20, y: 100, size: 12 });
  }
  return doc.save({ useObjectStreams: true });
}

describe('pdf-lib module resolution and API', () => {
  it('loads a valid PDF and reports page count', async () => {
    const bytes = await makePdf(3);
    const doc = await PDFDocument.load(bytes);
    assert.equal(doc.getPageCount(), 3);
  });

  it('merges pages from two documents in order', async () => {
    const a = await PDFDocument.load(await makePdf(2));
    const b = await PDFDocument.load(await makePdf(1));
    const out = await PDFDocument.create();
    for (const src of [a, b]) {
      const copied = await out.copyPages(src, src.getPageIndices());
      for (const p of copied) out.addPage(p);
    }
    const merged = await PDFDocument.load(await out.save({ useObjectStreams: true }));
    assert.equal(merged.getPageCount(), 3);
  });

  it('splits selected pages into a new document', async () => {
    const src = await PDFDocument.load(await makePdf(5));
    const out = await PDFDocument.create();
    const picked = [0, 2, 4];
    const copied = await out.copyPages(src, picked);
    for (const p of copied) out.addPage(p);
    const split = await PDFDocument.load(await out.save({ useObjectStreams: true }));
    assert.equal(split.getPageCount(), 3);
  });

  it('rejects invalid or corrupted bytes', async () => {
    await assert.rejects(PDFDocument.load(new Uint8Array([1, 2, 3, 4])));
    await assert.rejects(PDFDocument.load(new Uint8Array(0)));
  });

  it('saved output is non-empty bytes', async () => {
    const bytes = await makePdf(1);
    assert.ok(bytes.length > 100);
  });
});

describe('pdf engine loading boundary', () => {
  it('pdfService loads pdf-lib lazily, never at module scope', () => {
    // Regression pin: a static `import ... from 'pdf-lib'` puts the whole
    // form-module chain on the critical startup path. The service must use
    // the guarded loadPdfLib() loader instead so an engine problem becomes
    // an honest error result, never an app-wide crash.
    const src = readFileSync(join(root, 'src/converter/pdfService.ts'), 'utf-8');
    assert.ok(!/^import(?!\s+type\b)[^;]*from 'pdf-lib'/m.test(src), 'static pdf-lib value import found');
    assert.ok(src.includes('loadPdfLib'), 'guarded loader missing');
    assert.ok(src.includes('PDF_ENGINE_UNAVAILABLE'), 'honest fallback message missing');
  });
});
