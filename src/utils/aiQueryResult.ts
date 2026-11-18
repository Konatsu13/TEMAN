export type AIQueryCell = string | number | null;

export interface AIQueryResult {
  answer: string;
  columns: string[];
  rows: Array<Record<string, AIQueryCell>>;
}

export function isAIQueryResult(value: unknown): value is AIQueryResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  if (
    typeof result.answer !== 'string' ||
    !Array.isArray(result.columns) ||
    !Array.isArray(result.rows) ||
    !result.columns.every((column) => typeof column === 'string')
  ) {
    return false;
  }

  return result.rows.every(
    (row) =>
      Boolean(row) &&
      typeof row === 'object' &&
      Object.values(row).every(
        (cell) =>
          cell === null ||
          typeof cell === 'string' ||
          (typeof cell === 'number' && Number.isFinite(cell))
      )
  );
}
