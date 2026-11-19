import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mobileDir = resolve(rootDir, 'apps/mobile');

function loadEnvironment() {
  const fileEnv = {};
  for (const name of ['.env', '.env.local']) {
    const path = resolve(rootDir, name);
    if (!existsSync(path)) continue;
    try {
      Object.assign(fileEnv, parseEnv(readFileSync(path, 'utf8')));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to read ${name}: ${message}`);
      process.exit(1);
    }
  }
  // シェルで明示された値は .env より優先する。
  return { ...fileEnv, ...process.env };
}

const env = loadEnvironment();
const required = [
  'TASMATE_UPLOAD_STORE_FILE',
  'TASMATE_UPLOAD_STORE_PASSWORD',
  'TASMATE_UPLOAD_KEY_ALIAS',
  'TASMATE_UPLOAD_KEY_PASSWORD',
];

const missing = required.filter((name) => !env[name]);
if (missing.length > 0) {
  console.error('Android release signing is not configured.');
  console.error(`Missing: ${missing.join(', ')}`);
  console.error('Set them in the repository .env file. See .env.example.');
  console.error('For a debug build, run: npm run apk:debug -w tasmate-mobile');
  process.exit(1);
}

const storeFile = isAbsolute(env.TASMATE_UPLOAD_STORE_FILE)
  ? env.TASMATE_UPLOAD_STORE_FILE
  : resolve(rootDir, env.TASMATE_UPLOAD_STORE_FILE);

if (!existsSync(storeFile)) {
  console.error(`Keystore not found: ${storeFile}`);
  process.exit(1);
}
env.TASMATE_UPLOAD_STORE_FILE = storeFile;

function run(command, cwd) {
  const result = spawnSync(command, {
    cwd,
    env,
    stdio: 'inherit',
    shell: true,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npm run prebuild:android', mobileDir);
run(
  process.platform === 'win32'
    ? 'gradlew.bat :app:assembleRelease'
    : './gradlew :app:assembleRelease',
  resolve(mobileDir, 'android'),
);
