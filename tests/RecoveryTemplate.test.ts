import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const template = () => readFileSync('supabase/templates/recovery.html', 'utf8');
it('preserves Supabase ConfirmationURL button and visible URL fallback', () => {
  const html = template(); const doc = new DOMParser().parseFromString(html, 'text/html');
  expect(doc.querySelector('a[href="{{ .ConfirmationURL }}"]')).not.toBeNull();
  expect(doc.body.textContent).toContain('{{ .ConfirmationURL }}');
  expect(html.match(/{{\s*\.ConfirmationURL\s*}}/g)?.length).toBeGreaterThanOrEqual(2);
});
it('offers the Supabase code and canonical manual entry, never appending the code to a URL', () => {
  const html = template(); const doc = new DOMParser().parseFromString(html, 'text/html');
  expect(doc.body.textContent).toContain('{{ .Token }}');
  expect(doc.body.textContent).toContain('https://www.medinoti.com/reset-password');
  expect(doc.querySelector('a[href="https://www.medinoti.com/reset-password"]')).not.toBeNull();
  for (const node of doc.querySelectorAll('*')) for (const attr of node.attributes) expect(attr.value).not.toMatch(/{{\s*\.Token\s*}}/);
  expect(html).not.toMatch(/\.TokenHash|<script|<form|<iframe|<img/i);
  expect(html).not.toMatch(/6[- ]digit|6자리/);
});
it('brands and explains both recovery options in Korean and English with safety instructions', () => {
  const text = new DOMParser().parseFromString(template(), 'text/html').body.textContent!;
  for (const phrase of ['Medinoti', '메디노티', '비밀번호', '이메일', '코드', '공유하지', '요청하지', 'password', 'email', 'code', 'Never share', 'ignore']) expect(text).toContain(phrase);
});
