import { MAX_BACKUP_FILE_BYTES } from '@tasmate/core';

export function downloadTextFile(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    throw new Error('バックアップファイルが大きすぎます');
  }
  return file.text();
}
