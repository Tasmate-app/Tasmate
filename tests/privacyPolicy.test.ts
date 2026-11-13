import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRIVACY_POLICY } from '@tasmate/core';

const markdown = readFileSync(
  new URL('../docs/privacy-policy.md', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');

describe('privacy policy content', () => {
  it('docs/privacy-policy.md と構造化データが一致する', () => {
    expect(markdown).toContain(`# ${PRIVACY_POLICY.title}`);
    expect(markdown).toContain(`最終更新日：${PRIVACY_POLICY.lastUpdated}`);

    const headings = markdown.match(/^## /gm) ?? [];
    expect(headings).toHaveLength(PRIVACY_POLICY.sections.length);

    for (const paragraph of PRIVACY_POLICY.intro) {
      expect(markdown).toContain(paragraph);
    }

    for (const section of PRIVACY_POLICY.sections) {
      expect(markdown).toContain(`## ${section.heading}`);
      for (const paragraph of section.paragraphs) {
        expect(markdown).toContain(paragraph);
      }
      for (const item of section.bullets ?? []) {
        expect(markdown).toContain(`- ${item}`);
      }
    }
  });
});
