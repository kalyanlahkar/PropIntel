/**
 * Date formatting and parsing utility for DD-MM-YYYY representation
 */

/**
 * Checks if a string is a complete date (10 characters matching standard patterns)
 */
export function isDateComplete(dateInput?: string | null): boolean {
  if (!dateInput) return false;
  const str = String(dateInput).trim();
  if (str.length !== 10) return false;
  return /^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(str) || /^\d{4}[-/.]\d{2}[-/.]\d{2}$/.test(str);
}

/**
 * Formats any date string or Date object into "DD-MM-YYYY"
 * Handles YYYY-MM-DD, ISO timestamps, DD-MM-YYYY, DD/MM/YYYY, etc.
 * Does NOT mutate or mangle incomplete typed strings (e.g. "1", "12-05")
 */
export function formatDateToDDMMYYYY(dateInput?: string | Date | null, fallback = ''): string {
  if (!dateInput && dateInput !== '') return fallback;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return fallback;
    const dd = String(dateInput.getDate()).padStart(2, '0');
    const mm = String(dateInput.getMonth() + 1).padStart(2, '0');
    const yyyy = dateInput.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  const str = String(dateInput).trim();
  if (!str || str === 'null' || str === 'undefined' || str === '---' || str === 'N/A') {
    return fallback;
  }

  // Already in DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY or DD.MM.YYYY format
  if (/^\d{2}[/.]\d{2}[/.]\d{4}$/.test(str)) {
    const parts = str.split(/[/.]/);
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    return `${dd}-${mm}-${yyyy}`;
  }

  // ISO timestamp (contains T, e.g. 2026-08-14T22:30:00Z)
  if (str.includes('T')) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const yyyy = parsed.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
  }

  // For partial or incomplete typing (e.g., "1", "15-", "15-08"), return as-is
  return str;
}

/**
 * Formats a date specifically for presentation/display in badges, cards, tables
 */
export function formatDisplayDate(dateInput?: string | Date | null, fallback = '---'): string {
  const result = formatDateToDDMMYYYY(dateInput, fallback);
  return result || fallback;
}

/**
 * Converts any complete DD-MM-YYYY or general date into standard ISO "YYYY-MM-DD" suitable for PostgreSQL / Supabase
 * Returns null if the date is invalid, incomplete, empty, or a placeholder like '---' / 'N/A'
 */
export function convertDDMMYYYYToISO(dateInput?: string | null): string | null {
  if (!dateInput) return null;
  const str = String(dateInput).trim();
  if (!str || str === '---' || str === 'N/A' || str === 'null' || str === 'undefined') {
    return null;
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Match DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // Match YYYY-MM-DD, YYYY/MM/DD, or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // ISO timestamp containing T
  if (str.includes('T')) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  return null;
}

/**
 * Calculates remaining days from any date format (YYYY-MM-DD or DD-MM-YYYY)
 */
export function getDaysRemainingFromDate(dateInput?: string | null): number {
  if (!dateInput) return 999;
  const iso = convertDDMMYYYYToISO(dateInput);
  if (!iso) return 999;
  
  const target = new Date(iso).getTime();
  if (isNaN(target)) return 999;

  const now = new Date().getTime();
  return Math.ceil((target - now) / (1000 * 3600 * 24));
}

/**
 * Checks if a date string is complete and is a valid calendar date
 */
export function isDateValid(dateInput?: string | null): boolean {
  if (!dateInput) return false;
  const str = String(dateInput).trim();
  if (!isDateComplete(str)) return false;

  const iso = convertDDMMYYYYToISO(str);
  if (!iso) return false;

  const parts = iso.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;

  const parsed = new Date(y, m - 1, d);
  return (
    parsed.getFullYear() === y &&
    parsed.getMonth() === m - 1 &&
    parsed.getDate() === d
  );
}

/**
 * Validates if dateA is strictly earlier than dateB.
 * Returns true if dateA < dateB, or false if dateA >= dateB or either is invalid.
 */
export function isDateEarlier(dateA?: string | null, dateB?: string | null): boolean {
  if (!dateA || !dateB) return false;
  if (!isDateComplete(dateA) || !isDateComplete(dateB)) return false;
  
  const isoA = convertDDMMYYYYToISO(dateA);
  const isoB = convertDDMMYYYYToISO(dateB);
  if (!isoA || !isoB) return false;

  const timeA = new Date(isoA).getTime();
  const timeB = new Date(isoB).getTime();
  if (isNaN(timeA) || isNaN(timeB)) return false;

  return timeA < timeB;
}

/**
 * Validates if the lease expiry date is before the lease start date.
 * Returns an error message string if invalid, or null if valid (or while date is still being typed).
 * Validation only runs once the full date has been typed for both fields.
 */
export function validateLeaseDateRange(startDate?: string | null, validUptoDate?: string | null): string | null {
  if (!startDate || !validUptoDate) return null;

  const cleanStart = String(startDate).trim();
  const cleanUpto = String(validUptoDate).trim();

  // If either date is not yet complete (10 characters), do not display range error while typing
  if (!isDateComplete(cleanStart) || !isDateComplete(cleanUpto)) {
    return null;
  }

  // Check validity of calendar dates
  if (!isDateValid(cleanStart) || !isDateValid(cleanUpto)) {
    return null; // individual format errors are handled separately
  }

  const isoStart = convertDDMMYYYYToISO(cleanStart);
  const isoUpto = convertDDMMYYYYToISO(cleanUpto);
  if (!isoStart || !isoUpto) return null;

  const timeStart = new Date(isoStart).getTime();
  const timeUpto = new Date(isoUpto).getTime();
  if (isNaN(timeStart) || isNaN(timeUpto)) return null;

  if (timeUpto < timeStart) {
    return 'Lease Valid Upto date cannot be earlier than Lease Start Date.';
  }

  return null;
}
