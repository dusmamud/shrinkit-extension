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

// ---- Worker 9 (multi-page rebuild): new-key guards ----

import { ROUTE_TITLE_KEY } from '../../src/router/routes';

/**
 * Every key added for the multi-page rebuild (contract keys from the
 * task + every key the landed pages/layout/popup/options code uses).
 * Computed as current en.json minus the pre-rebuild en.json.
 */
const NEW_KEYS: readonly string[] = [
  'footer.about',
  'footer.terms',
  'hero.private_note',
  'home.hero_subtitle',
  'home.hero_title',
  'home.how.badge',
  'home.how.heading',
  'home.how.step1.desc',
  'home.how.step1.title',
  'home.how.step2.desc',
  'home.how.step2.title',
  'home.how.step3.desc',
  'home.how.step3.title',
  'home.how.subheading',
  'home.how_step1_desc',
  'home.how_step1_title',
  'home.how_step2_desc',
  'home.how_step2_title',
  'home.how_step3_desc',
  'home.how_step3_title',
  'home.how_title',
  'home.info.pagination',
  'home.tools.20kb.badge',
  'home.tools.20kb.desc',
  'home.tools.20kb.metric',
  'home.tools.20kb.title',
  'home.tools.50kb.badge',
  'home.tools.50kb.desc',
  'home.tools.50kb.metric',
  'home.tools.50kb.title',
  'home.tools.all_tools',
  'home.tools.badge',
  'home.tools.compare.badge',
  'home.tools.compare.desc',
  'home.tools.compare.metric',
  'home.tools.compare.title',
  'home.tools.heading',
  'home.tools.open_tool',
  'home.tools.passport.badge',
  'home.tools.passport.desc',
  'home.tools.passport.metric',
  'home.tools.passport.title',
  'home.tools.social.badge',
  'home.tools.social.desc',
  'home.tools.social.metric',
  'home.tools.social.title',
  'home.tools.subheading',
  'home.tools_subtitle',
  'home.tools_title',
  'nav.about',
  'nav.close_menu',
  'nav.language',
  'nav.menu',
  'nav.mobile',
  'nav.primary',
  'nav.resize_image',
  'nav.skip_to_content',
  'notfound.back_home',
  'notfound.body',
  'notfound.code',
  'notfound.home_link',
  'notfound.title',
  'options.backHome',
  'options.back_home',
  'options.openTools',
  'options.open_tools',
  'popup.formats_hint',
  'popup.input_formats',
  'popup.open_tools',
  'popup.output_formats',
  'privacy.disclaimer',
  'privacy.full_text',
  'privacy.s5d',
  'privacy.s5t',
  'privacy.s6d',
  'privacy.s6t',
  'privacy.sec1.body',
  'privacy.sec1.title',
  'privacy.sec10.body',
  'privacy.sec10.title',
  'privacy.sec11.body',
  'privacy.sec11.title',
  'privacy.sec12.body',
  'privacy.sec12.title',
  'privacy.sec13.body',
  'privacy.sec13.title',
  'privacy.sec14.body',
  'privacy.sec14.title',
  'privacy.sec15.body',
  'privacy.sec15.title',
  'privacy.sec16.body',
  'privacy.sec16.title',
  'privacy.sec2.body',
  'privacy.sec2.title',
  'privacy.sec3.body',
  'privacy.sec3.title',
  'privacy.sec4.body',
  'privacy.sec4.title',
  'privacy.sec5.body',
  'privacy.sec5.title',
  'privacy.sec6.body',
  'privacy.sec6.title',
  'privacy.sec7.body',
  'privacy.sec7.title',
  'privacy.sec8.body',
  'privacy.sec8.title',
  'privacy.sec9.body',
  'privacy.sec9.title',
  'terms.disclaimer',
  'terms.full_text',
  'terms.intro',
  'terms.s1d',
  'terms.s1t',
  'terms.s2d',
  'terms.s2t',
  'terms.s3d',
  'terms.s3t',
  'terms.s4d',
  'terms.s4t',
  'terms.s5d',
  'terms.s5t',
  'terms.s6d',
  'terms.s6t',
  'terms.sec1.body',
  'terms.sec1.title',
  'terms.sec10.body',
  'terms.sec10.title',
  'terms.sec11.body',
  'terms.sec11.title',
  'terms.sec12.body',
  'terms.sec12.title',
  'terms.sec13.body',
  'terms.sec13.title',
  'terms.sec14.body',
  'terms.sec14.title',
  'terms.sec15.body',
  'terms.sec15.title',
  'terms.sec16.body',
  'terms.sec16.title',
  'terms.sec2.body',
  'terms.sec2.title',
  'terms.sec3.body',
  'terms.sec3.title',
  'terms.sec4.body',
  'terms.sec4.title',
  'terms.sec5.body',
  'terms.sec5.title',
  'terms.sec6.body',
  'terms.sec6.title',
  'terms.sec7.body',
  'terms.sec7.title',
  'terms.sec8.body',
  'terms.sec8.title',
  'terms.sec9.body',
  'terms.sec9.title',
  'terms.title',
  'tools.back_to_tools',
  'tools.card_20kb_badge',
  'tools.card_20kb_desc',
  'tools.card_20kb_title',
  'tools.card_50kb_badge',
  'tools.card_50kb_desc',
  'tools.card_50kb_title',
  'tools.card_compare_badge',
  'tools.card_compare_desc',
  'tools.card_compare_title',
  'tools.card_passport_badge',
  'tools.card_passport_desc',
  'tools.card_passport_title',
  'tools.card_social_badge',
  'tools.card_social_desc',
  'tools.card_social_title',
  'tools.compare.compressedAlt',
  'tools.compare.originalAlt',
  'tools.comparePage.badge',
  'tools.comparePage.howTo1',
  'tools.comparePage.howTo2',
  'tools.comparePage.howTo3',
  'tools.comparePage.howToTitle',
  'tools.comparePage.subtitle',
  'tools.comparePage.title',
  'tools.compress20.badge',
  'tools.compress20.howTo1',
  'tools.compress20.howTo2',
  'tools.compress20.howTo3',
  'tools.compress20.howToTitle',
  'tools.compress20.subtitle',
  'tools.compress20.title',
  'tools.compress50.badge',
  'tools.compress50.howTo1',
  'tools.compress50.howTo2',
  'tools.compress50.howTo3',
  'tools.compress50.howToTitle',
  'tools.compress50.subtitle',
  'tools.compress50.title',
  'tools.how_20kb',
  'tools.how_50kb',
  'tools.how_compare',
  'tools.how_passport',
  'tools.how_social',
  'tools.how_title',
  'tools.hub.card20Badge',
  'tools.hub.card20Desc',
  'tools.hub.card20Title',
  'tools.hub.card50Badge',
  'tools.hub.card50Desc',
  'tools.hub.card50Title',
  'tools.hub.cardCompareBadge',
  'tools.hub.cardCompareDesc',
  'tools.hub.cardCompareTitle',
  'tools.hub.cardPassportBadge',
  'tools.hub.cardPassportDesc',
  'tools.hub.cardPassportTitle',
  'tools.hub.cardSocialBadge',
  'tools.hub.cardSocialDesc',
  'tools.hub.cardSocialTitle',
  'tools.hub.description',
  'tools.hub.openTool',
  'tools.hub.title',
  'tools.hub_subtitle',
  'tools.hub_title',
  'tools.page.backToTools',
  'tools.passportPage.badge',
  'tools.passportPage.howTo1',
  'tools.passportPage.howTo2',
  'tools.passportPage.howTo3',
  'tools.passportPage.howToTitle',
  'tools.passportPage.subtitle',
  'tools.passportPage.title',
  'tools.socialPage.badge',
  'tools.socialPage.howTo1',
  'tools.socialPage.howTo2',
  'tools.socialPage.howTo3',
  'tools.socialPage.howToTitle',
  'tools.socialPage.subtitle',
  'tools.socialPage.title',
];

