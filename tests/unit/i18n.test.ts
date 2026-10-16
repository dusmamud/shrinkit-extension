import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { t, getMessages, isLocale, LOCALES, type Locale } from '../../src/lib/i18n/index';

type Messages = Record<string, string>;

function loadMessages(locale: string): Messages {
  const url = new URL(`../../src/i18n/messages/${locale}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf-8')) as Messages;
}

const en = loadMessages('en');
const es = loadMessages('es');
const pt = loadMessages('pt');

/** Placeholder names used in a message, e.g. "{count} of {max}" → ["count", "max"]. */
function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

describe('locale message files (src/i18n/messages/*.json)', () => {
  it('en, es and pt have identical key sets', () => {
    const enKeys = Object.keys(en).sort();
    expect(Object.keys(es).sort()).toEqual(enKeys);
    expect(Object.keys(pt).sort()).toEqual(enKeys);
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it('every message is a non-empty string in every locale', () => {
    for (const [locale, messages] of Object.entries({ en, es, pt })) {
      for (const [key, value] of Object.entries(messages)) {
        expect(typeof value, `${locale}.${key}`).toBe('string');
        expect(value.length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('placeholder names match across locales for every key', () => {
    for (const key of Object.keys(en)) {
      expect(placeholders(es[key]).sort(), `es.${key}`).toEqual(placeholders(en[key]).sort());
      expect(placeholders(pt[key]).sort(), `pt.${key}`).toEqual(placeholders(en[key]).sort());
    }
  });
});

describe('LOCALES / isLocale / getMessages', () => {
  it('supports exactly en, es, pt', () => {
    expect(LOCALES).toEqual(['en', 'es', 'pt']);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('es')).toBe(true);
    expect(isLocale('pt')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('getMessages returns the locale file contents', () => {
    expect(getMessages('es')).toEqual(es);
    expect(getMessages('pt')).toEqual(pt);
  });

  it('getMessages falls back to English for unknown locales', () => {
    expect(getMessages('fr' as Locale)).toEqual(en);
  });
});

describe('t()', () => {
  it('returns the message for the requested locale', () => {
    expect(t('es', 'about.body1')).toBe(es['about.body1']);
    expect(t('pt', 'about.body1')).toBe(pt['about.body1']);
    expect(t('en', 'about.body1')).toBe(en['about.body1']);
  });

  it('interpolates {param} placeholders in all locales', () => {
    expect(t('en', 'dropzone.batch_count', { count: 2, max: 50 })).toBe('2 of 50 images');
    expect(t('es', 'dropzone.batch_count', { count: 2, max: 50 })).toBe('2 de 50 imágenes');
    expect(t('pt', 'dropzone.batch_count', { count: 2, max: 50 })).toBe('2 de 50 imagens');
    expect(t('en', 'footer.rights', { year: 2026 })).toBe('© 2026 ShrinkIt. All rights reserved.');
  });

  it('leaves placeholders without a matching param untouched', () => {
    expect(t('en', 'dropzone.batch_count', { count: 3 })).toBe('3 of {max} images');
  });

  it('leaves placeholders untouched when no params are passed', () => {
    expect(t('en', 'dropzone.batch_count')).toBe('{count} of {max} images');
  });

  it('returns the key itself for a missing key, in any locale', () => {
    expect(t('en', 'no.such.key')).toBe('no.such.key');
    expect(t('es', 'no.such.key')).toBe('no.such.key');
    expect(t('pt', 'no.such.key')).toBe('no.such.key');
  });

  it('falls back to English for an unknown locale', () => {
    expect(t('fr' as Locale, 'about.body1')).toBe(en['about.body1']);
  });
});
