import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  Calendar, 
  Building, 
  RefreshCw, 
  AlertCircle, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  Layers,
  Table as TableIcon,
  BarChart3,
  Receipt
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { 
  calculateRentForMonth, 
  getIndianFinancialYearMonths, 
  isMatchingCalendarMonth 
} from '../utils/rentCalculator';
import { PropertyRecord } from '../types';

// Curated professional financial color palette
const DISTINCT_COLORS = [
  '#4f46e5', // Indigo 600
  '#06b6d4', // Cyan 500
  '#10b981', // Emerald 500
  '#f59e0b', // Amber 500
  '#ec4899', // Pink 500
  '#8b5cf6', // Violet 500
  '#3b82f6', // Blue 500
  '#14b8a6', // Teal 500
  '#f97316', // Orange 500
  '#84cc16', // Lime 500
  '#d946ef', // Fuchsia 500
  '#64748b', // Slate 500
  '#e11d48', // Rose 600
  '#0284c7', // Sky 600
  '#059669', // Emerald 600
  '#7c3aed', // Purple 600
];

export function getPropertyHexColor(index: number): string {
  if (index < DISTINCT_COLORS.length) {
    return DISTINCT_COLORS[index];
  }
  const hue = (index * 137.508) % 360;
  return `hsl(${Math.round(hue)}, 70%, 55%)`;
}

export interface SupabasePropertyRow {
  id?: string | number;
  property_code?: string;
  property_title?: string;
  title?: string;
  name?: string;
  location?: string;
  state?: string;
  lease_start_date?: string | null;
  lease_valid_upto?: string | null;
  total_rent?: number | string | null;
  monthlyRent?: number | string | null;
  initialRent?: number | string | null;
  revision_period_years?: number | string | null;
  escalation_percentage?: number | string | null;
  owner_role?: string | null;
  lessor?: string | null;
  lessee?: string | null;
  insurance_validity?: string | null;
  insuranceValidity?: string | null;
  premium_amount?: number | string | null;
  latest_tax_amount?: number | string | null;
  [key: string]: any;
}

interface CashflowProjectionDashboardProps {
  fallbackProperties?: PropertyRecord[];
  onSelectProperty?: (propertyCode: string) => void;
}

