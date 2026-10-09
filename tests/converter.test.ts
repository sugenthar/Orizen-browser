import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isPdfName,
  isSupportedImage,
  parsePageRanges,
  replaceExtension,
  sanitizeFileName,
  uniqueName,
} from '../src/converter/validation.js';
import { getConverterTool } from '../src/converter/tools.js';

describe('converter filename handling', () => {
  it('sanitizes illegal characters', () => {
    assert.equal(sanitizeFileName('a<b>c:d"e/f\\g|h?i*j'), 'a_b_c_d_e_f_g_h_i_j');
  });

  it('never returns an empty name', () => {
    assert.equal(sanitizeFileName('...'), 'file');
  });

  it('replaces extensions', () => {
    assert.equal(replaceExtension('photo.png', 'jpg'), 'photo.jpg');
    assert.equal(replaceExtension('noext', 'pdf'), 'noext.pdf');
  });

  it('never silently overwrites: uniquifies names', () => {
    assert.equal(uniqueName('a.pdf', []), 'a.pdf');
    assert.equal(uniqueName('a.pdf', ['a.pdf']), 'a (2).pdf');
    assert.equal(uniqueName('a.pdf', ['a.pdf', 'a (2).pdf']), 'a (3).pdf');
  });
});

describe('page range parsing', () => {
  it('parses singles and ranges in order', () => {
    assert.deepEqual(parsePageRanges('1-3, 5', 10), { pages: [1, 2, 3, 5] });
  });

  it('deduplicates and sorts', () => {
    assert.deepEqual(parsePageRanges('5, 1-2, 2', 10), { pages: [1, 2, 5] });
  });

  it('accepts reversed ranges', () => {
    assert.deepEqual(parsePageRanges('3-1', 10), { pages: [1, 2, 3] });
  });

  it('rejects out-of-range and malformed input with messages', () => {
    for (const bad of ['', '0', '11', '2-11', 'abc', '1--2']) {
      const r = parsePageRanges(bad, 10);
      assert.ok('error' in r && typeof r.error === 'string' && r.error.length > 0, bad);
    }
  });
});

describe('format validation', () => {
  it('accepts PDFs by extension', () => {
    assert.equal(isPdfName('report.PDF'), true);
    assert.equal(isPdfName('photo.png'), false);
  });

  it('accepts PNG/JPEG/WebP by extension or MIME', () => {
    assert.equal(isSupportedImage('a.png'), true);
    assert.equal(isSupportedImage('a.jpeg'), true);
    assert.equal(isSupportedImage('a.webp'), true);
    assert.equal(isSupportedImage('a.gif'), false);
    assert.equal(isSupportedImage('unknown', 'image/png'), true);
    assert.equal(isSupportedImage('unknown'), false);
  });
});

describe('tool catalog honesty', () => {
  it('marks genuinely unavailable tools with reasons', () => {
    for (const id of ['pdf-to-word', 'pdf-compress', 'pdf-to-text', 'docx-to-pdf', 'text-to-docx'] as const) {
      const tool = getConverterTool(id);
      assert.equal(tool.availability.available, false);
      if (!tool.availability.available) {
        assert.ok(tool.availability.reason.length > 20, id);
      }
    }
  });

  it('marks implemented tools available', () => {
    for (const id of ['pdf-merge', 'pdf-split', 'pdf-extract', 'images-to-pdf', 'image-convert', 'image-resize', 'image-compress', 'txt-to-pdf'] as const) {
      assert.equal(getConverterTool(id).availability.available, true, id);
    }
  });
});
