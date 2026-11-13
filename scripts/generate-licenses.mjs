import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(join(rootDir, 'package-lock.json'), 'utf8'));
const lockedPackages = lock.packages;

const LICENSE_FILE_RE = /^(licen[cs]e|copying|notice)([._-].*)?$/i;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function resolveDependency(fromKey, name) {
  let base = fromKey;
  for (;;) {
    const candidate = base === '' ? `node_modules/${name}` : `${base}/node_modules/${name}`;
    if (lockedPackages[candidate] !== undefined) return candidate;
    if (base === '') return null;
    const index = base.lastIndexOf('/node_modules/');
    base = index === -1 ? '' : base.slice(0, index);
  }
}

function normalizeLicense(value) {
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (Array.isArray(value)) {
    const parts = value.map(normalizeLicense).filter((part) => part !== 'UNKNOWN');
    return parts.length > 0 ? parts.join(' OR ') : 'UNKNOWN';
  }
  if (value !== null && typeof value === 'object' && typeof value.type === 'string') {
    return value.type;
  }
  return 'UNKNOWN';
}

function normalizeRepository(value) {
  let url = typeof value === 'string' ? value : value?.url;
  if (typeof url !== 'string' || url.trim() === '') return null;
  url = url.trim().replace(/^git\+/, '');
  if (url.startsWith('git@')) {
    url = url.replace(/^git@([^:]+):/, 'https://$1/');
  }
  url = url.replace(/^ssh:\/\/git@([^/]+)\//, 'https://$1/');
  url = url.replace(/^git:\/\//, 'https://');
  url = url.replace(/#.*$/, '').replace(/\.git$/, '');
  return /^https?:\/\//.test(url) ? url : null;
}

function licenseFileScore(file) {
  const name = file.toLowerCase();
  if (name === 'license' || name === 'licence') return 0;
  if (name.startsWith('license.') || name.startsWith('licence.')) return 1;
  if (name.startsWith('copying')) return 2;
  if (name.startsWith('notice')) return 3;
  return 4;
}

function readLicenseText(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const candidates = entries
    .filter((entry) => entry.isFile() && LICENSE_FILE_RE.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => licenseFileScore(a) - licenseFileScore(b) || a.localeCompare(b));
  for (const file of candidates) {
    try {
      const text = readFileSync(join(dir, file), 'utf8')
        .replace(/^\uFEFF/, '')
        .replace(/\r\n?/g, '\n')
        .trim();
      if (text !== '') return text;
    } catch {
      // 読めないファイルは次候補へ
    }
  }
  return null;
}

function buildEntry(key) {
  const lockEntry = lockedPackages[key];
  const dir = join(rootDir, key);
  let pkg = {};
  try {
    pkg = readJson(join(dir, 'package.json'));
  } catch {
    // 未インストールのプラットフォーム別パッケージなどは lock 情報のみ使う
  }
  return {
    name: pkg.name ?? key.replace(/^.*node_modules\//, ''),
    version: pkg.version ?? lockEntry.version ?? '',
    license: normalizeLicense(pkg.license ?? lockEntry.license),
    repository: normalizeRepository(pkg.repository),
    licenseText: readLicenseText(dir),
  };
}

function collectEntries(sources) {
  const visitedPaths = new Set();
  const entriesByKey = new Map();
  const queue = [];

  const enqueueDependencies = (fromKey, dependencies) => {
    for (const name of Object.keys(dependencies ?? {})) {
      const key = resolveDependency(fromKey, name);
      if (key === null) {
        console.warn(`[licenses] 解決できない依存をスキップしました: ${name} (${fromKey || 'root'})`);
        continue;
      }
      queue.push(key);
    }
  };

  for (const { fromKey, packagePath } of sources) {
    enqueueDependencies(fromKey, readJson(join(rootDir, packagePath)).dependencies);
  }

  while (queue.length > 0) {
    const key = queue.shift();
    if (visitedPaths.has(key)) continue;
    visitedPaths.add(key);

    const lockEntry = lockedPackages[key];
    if (lockEntry.link === true) {
      const target = lockEntry.resolved;
      if (target !== undefined && lockedPackages[target] !== undefined) {
        enqueueDependencies(target, lockedPackages[target].dependencies);
      }
      continue;
    }
    if (lockEntry.dev === true) continue;

    const entry = buildEntry(key);
    const entryKey = `${entry.name}@${entry.version}`;
    const existing = entriesByKey.get(entryKey);
    if (existing === undefined) {
      entriesByKey.set(entryKey, entry);
    } else if (existing.licenseText === null && entry.licenseText !== null) {
      existing.licenseText = entry.licenseText;
    }

    enqueueDependencies(key, lockEntry.dependencies);
  }

  return [...entriesByKey.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
  );
}

const workspaceSources = readdirSync(join(rootDir, 'packages'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(rootDir, 'packages', entry.name, 'package.json')))
  .map((entry) => ({
    fromKey: `packages/${entry.name}`,
    packagePath: `packages/${entry.name}/package.json`,
  }));

const webSources = [{ fromKey: '', packagePath: 'package.json' }, ...workspaceSources];
const mobileSources = [
  { fromKey: 'apps/mobile', packagePath: 'apps/mobile/package.json' },
  ...workspaceSources,
];

const webLicenseEntries = collectEntries(webSources);
const mobileLicenseEntries = collectEntries(mobileSources);

const output = `// このファイルは scripts/generate-licenses.mjs により自動生成されます。手動で編集しないでください。
import type { LicenseEntry } from './types';

export const webLicenseEntries: LicenseEntry[] = ${JSON.stringify(webLicenseEntries, null, 2)};

export const mobileLicenseEntries: LicenseEntry[] = ${JSON.stringify(mobileLicenseEntries, null, 2)};
`;

const outputDir = join(rootDir, 'packages', 'core', 'src', 'licenses');
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'generated.ts'), output, 'utf8');

console.log(
  `[licenses] Web ${webLicenseEntries.length} 件 / モバイル ${mobileLicenseEntries.length} 件を生成しました。`,
);
