import { StudentImportRow, IMPORT_COLUMN_MAPPING } from './import-types';

export function mapColumns(row: Record<string, unknown>): StudentImportRow {
  const mapped: Partial<StudentImportRow> = {};
  const rowKeys = Object.keys(row);

  for (const [targetKey, aliases] of Object.entries(IMPORT_COLUMN_MAPPING)) {
    const sourceKey = rowKeys.find((k) =>
      aliases.some((alias) => k.trim().toLowerCase() === alias.toLowerCase())
    );
    if (sourceKey) {
      mapped[targetKey as keyof StudentImportRow] = row[sourceKey] as string | number | boolean | null | undefined;
    }
  }

  return mapped as StudentImportRow;
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
