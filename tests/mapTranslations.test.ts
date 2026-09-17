import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import ts from 'typescript';
import ko from '../src/i18n/locales/ko.json';
import en from '../src/i18n/locales/en.json';
import ja from '../src/i18n/locales/ja.json';

const locales = { ko, en, ja };
type Tree = { [key: string]: string | Tree };
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.fromEntries(Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [[path, value]] : Object.entries(flatten(value, path));
  }));
}
const translations = Object.fromEntries(Object.entries(locales).map(([language, locale]) => [language, flatten(locale)]));
const mapKeys = (language: string) => Object.keys(translations[language]).filter(key => key.startsWith('mapUi.')).sort();
const placeholders = (value: string) => [...new Set([...value.matchAll(/{{\s*-?\s*([^},\s]+)(?:,[^}]*)?\s*}}/g)].map(match => match[1]))].sort();
const root = resolve(import.meta.dirname, '..');
const files = [resolve(root, 'src/pages/Dashboard.tsx'), ...readdirSync(resolve(root, 'src/components/map')).filter(file => file.endsWith('.tsx')).map(file => resolve(root, 'src/components/map', file))];
const literalKeys = new Set<string>();
const calls: { key: string; options: string[]; file: string }[] = [];
for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text.startsWith('mapUi.')) literalKeys.add(node.text);
    if (ts.isCallExpression(node) && node.expression.getText(source) === 't') {
      const [key, options] = node.arguments;
      if (key && (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)) && key.text.startsWith('mapUi.')) {
        calls.push({ key: key.text, file, options: options && ts.isObjectLiteralExpression(options) ? options.properties.flatMap(property => property.name ? [property.name.getText(source).replace(/^['"]|['"]$/g, '')] : []) : [] });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

describe('map UI translations', () => {
  it('discovers literal mapUi keys in the dashboard and every map component', () => {
    expect(literalKeys.size).toBeGreaterThan(0);
    expect(literalKeys.has('mapUi.postings.empty')).toBe(true);
    expect(literalKeys.has('mapUi.roles.title')).toBe(true);
    for (const language of Object.keys(locales)) {
      const missing = [...literalKeys].filter(key => !translations[language][key]?.trim());
      expect(missing, `${language}: missing source-used keys`).toEqual([]);
    }
  });

  it('has identical mapUi leaf-key sets and placeholder names in all three locales', () => {
    expect(mapKeys('ko').length).toBeGreaterThan(0);
    for (const language of ['en', 'ja']) {
      expect(mapKeys(language), `${language}: key parity`).toEqual(mapKeys('ko'));
      for (const key of mapKeys('ko')) {
        expect(placeholders(translations[language][key]), `${language}: ${key}`).toEqual(placeholders(translations.ko[key]));
      }
    }
  });

  it('uses only interpolation values actually supplied by each source caller', () => {
    for (const { key, options, file } of calls) {
      for (const language of Object.keys(locales)) {
        expect(translations[language][key], `${language}: ${key}`).toBeTypeOf('string');
        expect(placeholders(translations[language][key]).filter(name => !options.includes(name)), `${file}: ${key} has unsupplied placeholders`).toEqual([]);
      }
    }
  });

  it('retains runtime values from dynamic defaults in the translated strings', () => {
    const expected: Record<string, string[]> = {
      'mapUi.talentTomorrowBody': ['hospitalName', 'name'],
      'mapUi.talentRegularBody': ['hospitalName', 'name', 'role'],
      'mapUi.hospitalInquiryBody': ['hospitalName', 'workerName', 'workerRole'],
      'mapUi.postingInquiryBody': ['title', 'workerName', 'workerRole'],
      'mapUi.desiredHourlyRate': ['amount'],
      'mapUi.offeredHourlyRate': ['amount'],
      'mapUi.postingCount': ['count'],
      'mapUi.viewPosting': ['index'],
    };
    for (const language of Object.keys(locales)) {
      for (const [key, names] of Object.entries(expected)) {
        expect(translations[language][key], `${language}: ${key}`).toBeTypeOf('string');
        expect(placeholders(translations[language][key]), `${language}: ${key}`).toEqual(names.sort());
      }
    }
  });

  it('preserves the approved Korean action and status copy', () => {
    const approved: Record<string, string> = {
      'mapUi.postings.on': '공고 ON',
      'mapUi.postings.view': '공고 보기 →',
      'mapUi.postings.listTitle': '우리 병원 공고 {{count}}개',
      'mapUi.postings.empty': '아직 올린 공고가 없어요',
      'mapUi.postings.off': '공고가 꺼져 있어요',
      'mapUi.postings.create': '첫 공고 올리기',
      'mapUi.postings.enable': '공고 켜기',
      'mapUi.postings.manage': '공고 관리',
      'mapUi.postings.manageShort': '공고 관리',
      'mapUi.postings.visible': '공개 중',
      'mapUi.postings.private': '비공개',
      'mapUi.postings.expired': '기간 만료',
      'mapUi.roles.add': '직종',
      'mapUi.roles.all': '전체',
      'mapUi.roles.title': '직종 선택',
      'mapUi.templateLabel': '빠른 문자',
      'mapUi.templateTomorrow': '내일 가능?',
      'mapUi.templateRegular': '정규 채용',
      'mapUi.templateCustom': '직접 작성',
      'mapUi.smsInquiry': '문자 보내기',
      'mapUi.call': '전화',
      'mapUi.thisPostingInquiry': '문자 보내기 · 이 공고',
      'mapUi.hospitalInquiry': '병원에 문자 보내기',
    };
    for (const [key, value] of Object.entries(approved)) expect(translations.ko[key], key).toBe(value);
  });

  it.each(['en', 'ja'] as const)('resolves every mapUi string in %s without Korean fallback or unresolved interpolation', async language => {
    const i18n = createInstance();
    await i18n.init({ lng: language, fallbackLng: 'ko', resources: { ko: { translation: ko }, en: { translation: en }, ja: { translation: ja } }, interpolation: { escapeValue: false } });
    for (const key of mapKeys('ko')) {
      const values = Object.fromEntries(placeholders(translations.ko[key]).map(name => [name, name === 'count' ? 2 : `sample-${name}`]));
      const result = i18n.t(key, { ...values, returnDetails: true });
      expect(result.usedLng, key).toBe(language);
      expect(result.res, key).not.toMatch(/{{|\$\{|[가-힣]/);
      expect(result.res, key).not.toBe(key);
    }
  });
});
