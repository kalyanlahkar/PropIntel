import { convertDDMMYYYYToISO } from './dateFormatter';

/**
 * Dynamic Rent Calculation Utility
 * Calculates the monthly rent for a property at a specific target date,
 * accurately reflecting rent escalations triggering mid-year.
 *
 * @param {object} property - The property record containing lease_start_date, total_rent, revision_period_years, escalation_percentage
 * @param {Date} targetDate - The JS Date representing the month being calculated
 * @returns {number} The calculated monthly rent with compounding escalations
 */
export function calculateRentForMonth(
  property: {
    lease_start_date?: string | null;
    leaseStartDate?: string | null;
    startDate?: string | null;
    total_rent?: number | string | null;
    monthlyRent?: number | string | null;
    initialRent?: number | string | null;
    revision_period_years?: number | string | null;
    revisionPeriodYears?: number | string | null;
    escalation_percentage?: number | string | null;
    escalationPercentage?: number | string | null;
    [key: string]: any;
  },
  targetDate: Date
): number {
  // Base rent extraction
  const rawBase = property.total_rent ?? property.monthlyRent ?? property.initialRent ?? 0;
  const baseRent = typeof rawBase === 'number' ? rawBase : (parseFloat(String(rawBase).replace(/[^0-9.]/g, '')) || 0);

  const rawStart = property.lease_start_date || property.leaseStartDate || property.startDate;
  if (!rawStart || baseRent <= 0) {
    return baseRent;
  }

  const isoDate = convertDDMMYYYYToISO(rawStart) || rawStart;
  const start = new Date(isoDate);
  if (isNaN(start.getTime())) {
    return baseRent;
  }

  // 1. Calculate monthsElapsed between property.lease_start_date and targetDate
  const monthsElapsed = (targetDate.getFullYear() - start.getFullYear()) * 12 + 
                        (targetDate.getMonth() - start.getMonth());

  // 2. If monthsElapsed < 0, return property.total_rent (base rent)
  if (monthsElapsed < 0) {
    return baseRent;
  }

  const rawRev = property.revision_period_years ?? property.revisionPeriodYears ?? 0;
  const revisionPeriodYears = typeof rawRev === 'number' ? rawRev : (parseFloat(String(rawRev).replace(/[^0-9.]/g, '')) || 0);

  const rawEsc = property.escalation_percentage ?? property.escalationPercentage ?? 0;
  const escalationPercentage = typeof rawEsc === 'number' ? rawEsc : (parseFloat(String(rawEsc).replace(/[^0-9.]/g, '')) || 0);

  if (revisionPeriodYears <= 0 || escalationPercentage <= 0) {
    return baseRent;
  }

  // 3. Calculate n (number of escalations triggered)
  const revisionMonths = revisionPeriodYears * 12;
  const n = Math.floor(monthsElapsed / revisionMonths);

  // 4. Return compounded rent: property.total_rent * Math.pow((1 + (property.escalation_percentage / 100)), n)
  const compoundedRent = baseRent * Math.pow(1 + (escalationPercentage / 100), Math.max(0, n));
  return Math.round(compoundedRent * 100) / 100;
}

/**
 * Checks if a date string/object matches the target month's calendar month (0-11).
 * Handles DD-MM-YYYY, YYYY-MM-DD, ISO timestamps, and Date objects.
 */
export function isMatchingCalendarMonth(targetMonthDate: Date, dateInput?: string | Date | null): boolean {
  if (!dateInput) return false;
  if (dateInput instanceof Date) {
    return !isNaN(dateInput.getTime()) && dateInput.getMonth() === targetMonthDate.getMonth();
  }
  const str = String(dateInput).trim();
  if (!str || str === 'null' || str === 'undefined' || str === '---' || str === 'N/A') {
    return false;
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const monthNum = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    return monthNum === targetMonthDate.getMonth();
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const monthNum = parseInt(ymdMatch[2], 10) - 1; // 0-indexed
    return monthNum === targetMonthDate.getMonth();
  }

  // ISO or general string parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.getMonth() === targetMonthDate.getMonth();
  }

  return false;
}

/**
 * Generates the 12-month array for the Indian Financial Year (April 1st to March 31st).
 * E.g., for August 2026, returns Apr '26 through Mar '27.
 */
export function getIndianFinancialYearMonths(referenceDate: Date = new Date()): { 
  month: string; 
  date: Date; 
  dateObj: Date; 
  year: number; 
  monthIndex: number;
}[] {
  const currentMonth = referenceDate.getMonth(); // 0 = Jan, 3 = Apr, 7 = Aug
  const currentYear = referenceDate.getFullYear();

  // If currentMonth is Jan (0), Feb (1), or Mar (2), FY began in April of previous year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const result: { month: string; date: Date; dateObj: Date; year: number; monthIndex: number }[] = [];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12;
    const year = i < 9 ? fyStartYear : fyStartYear + 1;
    const shortYear = String(year).slice(-2);
    const monthLabel = `${monthNames[monthIndex]} '${shortYear}`;
    const date = new Date(year, monthIndex, 1);
    result.push({
      month: monthLabel,
      date,
      dateObj: date,
      year,
      monthIndex
    });
  }

  return result;
}

/**
 * Calculates current rent for the current date.
 */
export function calculateCurrentRent(
  startDate?: string | null,
  initialRent?: number | null,
  escalationPercent?: number | null,
  revisionPeriodYears?: number | null
): number {
  return calculateRentForMonth({
    lease_start_date: startDate,
    total_rent: initialRent,
    revision_period_years: revisionPeriodYears,
    escalation_percentage: escalationPercent
  }, new Date());
}

