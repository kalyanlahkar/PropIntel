import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  AlertTriangle, 
  FileText, 
  MapPin, 
  Plus, 
  Camera, 
  Eye, 
  Trash2,
  Calendar,
  ArrowUpDown,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PropertyRecord, INDIAN_AND_US_STATES } from '../types';
import { getDaysRemainingFromDate } from '../utils/dateFormatter';
import { CashflowProjectionDashboard } from './CashflowProjectionDashboard';

interface DashboardProps {
  properties: PropertyRecord[];
  onSelectProperty: (property: PropertyRecord) => void;
  onNavigateToAdd: () => void;
  onNavigateToCapture: (propertyCode?: string) => void;
  onDeleteProperty: (id: string) => void;
  onOpenAlertsModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  properties,
  onSelectProperty,
  onNavigateToAdd,
  onNavigateToCapture,
  onDeleteProperty,
  onOpenAlertsModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedDocType, setSelectedDocType] = useState<string>('All');
  const [sortField, setSortField] = useState<'code' | 'title' | 'documents'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCashflow, setShowCashflow] = useState(false);

  // Filtered & Sorted Properties
  const filteredProperties = useMemo(() => {
    return properties
      .filter((p) => {
        const matchesSearch =
          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.ownerOrLessee && p.ownerOrLessee.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesState = selectedState === 'All' || p.state === selectedState;
        const matchesDocType =
          selectedDocType === 'All' ||
          (p.documents && p.documents.some((d) => d.documentType === selectedDocType));

        return matchesSearch && matchesState && matchesDocType;
      })
      .sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];

        if (sortField === 'documents') {
          aVal = a.documents ? a.documents.length : 0;
          bVal = b.documents ? b.documents.length : 0;
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [properties, searchTerm, selectedState, selectedDocType, sortField, sortOrder]);

  // Expiring lease alerts (< 60 days)
  const expiringAlerts = useMemo(() => {
    return properties.filter(p => {
      if (!p.leaseValidUpto || p.leaseValidUpto === '---') return false;
      const days = getDaysRemainingFromDate(p.leaseValidUpto);
      if (days === 999999) return false;
      return days <= 60;
    });
  }, [properties]);

  const toggleSort = (field: 'code' | 'title' | 'documents') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Expiring Lease Alerts */}
      {expiringAlerts.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-amber-200">
                    {expiringAlerts.length} Lease Renewal Alert{expiringAlerts.length > 1 ? 's' : ''} Requiring Action
                  </h3>
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Urgent &lt;60 Days
                  </span>
                </div>
                <p className="text-xs text-amber-300/80 mt-1">
                  Properties with upcoming lease validity expiry require audit or renewal agreement review.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenAlertsModal}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap self-end sm:self-center"
            >
              Review Renewals
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Properties */}
        <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Properties Managed</p>
            <h4 className="text-2xl font-extrabold text-white mt-1">{properties.length}</h4>
            <p className="text-[11px] text-slate-500 mt-1">Across {new Set(properties.map(p => p.state)).size} States</p>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Active Leases */}
        <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Leases</p>
            <h4 className="text-2xl font-extrabold text-white mt-1">
              {properties.filter(p => p.leaseValidUpto).length}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              {expiringAlerts.length > 0 ? `${expiringAlerts.length} expiring soon` : 'All renewals up to date'}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Stored Documents */}
        <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attached Documents</p>
            <h4 className="text-2xl font-extrabold text-white mt-1">
              {properties.reduce((acc, p) => acc + (p.documents?.length || 0), 0)}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">In Property Documents Archive</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FY Cashflow Projections Toggle Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1a1d23]/90 border border-slate-800 rounded-2xl p-4 sm:px-5 sm:py-3.5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Financial Projections &amp; Cashflow Analytics
              {showCashflow && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-normal">
                  Active
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              Compounded mid-year rent escalations &amp; April tax / renewal insurance lump-sum outflows.
            </p>
          </div>
        </div>

        <button
          id="btn-toggle-fy-cashflow"
          type="button"
          onClick={() => setShowCashflow((prev) => !prev)}
          className={`flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-md active:scale-95 whitespace-nowrap self-stretch sm:self-auto justify-center ${
            showCashflow
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 ring-1 ring-indigo-500/40'
          }`}
        >
          {showCashflow ? (
            <>
              <ChevronUp className="w-4 h-4 text-slate-400" />
              <span>Hide Cashflow Projections</span>
            </>
          ) : (
            <>
              <span>📈 Show FY Cashflow Projections</span>
              <ChevronDown className="w-4 h-4 text-indigo-200" />
            </>
          )}
        </button>
      </div>

      {/* Conditionally Rendered Month-by-Month FY Cashflow Projection Dashboard */}
      {showCashflow && (
        <CashflowProjectionDashboard 
          fallbackProperties={properties}
          onSelectProperty={(code) => {
            const found = properties.find(p => p.code.toLowerCase() === code.toLowerCase());
            if (found) onSelectProperty(found);
          }}
        />
      )}

      {/* Main Filter & Table Card */}
      <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Controls Header */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Code (e.g. PROP-101), Title, Location, or Tenant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0d0f14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onNavigateToAdd}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Property</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
          {/* Filter State */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-[#0d0f14] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All States</option>
              {INDIAN_AND_US_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Filter Document Type */}
          <div className="flex items-center space-x-2">
            <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full bg-[#0d0f14] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Document Types</option>
              <option value="Lease Deed">Lease Deed</option>
              <option value="Encumbrance Certificate">Encumbrance Certificate</option>
              <option value="Trade License">Trade License</option>
              <option value="Insurance">Insurance</option>
              <option value="Sale Deed">Sale Deed</option>
            </select>
          </div>
        </div>

        {/* Properties Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#0d0f14] text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th 
                  onClick={() => toggleSort('code')}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Prop Code</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('title')}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Property &amp; Location</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('documents')}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Documents Uploaded</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#1a1d23]">
              {filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-sm font-medium text-slate-400">No properties found</p>
                      <p className="text-xs">Try adjusting your search terms or filters above.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProperties.map((prop) => {
                  return (
                    <tr 
                      key={prop.id}
                      className="hover:bg-[#0d0f14]/60 transition-colors group"
                    >
                      {/* Property Code */}
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-indigo-400 whitespace-nowrap">
                        {prop.code}
                      </td>

                      {/* Title & Location */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div 
                            onClick={() => onSelectProperty(prop)}
                            className="font-semibold text-slate-100 group-hover:text-indigo-400 cursor-pointer transition-colors"
                          >
                            {prop.title}
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate max-w-xs">{prop.location}, {prop.state}</span>
                          </div>
                        </div>
                      </td>

                      {/* Documents Uploaded (Fetching all document_type for that property_code from database) */}
                      <td className="py-3.5 px-4">
                        {prop.documents && prop.documents.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {prop.documents.map((doc, idx) => {
                              const type = doc.documentType || 'Lease Deed';
                              let badgeStyle = "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
                              if (type === 'Insurance') {
                                badgeStyle = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                              } else if (type === 'Trade License') {
                                badgeStyle = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                              } else if (type === 'Encumbrance Certificate') {
                                badgeStyle = "bg-sky-500/15 text-sky-300 border-sky-500/30";
                              } else if (type === 'Sale Deed') {
                                badgeStyle = "bg-purple-500/15 text-purple-300 border-purple-500/30";
                              }

                              return (
                                <span 
                                  key={doc.id || idx}
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${badgeStyle}`}
                                  title={`Uploaded: ${doc.uploadDate || 'Verified'}`}
                                >
                                  {type}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-slate-500 bg-slate-800/40 border border-slate-700/40">
                            No documents uploaded
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onSelectProperty(prop)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                            title="View Property Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onNavigateToCapture(prop.code)}
                            className="p-1.5 bg-indigo-900/50 hover:bg-indigo-800 text-indigo-300 hover:text-white rounded-lg transition-colors border border-indigo-700/50"
                            title="Attach New Document via OCR"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProperty(prop.code || prop.id);
                            }}
                            className="p-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-400 hover:text-rose-200 rounded-lg transition-colors border border-rose-800/40 cursor-pointer"
                            title={`Delete Property Record ${prop.code}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span>Showing {filteredProperties.length} of {properties.length} property records</span>
          <span className="hidden sm:inline">Use OCR Capture to automatically extract terms from new documents</span>
        </div>
      </div>
    </div>
  );
};
