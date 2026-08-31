import React, { useState } from 'react';
import { 
  Building2, 
  ArrowLeft, 
  AlertCircle, 
  MapPin, 
  ShieldCheck,
  Home,
  Key
} from 'lucide-react';
import { PropertyRecord, INDIAN_AND_US_STATES } from '../types';
import { formatDateToDDMMYYYY } from '../utils/dateFormatter';

interface AddPropertyViewProps {
  existingProperties: PropertyRecord[];
  onAddProperty: (newProperty: PropertyRecord) => void;
  onCancel: () => void;
}

export const AddPropertyView: React.FC<AddPropertyViewProps> = ({
  existingProperties,
  onAddProperty,
  onCancel
}) => {
  const [propertyTitle, setPropertyTitle] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [state, setState] = useState<string>(INDIAN_AND_US_STATES[0]);
  const [propertyStatus, setPropertyStatus] = useState<'Owned' | 'Rented'>('Owned');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form Validation Rules
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // 1. Property Title Validation (Mandatory top field)
    const cleanTitle = propertyTitle.trim();
    if (!cleanTitle) {
      newErrors.propertyTitle = 'Please enter a Property Title to name this property.';
    }

    // 2. Property Code Validation
    const cleanCode = code.trim();
    if (!cleanCode) {
      newErrors.code = 'Property Code is required.';
    } else if (!/^[a-zA-Z0-9-]+$/.test(cleanCode)) {
      newErrors.code = 'Property Code must be alphanumeric only (hyphens allowed), no spaces or special characters.';
    } else if (cleanCode.length > 20) {
      newErrors.code = 'Property Code maximum length is 20 characters.';
    } else if (existingProperties.some((p) => p.code.toLowerCase() === cleanCode.toLowerCase())) {
      newErrors.code = `Property Code "${cleanCode}" already exists. Must be strictly unique.`;
    }

    // 3. Location Validation (Min 3, Max 150)
    const cleanLocation = location.trim();
    if (!cleanLocation) {
      newErrors.location = 'Location / Address is required.';
    } else if (cleanLocation.length < 3) {
      newErrors.location = 'Location must be at least 3 characters long.';
    } else if (cleanLocation.length > 150) {
      newErrors.location = 'Location cannot exceed 150 characters.';
    }

    // 4. Property Status Validation
    if (!propertyStatus) {
      newErrors.propertyStatus = 'Please select a Property Status (Owned or Rented).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Map 'Owned' -> 'Lessor' and 'Rented' -> 'Lessee'
    const mappedOwnerRole: 'Lessor' | 'Lessee' = propertyStatus === 'Owned' ? 'Lessor' : 'Lessee';

    const newProp: PropertyRecord = {
      id: `prop-${Date.now()}`,
      code: code.trim().toUpperCase(),
      title: propertyTitle.trim(),
      propertyTitle: propertyTitle.trim(),
      property_title: propertyTitle.trim(),
      location: location.trim(),
      state,
      ownerRole: mappedOwnerRole,
      owner_role: mappedOwnerRole,
      ownerOrLessee: mappedOwnerRole,
      createdDate: formatDateToDDMMYYYY(new Date()),
      documents: [],
    };

    onAddProperty(newProp);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700/60 px-3 py-1 rounded-full font-mono">
          Parent Entity Creation
        </span>
      </div>

      <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create New Property Record</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Define the parent property entity before attaching OCR-captured documents or contracts.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1 (TOP): Property Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Property Title / Building Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              id="input-property-title"
              placeholder="e.g., Skyline Technology Park - Suite 304"
              value={propertyTitle}
              onChange={(e) => {
                setPropertyTitle(e.target.value);
                if (errors.propertyTitle) setErrors((prev) => ({ ...prev, propertyTitle: '' }));
              }}
              className={`w-full bg-[#0d0f14] border text-xs rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none transition-colors ${
                errors.propertyTitle ? 'border-rose-500/80 focus:border-rose-400 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
            {errors.propertyTitle ? (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {errors.propertyTitle}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">Please specify a clear, identifying name for this property.</p>
            )}
          </div>

          {/* Section 2: Property Status (Owned vs Rented) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Property Status <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Owned */}
              <label 
                id="label-status-owned"
                className={`relative flex items-center p-3.5 rounded-xl border cursor-pointer transition-all ${
                  propertyStatus === 'Owned'
                    ? 'bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500/50 shadow-md'
                    : 'bg-[#0d0f14] border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="propertyStatus"
                  id="radio-property-status-owned"
                  value="Owned"
                  checked={propertyStatus === 'Owned'}
                  onChange={() => {
                    setPropertyStatus('Owned');
                    if (errors.propertyStatus) setErrors((prev) => ({ ...prev, propertyStatus: '' }));
                  }}
                  className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 focus:ring-2 mr-3"
                />
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${propertyStatus === 'Owned' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Owned</span>
                    <span className="text-[11px] text-slate-400 block">Owner / Lessor entity (Inflow / Rent Receipt)</span>
                  </div>
                </div>
              </label>

              {/* Option 2: Rented */}
              <label 
                id="label-status-rented"
                className={`relative flex items-center p-3.5 rounded-xl border cursor-pointer transition-all ${
                  propertyStatus === 'Rented'
                    ? 'bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500/50 shadow-md'
                    : 'bg-[#0d0f14] border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="propertyStatus"
                  id="radio-property-status-rented"
                  value="Rented"
                  checked={propertyStatus === 'Rented'}
                  onChange={() => {
                    setPropertyStatus('Rented');
                    if (errors.propertyStatus) setErrors((prev) => ({ ...prev, propertyStatus: '' }));
                  }}
                  className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 focus:ring-2 mr-3"
                />
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${propertyStatus === 'Rented' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Rented</span>
                    <span className="text-[11px] text-slate-400 block">Tenant / Lessee entity (Outflow / Rent Payment)</span>
                  </div>
                </div>
              </label>
            </div>
            {errors.propertyStatus && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {errors.propertyStatus}
              </p>
            )}
          </div>

          {/* Section 3: Property Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Property Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              id="input-property-code"
              placeholder="e.g., PROP-MUM-105"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/\s+/g, ''));
                if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
              }}
              maxLength={20}
              className={`w-full bg-[#0d0f14] border text-xs rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none transition-colors ${
                errors.code ? 'border-rose-500/80 focus:border-rose-400 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
            {errors.code ? (
              <p className="text-xs text-rose-400 mt-1 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {errors.code}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">Alphanumeric, max 20 chars, strictly unique.</p>
            )}
          </div>

          {/* Section 3: Location & State */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Location / Street Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  id="input-property-location"
                  placeholder="e.g., BKC Bandra East, Mumbai"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (errors.location) setErrors((prev) => ({ ...prev, location: '' }));
                  }}
                  maxLength={150}
                  className={`w-full bg-[#0d0f14] border text-xs rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none transition-colors ${
                    errors.location ? 'border-rose-500/80 focus:border-rose-400 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.location && (
                <p className="text-xs text-rose-400 mt-1 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  {errors.location}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                State / Region <span className="text-rose-400">*</span>
              </label>
              <select
                id="select-property-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-[#0d0f14] border border-slate-800 text-xs rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              >
                {INDIAN_AND_US_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              id="btn-cancel-add-property"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-add-property"
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Create Property Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
