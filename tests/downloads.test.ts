import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ensureExtension,
  filenameFromContentDisposition,
  filenameFromUrl,
  formatBytes,
  isDownloadableUrl,
  mimeFromFilename,
  sanitizeFilename,
  typeLabel,
} from '../src/downloads/downloadManager.js';

describe('download filename handling', () => {
  it('derives a name from the URL path and strips queries', () => {
    assert.equal(filenameFromUrl('https://example.com/files/report.pdf?token=abc&q=hello'), 'report.pdf');
  });

  it('falls back to a host-based name for pathless URLs', () => {
    assert.equal(filenameFromUrl('https://example.com'), 'example.com-download');
  });

  it('sanitizes illegal characters and query-derived junk', () => {
    assert.equal(sanitizeFilename('a<b>c:d"e/f\\g|h?i*j'), 'a_b_c_d_e_f_g_h_i_j');
  });

  it('never returns an empty filename', () => {
    assert.equal(sanitizeFilename('...'), 'download');
  });

  it('parses content-disposition filenames', () => {
    assert.equal(filenameFromContentDisposition('attachment; filename="report.pdf"'), 'report.pdf');
    assert.equal(filenameFromContentDisposition("attachment; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf"), 'résumé.pdf');
    assert.equal(filenameFromContentDisposition(null), null);
  });

  it('adds an extension from the MIME type when missing', () => {
    assert.equal(ensureExtension('report', 'application/pdf'), 'report.pdf');
    assert.equal(ensureExtension('report.pdf', 'application/pdf'), 'report.pdf');
  });

  it('maps filenames to MIME types and labels', () => {
    assert.equal(mimeFromFilename('a.pdf'), 'application/pdf');
    assert.equal(typeLabel('a.pdf', 'application/pdf'), 'PDF');
    assert.equal(typeLabel('a.png', 'image/png'), 'Image');
    assert.equal(typeLabel('a.png', null), 'PNG');
  });

  it('formats byte sizes', () => {
    assert.equal(formatBytes(0), 'Unknown size');
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(2450000), '2.3 MB');
  });

  it('only accepts http(s) download URLs', () => {
    assert.equal(isDownloadableUrl('https://example.com/f.pdf'), true);
    assert.equal(isDownloadableUrl('blob:https://example.com/x'), false);
    assert.equal(isDownloadableUrl('data:application/pdf;base64,x'), false);
  });
});
