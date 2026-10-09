import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveToolbarMode } from '../src/browser/toolbarState.js';
import { TOOLBAR_LABELS, WEBPAGE_TOOLBAR_ORDER } from '../src/components/toolbarItems.js';
import { WORDMARK, WORDMARK_CODEPOINTS, wordmarkCodepoints } from '../src/theme/brand.js';
import { DARK_COLORS, LIGHT_COLORS } from '../src/theme/palette.js';

describe('context-aware toolbar mode', () => {
  it('homepage opens with an empty toolbar', () => {
    assert.equal(resolveToolbarMode(true, false), 'empty');
  });

  it('a homepage error page still shows navigation controls', () => {
    assert.equal(resolveToolbarMode(true, true), 'browser');
  });

  it('a search results page reveals the navigation toolbar', () => {
    assert.equal(resolveToolbarMode(false, false), 'browser');
  });

  it('a failed page keeps the toolbar (retry needs navigation)', () => {
    assert.equal(resolveToolbarMode(false, true), 'browser');
  });
});

describe('always-visible toolbar (no scroll hiding)', () => {
  it('exposes no scroll-hide state machine', async () => {
    const mod = await import('../src/browser/toolbarState.js');
    assert.ok(!('nextScrollHidden' in mod), 'scroll reducer must be gone');
    assert.ok(!('rememberHidden' in mod), 'per-tab hidden memory must be gone');
    assert.ok(!('SCROLL_THRESHOLD' in mod), 'scroll threshold must be gone');
  });

  it('toolbar mode depends only on tab state, never on scroll', () => {
    // Scrolling must not change the mode: the same tab state always gives
    // the same mode, on homepages, search results and websites alike.
    assert.equal(resolveToolbarMode(false, false), 'browser');
    assert.equal(resolveToolbarMode(true, false), 'empty');
  });
});

describe('monochrome palette', () => {
  it('dark theme is pure black with white text', () => {
    assert.equal(DARK_COLORS.background, '#000000');
    assert.equal(DARK_COLORS.toolbar, '#000000');
    assert.equal(DARK_COLORS.text, '#FFFFFF');
  });

  it('light theme is white with black text', () => {
    assert.equal(LIGHT_COLORS.background, '#FFFFFF');
    assert.equal(LIGHT_COLORS.toolbar, '#FFFFFF');
    assert.equal(LIGHT_COLORS.text, '#000000');
  });

  it('accents are monochrome with a contrasting on-accent', () => {
    assert.equal(DARK_COLORS.accent, '#FFFFFF');
    assert.equal(DARK_COLORS.onAccent, '#000000');
    assert.equal(LIGHT_COLORS.accent, '#000000');
    assert.equal(LIGHT_COLORS.onAccent, '#FFFFFF');
  });

  const isBlue = (hex: string): boolean => {
    const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
    if (!m) return false;
    const r = parseInt(m[1]!.slice(0, 2), 16);
    const g = parseInt(m[1]!.slice(2, 4), 16);
    const b = parseInt(m[1]!.slice(4, 6), 16);
    return b > r + 24 && b > g + 24;
  };

  it('no blue-tinted interface colors remain', () => {
    for (const [name, palette] of [['light', LIGHT_COLORS], ['dark', DARK_COLORS]] as const) {
      for (const [key, value] of Object.entries(palette)) {
        if (key === 'overlay') continue;
        assert.equal(isBlue(value), false, `${name}.${key} is blue-tinted: ${value}`);
      }
    }
  });
});

describe('bottom toolbar without back/forward', () => {
  it('webpage toolbar has exactly Converter, Work, Home, Tabs, Menu', () => {
    assert.deepEqual([...WEBPAGE_TOOLBAR_ORDER], ['converter', 'work', 'home', 'tabs', 'menu']);
  });

  it('no back or forward action exists in the toolbar definition', () => {
    const ids: string[] = [...WEBPAGE_TOOLBAR_ORDER];
    assert.ok(!ids.includes('back'));
    assert.ok(!ids.includes('forward'));
    for (const label of Object.values(TOOLBAR_LABELS)) {
      assert.ok(!/back|forward/i.test(label));
    }
  });

  it('labels are clear and unique', () => {
    const labels = WEBPAGE_TOOLBAR_ORDER.map((id) => TOOLBAR_LABELS[id]);
    assert.equal(new Set(labels).size, labels.length);
    assert.ok(labels.every((l) => l.length > 0));
  });
});

describe('exact Unicode wordmark', () => {
  it('matches the specified codepoints exactly', () => {
    assert.deepEqual(wordmarkCodepoints(), WORDMARK_CODEPOINTS);
    assert.equal([...WORDMARK].length, 6);
  });
});
