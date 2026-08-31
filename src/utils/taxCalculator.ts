/**
 * Utility functions for Municipality Tax Financial Year calculations and overdue tracking.
 */

/**
 * Calculates the current April-March financial year (e.g. "2026-2027").
 */
export function getCurrentFinancialYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 3 = April
  
  if (currentMonth >= 3) {
    // April to December
    return `${currentYear}-${currentYear + 1}`;
  } else {
    // January to March
    return `${currentYear - 1}-${currentYear}`;
  }
}

/**
 * Normalizes any variation of a financial year string to strict "YYYY-YYYY" format.
 * Examples:
 * - "FY25-26" -> "2025-2026"
 * - "2025-26" -> "2025-2026"
 * - "2025-2026" -> "2025-2026"
 */
export function normalizeFinancialYear(fyString: string | null | undefined): string | null {
  if (!fyString) return null;
  const str = String(fyString).trim();

  // Match 4-digit start year e.g. 2025-2026 or 2025-26
  const fullMatch = str.match(/(\d{4})\s*[-/]\s*(\d{2,4})/);
  if (fullMatch) {
    const startYear = parseInt(fullMatch[1], 10);
    let endYearStr = fullMatch[2];
    if (endYearStr.length === 2) {
      endYearStr = `${Math.floor(startYear / 100)}${endYearStr}`;
    }
    return `${startYear}-${endYearStr}`;
  }

  // Match 2-digit format e.g. FY25-26 or 25-26
  const shortMatch = str.match(/(?:FY\s*)?(\d{2})\s*[-/]\s*(\d{2})/i);
  if (shortMatch) {
    const startYear = 2000 + parseInt(shortMatch[1], 10);
    const endYear = 2000 + parseInt(shortMatch[2], 10);
    return `${startYear}-${endYear}`;
  }

  return str;
}

/**
 * Calculates whether municipality tax is overdue.
 * If lastPaidFY is older than the current active April-March financial year, returns true.
 * If lastPaidFY is missing or invalid, returns true.
 *
 * @param lastPaidFY The last paid financial year (e.g. "2025-2026", "2026-2027", etc.)
 * @returns boolean true if overdue, false if up to date
 */
export function isTaxOverdue(lastPaidFY: string | null | undefined): boolean {
  if (!lastPaidFY) return true;
  const normalized = normalizeFinancialYear(lastPaidFY);
  if (!normalized) return true;

  const match = normalized.match(/^(\d{4})/);
  if (!match) return true;
  const lastPaidStartYear = parseInt(match[1], 10);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentFYStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

  return lastPaidStartYear < currentFYStartYear;
}
