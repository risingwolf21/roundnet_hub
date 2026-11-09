// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// The app is German + English. These checks keep the two translation files in step and catch `t('key')` calls
// whose key is missing (the screen would show the raw key).
const flat = (o: Record<string, unknown>, prefix = ''): Record<string, string> =>
  Object.entries(o).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null ? { ...acc, ...flat(v as Record<string, unknown>, key) } : { ...acc, [key]: String(v) };
  }, {});

const load = (lang: 'de' | 'en') => flat(JSON.parse(readFileSync(join(__dirname, `../translation/locales/translation.${lang}.json`), 'utf8')));
const de = load('de');
const en = load('en');

const placeholders = (s: string) => [...s.matchAll(/\{\{\s*([A-Za-z0-9_]+)/g)].map((m) => m[1]).sort().join(',');
const PLURAL = ['_zero', '_one', '_two', '_few', '_many', '_other'];
const exists = (translations: Record<string, string>, key: string) => key in translations || PLURAL.some((s) => `${key}${s}` in translations);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'tests' || name === 'generated' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });

describe('translations', () => {
  it('German and English have the same keys', () => {
    expect(Object.keys(en).filter((k) => !(k in de))).toEqual([]);
    expect(Object.keys(de).filter((k) => !(k in en))).toEqual([]);
  });

  it('no translation is empty, and placeholders match between the languages', () => {
    const problems = Object.keys(de).flatMap((k) => [
      ...(!de[k].trim() || !en[k]?.trim() ? [`${k}: empty`] : []),
      ...(placeholders(de[k]) !== placeholders(en[k] ?? '') ? [`${k}: placeholders {${placeholders(de[k])}} vs {${placeholders(en[k] ?? '')}}`] : []),
    ]);
    expect(problems).toEqual([]);
  });

  it('every literal t(...) key used in src exists in both languages', () => {
    const src = join(__dirname, '..');
    const used = sourceFiles(src)
      .filter((f) => !relative(src, f).startsWith('features/supabase')) // developer DB browser: English only, not translated
      .map((f) => ({ f, content: readFileSync(f, 'utf8') }))
      .filter(({ content }) => !/\bconst t\s*=|function t\(/.test(content)) // a local t() helper (e.g. a key prefix) can't be checked statically
      .flatMap(({ f, content }) =>
        [...content.matchAll(/(?:\bt|i18n\.t)\(\s*['"`]([A-Za-z0-9_.-]+)['"`]|i18nKey=\{?['"`]([A-Za-z0-9_.-]+)['"`]/g)].map((m) => ({
          key: m[1] ?? m[2],
          file: relative(src, f),
        }))
      );
    expect(used.length).toBeGreaterThan(100); // the scan itself works
    const missing = used.filter(({ key }) => !exists(de, key) || !exists(en, key)).map(({ key, file }) => `${key} (${file})`);
    expect(missing).toEqual([]);
  });
});