/**
 * New keys whose ES/PT value is legitimately identical to the English
 * one: the 404 code, language-neutral tool metrics, and PT "Menu"
 * (the Portuguese word for menu is "Menu").
 */
const NEW_KEYS_SAME_AS_EN_ES: ReadonlySet<string> = new Set([
  'home.tools.20kb.metric',
  'home.tools.50kb.metric',
  'home.tools.passport.metric',
  'home.tools.social.metric',
  'notfound.code',
]);
const NEW_KEYS_SAME_AS_EN_PT: ReadonlySet<string> = new Set([
  'home.tools.20kb.metric',
  'home.tools.50kb.metric',
  'home.tools.passport.metric',
  'home.tools.social.metric',
  'nav.menu',
  'notfound.code',
]);

describe('multi-page rebuild keys (Worker 9)', () => {
  it('every new key exists in all three locales', () => {
    for (const key of NEW_KEYS) {
      expect(key in en, `en.${key}`).toBe(true);
      expect(key in es, `es.${key}`).toBe(true);
      expect(key in pt, `pt.${key}`).toBe(true);
    }
  });

  it('t() resolves every new key in every locale (never echoes the key)', () => {
    for (const key of NEW_KEYS) {
      expect(t('en', key), `en.${key}`).not.toBe(key);
      expect(t('es', key), `es.${key}`).not.toBe(key);
      expect(t('pt', key), `pt.${key}`).not.toBe(key);
    }
  });

  it('ES/PT values are real translations, never English copies', () => {
    for (const key of NEW_KEYS) {
      if (!NEW_KEYS_SAME_AS_EN_ES.has(key)) {
        expect(es[key], `es.${key}`).not.toBe(en[key]);
      }
      if (!NEW_KEYS_SAME_AS_EN_PT.has(key)) {
        expect(pt[key], `pt.${key}`).not.toBe(en[key]);
      }
    }
  });

  it('every ROUTE_TITLE_KEY value exists in all three locales', () => {
    for (const [route, key] of Object.entries(ROUTE_TITLE_KEY)) {
      expect(key in en, `${route} title key en.${key}`).toBe(true);
      expect(key in es, `${route} title key es.${key}`).toBe(true);
      expect(key in pt, `${route} title key pt.${key}`).toBe(true);
      expect(t('es', key), `${route} title`).not.toBe(key);
      expect(t('pt', key), `${route} title`).not.toBe(key);
    }
  });
});
