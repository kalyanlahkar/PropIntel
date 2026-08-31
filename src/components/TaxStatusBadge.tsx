import React from 'react';
import { isTaxOverdue, getCurrentFinancialYear, normalizeFinancialYear } from '../utils/taxCalculator';
import { AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';

interface TaxStatusBadgeProps {
  lastPaidFY?: string | null;
  className?: string;
  showCurrentFYNote?: boolean;
}

export const TaxStatusBadge: React.FC<TaxStatusBadgeProps> = ({
  lastPaidFY,
  className = '',
  showCurrentFYNote = false,
}) => {
  const overdue = isTaxOverdue(lastPaidFY);
  const normalizedFY = normalizeFinancialYear(lastPaidFY);
  const currentFY = getCurrentFinancialYear();

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {overdue ? (
        <span
          id="badge-tax-overdue"
          className="inline-flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm shadow-rose-950/20"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Tax Overdue</span>
        </span>
      ) : (
        <span
          id="badge-tax-uptodate"
          className="inline-flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm shadow-emerald-950/20"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tax Up to Date</span>
        </span>
      )}

      {showCurrentFYNote && (
        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
          <Calendar className="w-3 h-3 text-slate-500" />
          <span>Current Active FY: {currentFY}</span>
        </span>
      )}
    </div>
  );
};
