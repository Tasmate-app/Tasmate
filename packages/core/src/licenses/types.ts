/** OSSライセンス一覧の1エントリ */
export interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  repository: string | null;
  licenseText: string | null;
}
