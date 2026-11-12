import { MAX_BACKUP_FILE_BYTES } from '@tasmate/core';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function shareBackupFile(fileName: string, text: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('この端末では共有機能を利用できません。');
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true, intermediates: true });
  await file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Tasmate バックアップ',
  });
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await File.pickFileAsync({
    mimeTypes: ['application/json', 'text/plain'],
  });
  if (result.canceled) return null;
  const file = result.result;
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    throw new Error('バックアップファイルが大きすぎます。');
  }
  return file.text();
}
