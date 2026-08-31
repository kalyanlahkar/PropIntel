import React from 'react';
import { 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  Building2, 
  Calendar, 
  Camera, 
  ArrowRight 
} from 'lucide-react';
import { PropertyRecord } from '../types';
import { formatDisplayDate, getDaysRemainingFromDate } from '../utils/dateFormatter';

interface ComplianceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: PropertyRecord[];
  onSelectProperty: (property: PropertyRecord) => void;
  onNavigateToCapture: (propertyCode: string) => void;
}

export const ComplianceAlertsModal: React.FC<ComplianceAlertsModalProps> = ({
  isOpen,
  onClose,
  properties,
  onSelectProperty,
  onNavigateToCapture
}) => {
  if (!isOpen) return null;

  // Filter properties with expiring or expired lease validity (< 60 days)
  const alertProperties = properties
    .filter((p) => Boolean(p.leaseValidUpto && p.leaseValidUpto !== '---' && p.leaseValidUpto !== 'N/A'))
    .map((p) => {
      const days = getDaysRemainingFromDate(p.leaseValidUpto);
      return { property: p, daysRemaining: days };
    })
    .filter(({ daysRemaining }) => {
      return daysRemaining <= 60;
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Lease Expiry &amp; Renewal Alerts</h3>
              <p className="text-xs text-slate-400">
                {alertProperties.length} {alertProperties.length === 1 ? 'property requires' : 'properties require'} lease renewal or extension audit.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {alertProperties.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <p className="text-sm font-semibold text-emerald-400">All property leases are currently valid!</p>
              <p className="text-xs">No lease expirations due within the next 60 days.</p>
            </div>
          ) : (
            alertProperties.map(({ property, daysRemaining }) => {
              const isExpired = daysRemaining <= 0;

              return (
                <div
                  key={property.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isExpired
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-amber-950/20 border-amber-500/30'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-[#0d0f14] px-2 py-0.5 rounded border border-slate-800">
                        {property.code}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{property.title}</span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {property.location}, {property.state}
                    </p>

                    <div className="flex items-center space-x-2 text-xs pt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-300">Lease Valid Upto: <strong className="font-mono text-amber-300">{formatDisplayDate(property.leaseValidUpto)}</strong></span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          isExpired
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isExpired ? `EXPIRED ${Math.abs(daysRemaining)} DAYS AGO` : `DUE IN ${daysRemaining} DAYS`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => {
                        onSelectProperty(property);
                        onClose();
                      }}
                      className="text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToCapture(property.code);
                        onClose();
                      }}
                      className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow-lg shadow-indigo-500/20 transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Renewal</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition-colors"
          >
            Close Risk Center
          </button>
        </div>
      </div>
    </div>
  );
};