export const CashflowProjectionDashboard: React.FC<CashflowProjectionDashboardProps> = ({
  fallbackProperties = [],
  onSelectProperty
}) => {
  const [properties, setProperties] = useState<SupabasePropertyRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('ALL');

  // 1. Fetch properties from Supabase
  const fetchSupabaseProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('properties')
        .select('*');

      if (sbError) {
        console.warn('Supabase fetch returned error, using fallback state:', sbError.message);
        if (fallbackProperties && fallbackProperties.length > 0) {
          // Adapt local fallback records to standard Supabase row shape
          const adapted = fallbackProperties.map((p) => ({
            id: p.id,
            property_code: p.code,
            property_title: p.title || p.propertyTitle || p.property_title || p.code,
            location: p.location,
            state: p.state,
            lease_start_date: p.leaseStartDate,
            lease_valid_upto: p.leaseValidUpto,
            total_rent: p.monthlyRent ?? p.initialRent ?? 0,
            revision_period_years: p.revisionPeriodYears ?? 3,
            escalation_percentage: p.escalationPercentage ?? 10,
            owner_role: p.lessor ? 'Lessor' : (p.lessee ? 'Lessee' : 'Lessor'),
            lessor: p.lessor,
            lessee: p.lessee,
            insurance_validity: p.insuranceValidity,
            insuranceValidity: p.insuranceValidity,
            premium_amount: p.premiumAmount ?? p.premium_amount ?? 0,
            latest_tax_amount: p.latestTaxAmount ?? p.latest_tax_amount ?? 0,
          }));
          setProperties(adapted);
        } else {
          setError(sbError.message);
        }
      } else if (data && data.length > 0) {
        setProperties(data);
      } else if (fallbackProperties && fallbackProperties.length > 0) {
        const adapted = fallbackProperties.map((p) => ({
          id: p.id,
          property_code: p.code,
          property_title: p.title || p.propertyTitle || p.property_title || p.code,
          location: p.location,
          state: p.state,
          lease_start_date: p.leaseStartDate,
          lease_valid_upto: p.leaseValidUpto,
          total_rent: p.monthlyRent ?? p.initialRent ?? 0,
          revision_period_years: p.revisionPeriodYears ?? 3,
          escalation_percentage: p.escalationPercentage ?? 10,
          owner_role: p.lessor ? 'Lessor' : (p.lessee ? 'Lessee' : 'Lessor'),
          lessor: p.lessor,
          lessee: p.lessee,
          insurance_validity: p.insuranceValidity,
          insuranceValidity: p.insuranceValidity,
          premium_amount: p.premiumAmount ?? p.premium_amount ?? 0,
          latest_tax_amount: p.latestTaxAmount ?? p.latest_tax_amount ?? 0,
        }));
        setProperties(adapted);
      } else {
        setProperties([]);
      }
    } catch (err: any) {
      console.error('Error in fetchSupabaseProperties:', err);
      setError(err?.message || 'Failed to load property records from Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupabaseProperties();
  }, []);

  // 2. Determine Indian Financial Year & Generate 12-Month Timeline
  const fyMonths = useMemo(() => {
    return getIndianFinancialYearMonths(new Date());
  }, []);

  const fyLabel = useMemo(() => {
    if (fyMonths.length === 0) return 'FY 2026-27';
    const startYear = fyMonths[0].year;
    const endYear = fyMonths[fyMonths.length - 1].year;
    return `FY ${startYear}-${String(endYear).slice(-2)}`;
  }, [fyMonths]);

  // Extract distinct property titles and assign distinct hex colors
  const { propertyTitles, propertyColorMap, propertyDetailsMap } = useMemo(() => {
    const titles: string[] = [];
    const colorMap: Record<string, string> = {};
    const detailsMap: Record<string, SupabasePropertyRow> = {};

    properties.forEach((prop, idx) => {
      const title = (prop.property_title || prop.title || prop.property_code || `Property ${idx + 1}`).trim();
      if (!titles.includes(title)) {
        titles.push(title);
        colorMap[title] = getPropertyHexColor(idx);
        detailsMap[title] = prop;
      }
    });

    return { propertyTitles: titles, propertyColorMap: colorMap, propertyDetailsMap: detailsMap };
  }, [properties]);

  // 3. Calculate Cashflow Data Aggregation for each month with Lump-Sum Outflows
  const { chartData, monthlyBreakdowns, summaryMetrics } = useMemo(() => {
    if (properties.length === 0) {
      return {
        chartData: [],
        monthlyBreakdowns: {},
        summaryMetrics: {
          totalFyNet: 0,
          avgMonthlyNet: 0,
          totalInflows: 0,
          totalOutflows: 0,
          totalTaxLumpSum: 0,
          totalInsuranceLumpSum: 0,
          maxMonth: null as { month: string; net: number } | null,
          minMonth: null as { month: string; net: number } | null,
          escalatedUnitsCount: 0
        }
      };
    }

    let grandTotalNet = 0;
    let grandTotalInflow = 0;
    let grandTotalOutflow = 0;
    let grandTotalTax = 0;
    let grandTotalInsurance = 0;
    const monthNetList: { month: string; net: number }[] = [];
    const unitsWithMidYearEscalation = new Set<string>();
    const breakdowns: Record<string, Record<string, {
      monthlyRent: number;
      isLessor: boolean;
      rentCashflow: number;
      insuranceOutflow: number;
      taxOutflow: number;
      netCashflow: number;
      isEscalated: boolean;
    }>> = {};

    const aggregated = fyMonths.map(({ month, date, dateObj }) => {
      const monthDate = dateObj || date;
      const monthObj: Record<string, any> = { month };
      breakdowns[month] = {};
      let monthTotalNet = 0;

      properties.forEach((prop, pIdx) => {
        const title = (prop.property_title || prop.title || prop.property_code || `Property ${pIdx + 1}`).trim();

        // Step A: Rent Calculation (Compounding Mid-Year Escalations)
        const monthlyRent = calculateRentForMonth(prop, monthDate);
        const baseRent = Number(prop.total_rent ?? prop.monthlyRent ?? prop.initialRent ?? 0);
        const isEscalated = monthlyRent > baseRent;
        if (isEscalated) {
          unitsWithMidYearEscalation.add(title);
        }

        // Rent Cashflow direction based on owner_role (Lessor vs Lessee)
        const isLessor = prop.owner_role 
          ? String(prop.owner_role).trim().toLowerCase() === 'lessor' 
          : (prop.lessor && !prop.lessee ? true : true);

        const rentCashflow = isLessor ? monthlyRent : -monthlyRent;

        // Step B: Lump-Sum Outflows (Due Month Only, NOT amortized)
        // 1. Insurance Outflow: Deducted only if this calendar month matches the property's insurance_validity month
        let insuranceOutflow = 0;
        const insValidity = prop.insurance_validity || prop.insuranceValidity;
        if (insValidity && isMatchingCalendarMonth(monthDate, insValidity)) {
          insuranceOutflow = Number(prop.premium_amount ?? prop.premiumAmount ?? 0) || 0;
          grandTotalInsurance += insuranceOutflow;
        }

        // 2. Municipality Tax Outflow: Due at the start of the Indian FY (April)
        let taxOutflow = 0;
        // April is month index 3 (0 = Jan, 1 = Feb, 2 = Mar, 3 = Apr)
        if (monthDate.getMonth() === 3) {
          taxOutflow = Number(prop.latest_tax_amount ?? prop.latestTaxAmount ?? 0) || 0;
          grandTotalTax += taxOutflow;
        }

        // Step C: Net Calculation
        const netPropertyMonthlyCashflow = rentCashflow - insuranceOutflow - taxOutflow;

        // Append to month object using property title as key
        monthObj[title] = Math.round(netPropertyMonthlyCashflow);
        monthTotalNet += netPropertyMonthlyCashflow;

        // Itemized detail for rich tooltip and table
        breakdowns[month][title] = {
          monthlyRent,
          isLessor,
          rentCashflow,
          insuranceOutflow,
          taxOutflow,
          netCashflow: netPropertyMonthlyCashflow,
          isEscalated
        };

        if (netPropertyMonthlyCashflow > 0) {
          grandTotalInflow += netPropertyMonthlyCashflow;
        } else {
          grandTotalOutflow += Math.abs(netPropertyMonthlyCashflow);
        }
      });

      monthObj._totalNet = Math.round(monthTotalNet);
      grandTotalNet += monthTotalNet;
      monthNetList.push({ month, net: monthTotalNet });

      return monthObj;
    });

    let maxM = monthNetList[0] || null;
    let minM = monthNetList[0] || null;
    monthNetList.forEach((m) => {
      if (!maxM || m.net > maxM.net) maxM = m;
      if (!minM || m.net < minM.net) minM = m;
    });

    return {
      chartData: aggregated,
      monthlyBreakdowns: breakdowns,
      summaryMetrics: {
        totalFyNet: Math.round(grandTotalNet),
        avgMonthlyNet: Math.round(grandTotalNet / 12),
        totalInflows: Math.round(grandTotalInflow),
        totalOutflows: Math.round(grandTotalOutflow),
        totalTaxLumpSum: Math.round(grandTotalTax),
        totalInsuranceLumpSum: Math.round(grandTotalInsurance),
        maxMonth: maxM,
        minMonth: minM,
        escalatedUnitsCount: unitsWithMidYearEscalation.size
      }
    };
  }, [properties, fyMonths]);

  // Format currency helpers
  const formatCurrency = (val: number) => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 10000000) {
      return `${sign}₹${(absVal / 10000000).toFixed(2)} Cr`;
    }
    if (absVal >= 100000) {
      return `${sign}₹${(absVal / 100000).toFixed(2)} L`;
    }
    if (absVal >= 1000) {
      return `${sign}₹${(absVal / 1000).toFixed(1)}k`;
    }
    return `${sign}₹${absVal.toLocaleString('en-IN')}`;
  };

  const formatCurrencyFull = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Custom Chart Tooltip showing exact financial breakdown per unit
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      let monthTotal = 0;
      const monthDetails = monthlyBreakdowns[label] || {};

      return (
        <div className="bg-[#12151c]/95 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-md text-xs min-w-[280px] max-w-[360px]">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              {label} ({fyLabel})
            </span>
            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">
              Lump-Sum Model
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {payload.map((entry: any, index: number) => {
              const val = Number(entry.value) || 0;
              monthTotal += val;
              const isPositive = val >= 0;
              const detail = monthDetails[entry.name];

              return (
                <div key={`item-${index}`} className="border-b border-slate-800/80 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-slate-200 font-semibold truncate" title={entry.name}>
                        {entry.name}
                      </span>
                    </div>
                    <span className={`font-mono font-bold shrink-0 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {val >= 0 ? '+' : ''}{formatCurrencyFull(val)}
                    </span>
                  </div>

                  {detail && (
                    <div className="pl-4 text-[10px] text-slate-400 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Rent ({detail.isLessor ? 'Lessor Receipt' : 'Lessee Payment'}):</span>
                        <span className={detail.rentCashflow >= 0 ? 'text-slate-300' : 'text-rose-300'}>
                          {detail.rentCashflow >= 0 ? '+' : ''}{formatCurrencyFull(detail.rentCashflow)}
                          {detail.isEscalated && <span className="text-amber-400 ml-1">(Escalated)</span>}
                        </span>
                      </div>
                      {detail.taxOutflow > 0 && (
                        <div className="flex justify-between text-amber-300 font-medium">
                          <span>• April Annual Tax:</span>
                          <span>-{formatCurrencyFull(detail.taxOutflow)}</span>
                        </div>
                      )}
                      {detail.insuranceOutflow > 0 && (
                        <div className="flex justify-between text-sky-300 font-medium">
                          <span>• Insurance Policy Renewal:</span>
                          <span>-{formatCurrencyFull(detail.insuranceOutflow)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-700/60 mt-3 pt-2.5 flex items-center justify-between">
            <span className="font-bold text-slate-200">Portfolio Net Cashflow</span>
            <span className={`font-mono font-bold text-sm ${monthTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {monthTotal >= 0 ? '+' : ''}{formatCurrencyFull(monthTotal)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#12151c] border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-[#161a23] to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Month-by-Month Portfolio Cashflow (Current FY)
                </h3>
                <span className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  {fyLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic compounding rent escalations &amp; lump-sum statutory liabilities (April Tax &amp; Renewal Month Insurance).
              </p>
            </div>
          </div>
        </div>

        {/* View Controls & Refresh */}
        <div className="flex items-center space-x-2 self-end md:self-center">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'chart'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Grouped Bar Chart</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Breakdown Table</span>
            </button>
          </div>

          <button
            onClick={fetchSupabaseProperties}
            disabled={loading}
            title="Reload from Supabase"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 p-5 sm:p-6 bg-slate-950/40 border-b border-slate-800/80">
        {/* Total FY Net */}
        <div className="bg-[#181c24] border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Projected FY Net
            </span>
            <div className={`p-1.5 rounded-lg ${summaryMetrics.totalFyNet >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {summaryMetrics.totalFyNet >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
          </div>
          <h4 className={`text-xl sm:text-2xl font-extrabold mt-1 font-mono ${summaryMetrics.totalFyNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrencyFull(summaryMetrics.totalFyNet)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Net of lump-sum taxes &amp; insurance</p>
        </div>

        {/* Avg Monthly Net */}
        <div className="bg-[#181c24] border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Average Monthly Cashflow
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-xl sm:text-2xl font-extrabold text-white mt-1 font-mono">
            {formatCurrencyFull(summaryMetrics.avgMonthlyNet)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Across 12 FY months</p>
        </div>

        {/* Lump-Sum Statutory Outflows */}
        <div className="bg-[#181c24] border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              FY Statutory Lump-Sums
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-1 font-mono">
            {formatCurrencyFull(summaryMetrics.totalTaxLumpSum + summaryMetrics.totalInsuranceLumpSum)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Tax (Apr): {formatCurrency(summaryMetrics.totalTaxLumpSum)} | Ins: {formatCurrency(summaryMetrics.totalInsuranceLumpSum)}
          </p>
        </div>

        {/* Units with Active Escalation */}
        <div className="bg-[#181c24] border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Portfolio Units
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <h4 className="text-xl sm:text-2xl font-extrabold text-white">
              {properties.length} Units
            </h4>
            {summaryMetrics.escalatedUnitsCount > 0 && (
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-md">
                {summaryMetrics.escalatedUnitsCount} Escalated
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {summaryMetrics.maxMonth ? `Peak Month: ${summaryMetrics.maxMonth.month}` : 'Tracking active leases'}
          </p>
        </div>
      </div>

      {/* Main Content Area: Loading / Error / Chart / Table */}
      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="h-80 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-300">Fetching property records from Supabase...</p>
            <p className="text-xs text-slate-500">Calculating dynamic compounded escalations and lump-sum outflows...</p>
          </div>
        ) : error && properties.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center space-y-3 bg-rose-950/20 border border-rose-800/40 rounded-xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <h4 className="text-base font-bold text-rose-200">Unable to load Supabase records</h4>
            <p className="text-xs text-rose-300/80 max-w-md">{error}</p>
            <button
              onClick={fetchSupabaseProperties}
              className="mt-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              Retry Connection
            </button>
          </div>
        ) : properties.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center space-y-3 text-center">
            <Building className="w-10 h-10 text-slate-600" />
            <h4 className="text-base font-bold text-slate-300">No properties in portfolio</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Add property lease deeds to automatically project dynamic monthly cashflows.
            </p>
          </div>
        ) : viewMode === 'chart' ? (
          <div className="space-y-4">
            {/* Chart Canvas */}
            <div className="h-[400px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
                  barCategoryGap="24%"
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    dy={8}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }} 
                    formatter={(val) => (
                      <span className="text-xs font-medium text-slate-300 hover:text-white transition-colors">
                        {val}
                      </span>
                    )}
                  />
                  {/* Zero Baseline Divider as requested */}
                  <ReferenceLine y={0} stroke="#475569" strokeWidth={1} strokeDasharray="2 2" />

                  {/* Dynamically generated distinct vertical bars grouped per month */}
                  {propertyTitles.map((title) => (
                    <Bar
                      key={title}
                      dataKey={title}
                      fill={propertyColorMap[title] || '#6366f1'}
                      name={title}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory Footer Callout */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-start space-x-3">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-400 leading-relaxed">
                <span className="text-slate-200 font-semibold">Lump-Sum Accounting Model:</span> Rent dynamically recalculates monthly to reflect compounding escalations (<code className="text-indigo-300 font-mono">base * (1 + rate)^n</code>). Statutory liabilities are deducted as one-time lump sums in their specific due months: <span className="text-amber-300 font-medium">Municipal Tax in April (FY kickoff)</span> and <span className="text-sky-300 font-medium">Insurance Premium in the specific policy validity renewal month</span>, rather than being amortized.
              </div>
            </div>
          </div>
        ) : (
          /* Detailed Breakdown Table View */
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold sticky left-0 bg-slate-900 z-10">Financial Month</th>
                  {propertyTitles.map((title) => (
                    <th key={title} className="py-3 px-4 font-semibold whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full inline-block" 
                          style={{ backgroundColor: propertyColorMap[title] }}
                        />
                        <span>{title}</span>
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-4 font-bold text-right text-indigo-300">Portfolio Total Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {chartData.map((row) => {
                  const isPositive = (row._totalNet || 0) >= 0;
                  const monthDetail = monthlyBreakdowns[row.month] || {};

                  return (
                    <tr key={row.month} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-white sticky left-0 bg-[#12151c] z-10 border-r border-slate-800/80">
                        <div className="flex items-center space-x-1.5">
                          <span>{row.month}</span>
                          {row.month.startsWith('Apr') && (
                            <span className="text-[9px] font-sans px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-medium">
                              Tax Month
                            </span>
                          )}
                        </div>
                      </td>
                      {propertyTitles.map((title) => {
                        const val = row[title] || 0;
                        const d = monthDetail[title];
                        return (
                          <td key={title} className="py-3 px-4 whitespace-nowrap">
                            <div className={`font-semibold ${val >= 0 ? 'text-slate-200' : 'text-rose-400'}`}>
                              {val >= 0 ? '+' : ''}{formatCurrencyFull(val)}
                            </div>
                            {d && (d.taxOutflow > 0 || d.insuranceOutflow > 0) && (
                              <div className="text-[9px] text-slate-400 font-sans mt-0.5">
                                {d.taxOutflow > 0 && <span className="text-amber-400 mr-1">Tax -{formatCurrency(d.taxOutflow)}</span>}
                                {d.insuranceOutflow > 0 && <span className="text-sky-400">Ins -{formatCurrency(d.insuranceOutflow)}</span>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{formatCurrencyFull(row._totalNet || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900/90 font-bold border-t-2 border-slate-700">
                  <td className="py-3 px-4 font-sans text-white sticky left-0 bg-slate-900 z-10">
                    FY Total
                  </td>
                  {propertyTitles.map((title) => {
                    const colTotal = chartData.reduce((acc, row) => acc + (row[title] || 0), 0);
                    return (
                      <td key={title} className={`py-3 px-4 font-mono ${colTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {colTotal >= 0 ? '+' : ''}{formatCurrencyFull(colTotal)}
                      </td>
                    );
                  })}
                  <td className={`py-3 px-4 text-right font-mono text-sm ${summaryMetrics.totalFyNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summaryMetrics.totalFyNet >= 0 ? '+' : ''}{formatCurrencyFull(summaryMetrics.totalFyNet)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
