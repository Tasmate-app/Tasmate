import { describe, expect, it } from 'vitest';
import { mobileLicenseEntries, webLicenseEntries } from '@tasmate/core/licenses';
import rootPackage from '../package.json';
import mobilePackage from '../apps/mobile/package.json';

function thirdPartyDependencies(pkg: { dependencies?: Record<string, string> }): string[] {
  return Object.keys(pkg.dependencies ?? {}).filter((name) => !name.startsWith('@tasmate/'));
}

describe('OSSライセンス一覧', () => {
  it('Web とモバイルの一覧が空でない', () => {
    expect(webLicenseEntries.length).toBeGreaterThan(0);
    expect(mobileLicenseEntries.length).toBeGreaterThan(0);
  });

  it('Web の直接依存をすべて含む', () => {
    const names = new Set(webLicenseEntries.map((entry) => entry.name));
    for (const name of thirdPartyDependencies(rootPackage)) {
      expect(names).toContain(name);
    }
  });

  it('モバイルの直接依存をすべて含む', () => {
    const names = new Set(mobileLicenseEntries.map((entry) => entry.name));
    for (const name of thirdPartyDependencies(mobilePackage)) {
      expect(names).toContain(name);
    }
  });

  it('推移依存も含む', () => {
    expect(webLicenseEntries.map((entry) => entry.name)).toContain('scheduler');
    expect(mobileLicenseEntries.map((entry) => entry.name)).toContain('@babel/runtime');
  });

  it('各エントリに名前・バージョン・ライセンスがある', () => {
    for (const entry of [...webLicenseEntries, ...mobileLicenseEntries]) {
      expect(entry.name).not.toBe('');
      expect(entry.version).not.toBe('');
      expect(entry.license).not.toBe('');
    }
  });

  it('同じ名前・バージョンの重複がない', () => {
    for (const entries of [webLicenseEntries, mobileLicenseEntries]) {
      const keys = entries.map((entry) => `${entry.name}@${entry.version}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
