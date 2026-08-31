import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { extractDocumentData, ExtractedDocumentMetrics } from '../services/geminiExtractionService';
import { DateInputField } from './DateInputField';
import { convertDDMMYYYYToISO, formatDateToDDMMYYYY, validateLeaseDateRange } from '../utils/dateFormatter';
import { TaxStatusBadge } from './TaxStatusBadge';
import { normalizeFinancialYear } from '../utils/taxCalculator';
import {
  Upload,
  Loader2,
  CheckCircle2,
  FileText,
  Camera,
  Sparkles,
  AlertCircle,
  Building2,
  FileCheck,
  RefreshCw,
  Database,
  Layers,
  ChevronDown,
  Clock
} from 'lucide-react';

export type AllowedDocumentType = 'Lease Deed' | 'Insurance' | 'Trade License' | 'Municipality Tax';

interface DocumentUploaderProps {
  propertyCode: string;
  onUploadComplete?: (publicUrl: string, filePath: string, extractedMetrics?: ExtractedDocumentMetrics) => void;
}

export default function DocumentUploader({ propertyCode, onUploadComplete }: DocumentUploaderProps) {
  // Document Type Selection (Required before file upload becomes active)
  const [documentType, setDocumentType] = useState<AllowedDocumentType | ''>('');

  // Upload State
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSeconds, setExtractionSeconds] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedDocumentMetrics | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Live timer effect during AI extraction
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExtracting) {
      setExtractionSeconds(0);
      interval = setInterval(() => {
        setExtractionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setExtractionSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExtracting]);

  /**
   * Performs TWO database operations:
   * 1. INSERT into 'property_documents': { property_code, document_type, file_url }
   * 2. Targeted UPDATE on 'properties' table based on selected documentType
   */
  async function saveToDatabase() {
    if (!extractedData) {
      alert("No extracted data available to save.");
      return;
    }

    if (!documentType) {
      alert("Please select a document type before saving.");
      return;
    }

    if (!imageUrl) {
      alert("No document file URL available to save.");
      return;
    }

    if (documentType === 'Lease Deed' && extractedData.leaseStartDate && extractedData.leaseValidUpto) {
      const rangeError = validateLeaseDateRange(extractedData.leaseStartDate, extractedData.leaseValidUpto);
      if (rangeError) {
        alert(`Validation Error: ${rangeError}`);
        return;
      }
    }

    try {
      setIsSaving(true);
      setSaveSuccessMessage(null);

      // Operation 1: Save the File Record into 'property_documents'
      const { error: docInsertError } = await supabase
        .from('property_documents')
        .insert([
          {
            property_code: propertyCode,
            document_type: documentType,
            file_url: imageUrl
          }
        ]);

      if (docInsertError) {
        console.error('Error inserting into property_documents:', docInsertError);
        throw new Error(`Failed to save document record: ${docInsertError.message}`);
      }

      // Operation 2: Targeted Property Update based strictly on documentType
      let updatePayload: Record<string, any> = {};

      if (documentType === 'Lease Deed') {
        updatePayload = {
          carpet_area: extractedData.carpetArea,
          total_rent: extractedData.totalRent,
          rent_per_sq_ft: extractedData.rentPerSqFt,
          lease_start_date: convertDDMMYYYYToISO(extractedData.leaseStartDate),
          lease_valid_upto: convertDDMMYYYYToISO(extractedData.leaseValidUpto),
          escalation_percentage: extractedData.escalationPercentage,
          revision_period_years: extractedData.revisionPeriodYears,
          lessee: extractedData.lessee,
          lessor: extractedData.lessor
        };
      } else if (documentType === 'Insurance') {
        updatePayload = {
          policy_no: extractedData.policyNo ?? extractedData.policyNumber ?? null,
          sum_insured: extractedData.sumInsured !== null && extractedData.sumInsured !== undefined ? extractedData.sumInsured : null,
          premium_amount: extractedData.premiumAmount !== null && extractedData.premiumAmount !== undefined ? extractedData.premiumAmount : null,
          insurance_validity: convertDDMMYYYYToISO(extractedData.insuranceValidity)
        };
      } else if (documentType === 'Trade License') {
        updatePayload = {
          trade_license_validity: convertDDMMYYYYToISO(extractedData.tradeLicenseValidity)
        };
      } else if (documentType === 'Municipality Tax') {
        updatePayload = {
          holding_number: extractedData.holdingNumber ?? null,
          latest_tax_financial_year: extractedData.taxFinancialYear ?? null,
          latest_tax_amount: extractedData.taxPaidAmount !== null && extractedData.taxPaidAmount !== undefined ? extractedData.taxPaidAmount : null
        };
      }

      const { error: propUpdateError } = await supabase
        .from('properties')
        .update(updatePayload)
        .eq('property_code', propertyCode);

      if (propUpdateError) {
        console.error('Error updating properties table:', propUpdateError);
        throw new Error(`Failed to update property details: ${propUpdateError.message}`);
      }

      // If both operations succeed
      const savedDocType = documentType;
      const successMsg = `Document (${savedDocType}) saved to property_documents and property details successfully updated!`;
      setSaveSuccessMessage(successMsg);
      alert(successMsg);

      if (onUploadComplete && imageUrl && uploadedPath) {
        onUploadComplete(imageUrl, uploadedPath, {
          ...extractedData,
          documentType: savedDocType
        });
      }

      // Clear the form state after successful save
      setExtractedData(null);
      setImageUrl(null);
      setUploadedPath(null);
      setDocumentType('');
      setIsApproved(false);
      setExtractionError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Error in saveToDatabase:', error);
      alert(`Database Save Error: ${error?.message || 'Unknown error occurred while saving to Supabase.'}`);
    } finally {
      setIsSaving(false);
    }
  }

  const triggerExtraction = async (publicUrl: string, directBase64?: string) => {
    setIsExtracting(true);
    setExtractionError(null);

    try {
      // Call dedicated extraction service function with direct base64 fallback
      const data = await extractDocumentData(publicUrl, propertyCode, directBase64);
      setExtractedData(data);
      if (data.warningMessage && !data.extractedSuccessfully) {
        setExtractionError(data.warningMessage);
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      setExtractionError(err?.message || 'Failed to extract AI document metrics.');
    } finally {
      setIsExtracting(false);
    }
  };

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!documentType) {
        alert('Please select a Document Type before uploading a file.');
        if (event.target) event.target.value = '';
        return;
      }

      setUploading(true);
      setExtractedData(null);
      setExtractionError(null);
      setIsApproved(false);
      setSaveSuccessMessage(null);

      // 1. Get the file from the input
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image or document to upload.');
      }
      const file = event.target.files[0];

      // Read local file as Data URL immediately for instant reliable AI extraction
      const localDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file locally.'));
        reader.readAsDataURL(file);
      });

      // 2. Create a unique file name with sanitized doc type prefix
      const fileExt = file.name.split('.').pop() || 'jpg';
      const docTypePrefix = documentType.replace(/\s+/g, '-').toLowerCase();
      const fileName = `${propertyCode || 'PROPERTY'}-${docTypePrefix}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 3. Upload the file to the 'property-documents' bucket
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(filePath, file, { upsert: true });

      let publicUrl = localDataUrl;

      if (uploadError) {
        console.warn('Supabase storage upload notice (using local data URL fallback):', uploadError.message);
        setImageUrl(publicUrl);
        setUploadedPath(filePath);
      } else {
        // 4. Get the public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from('property-documents')
          .getPublicUrl(filePath);

        publicUrl = publicUrlData.publicUrl || localDataUrl;
        setImageUrl(publicUrl);
        setUploadedPath(filePath);
      }

      // Trigger automatic AI extraction pipeline immediately with direct base64
      await triggerExtraction(publicUrl, localDataUrl);

    } catch (error: any) {
      console.error('Error uploading image:', error.message || error);
      setExtractionError(error.message || 'Error uploading document to Supabase storage.');
    } finally {
      setUploading(false);
    }
  };

  const handleFieldChange = (field: keyof ExtractedDocumentMetrics, value: any) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      [field]: value === '' ? null : value
    });
  };

  const isUploadDisabled = !documentType || uploading || isExtracting || isSaving;

  return (
    <div className="bg-[#14171d] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Upload className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Upload Document for Property:</span>
              <span className="text-indigo-400 font-mono px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
                {propertyCode || 'PROP-MUM-101'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Select document type, upload document file to Supabase &amp; update property records.
            </p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center space-x-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Step 1: Document Type Select Dropdown (Required) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Document Type</span>
            <span className="text-rose-400 font-bold">*</span>
          </span>
          {!documentType && (
            <span className="text-[10px] text-amber-400 font-medium">
              Select type to unlock file upload
            </span>
          )}
        </label>

        <div className="relative">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as AllowedDocumentType)}
            disabled={uploading || isExtracting || isSaving}
            className={`w-full appearance-none bg-[#0d0f14] border rounded-xl px-3.5 py-2.5 text-xs font-medium text-white transition-all outline-none pr-10 cursor-pointer ${
              documentType
                ? 'border-indigo-500/60 ring-1 ring-indigo-500/30'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <option value="" disabled className="bg-[#0d0f14] text-slate-500">
              -- Select Document Type (Required) --
            </option>
            <option value="Lease Deed" className="bg-[#14171d] text-slate-100">
              Lease Deed
            </option>
            <option value="Insurance" className="bg-[#14171d] text-slate-100">
              Insurance
            </option>
            <option value="Trade License" className="bg-[#14171d] text-slate-100">
              Trade License
            </option>
            <option value="Municipality Tax" className="bg-[#14171d] text-slate-100">
              Municipality Tax
            </option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {documentType && (
          <p className="text-[10px] text-indigo-300/80 pl-0.5">
            {documentType === 'Lease Deed' && 'Will update carpet area, rent schedules, lease validity, escalation rates, and tenant names.'}
            {documentType === 'Insurance' && 'Will update insurance validity period and sum insured coverage.'}
            {documentType === 'Trade License' && 'Will update municipal trade license validity period.'}
            {documentType === 'Municipality Tax' && 'Will update holding number, latest paid financial year, and tax amount paid.'}
          </p>
        )}
      </div>

      {/* Step 2: Upload Zone Input (Active ONLY after documentType is chosen) */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          isUploadDisabled
            ? 'border-slate-800/80 bg-[#0a0c10] opacity-60 cursor-not-allowed'
            : 'border-indigo-500/40 hover:border-indigo-400 bg-[#0d0f14] cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*, application/pdf"
          onChange={uploadFile}
          disabled={isUploadDisabled}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed z-10"
        />

        <div className="space-y-2 pointer-events-none">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all ${
              isUploadDisabled
                ? 'bg-slate-800/50 border border-slate-700 text-slate-600'
                : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-md shadow-indigo-500/10'
            }`}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            ) : isExtracting ? (
              <Sparkles className="w-6 h-6 animate-pulse text-purple-400" />
            ) : (
              <Camera className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              {uploading
                ? 'Uploading document to Supabase...'
                : isExtracting
                ? `Analyzing document with AI... (${extractionSeconds}s)`
                : !documentType
                ? 'Select a Document Type above to enable file upload'
                : `Upload ${documentType} (Click or drag file)`}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {!documentType
                ? 'Supported: Lease Deed, Insurance, Trade License, Municipality Tax (Images / PDF)'
                : isExtracting
                ? 'This may take up to 60 seconds for PDFs.'
                : `Ready for ${documentType} extraction via Gemini Vision OCR`}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress Indicator */}
      {uploading && (
        <div className="flex items-center space-x-2 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Uploading document file to Supabase storage bucket...</span>
        </div>
      )}

      {/* Enhanced Loading State while AI is extracting */}
      {isExtracting && (
        <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/40 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-purple-300">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>Analyzing document with AI... This may take up to 60 seconds for PDFs.</span>
                </p>
                <p className="text-[11px] text-purple-200/80 mt-0.5">
                  {extractionSeconds < 10
                    ? 'Transmitting document payload to Gemini Vision AI...'
                    : extractionSeconds < 25
                    ? 'Scanning text, key-value pairs, tables, and clauses...'
                    : extractionSeconds < 45
                    ? 'Verifying dates, amounts, and compliance rules...'
                    : 'Finalizing structured JSON output schema...'}
                </p>
              </div>
            </div>

            {/* Live Timer Pill */}
            <div className="inline-flex items-center space-x-1.5 bg-purple-900/40 border border-purple-500/30 px-3 py-1.5 rounded-full text-xs font-mono text-purple-200 self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5 text-purple-400 animate-spin" />
              <span>{extractionSeconds}s / 60s</span>
            </div>
          </div>

          {/* Progressive Visual Loading Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden border border-purple-500/20 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(95, Math.max(8, Math.round((extractionSeconds / 60) * 100)))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
              <span>Deep OCR Vision Pipeline</span>
              <span className="font-mono text-purple-300">
                {Math.min(95, Math.max(8, Math.round((extractionSeconds / 60) * 100)))}% complete
              </span>
            </div>
          </div>

          {/* Skeleton Field Previews */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-14 bg-slate-900/60 rounded-lg border border-purple-500/20 p-2.5 space-y-1.5">
                <div className="h-2.5 w-1/2 bg-purple-950/60 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-slate-800/80 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {extractionError && !isExtracting && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 flex items-start space-x-3 text-xs">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="font-semibold">Extraction Warning / Notice</p>
            <p className="text-slate-300">{extractionError}</p>
            {imageUrl && (
              <button
                type="button"
                onClick={() => triggerExtraction(imageUrl)}
                className="inline-flex items-center space-x-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-lg font-medium transition-colors border border-red-500/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry AI Extraction</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Uploaded File Link & Preview */}
      {imageUrl && !isExtracting && (
        <div className="bg-[#0d0f14] border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Document Uploaded for: <span className="text-white">{documentType || 'Document'}</span></span>
            </div>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-indigo-400 hover:underline font-medium"
            >
              View Document File
            </a>
          </div>

          <div className="mt-2 rounded-lg overflow-hidden border border-slate-800 bg-black/40 max-w-[240px]">
            {imageUrl.toLowerCase().includes('.pdf') ? (
              <div className="p-3 flex items-center space-x-2 text-xs text-slate-300">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="truncate">{uploadedPath || 'Document.pdf'}</span>
              </div>
            ) : (
              <img src={imageUrl} alt="Uploaded document preview" className="w-full h-auto max-h-40 object-contain" />
            )}
          </div>
        </div>
      )}

      {/* Extracted Data Form with Targeted Fields for Document Type */}
      {extractedData && !isExtracting && (
        <div className="bg-[#0f1117] border border-indigo-500/30 rounded-2xl p-5 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  AI Extracted Data for <span className="text-indigo-400 font-mono">{documentType}</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Review &amp; approve to save record to <span className="text-slate-300 font-mono">property_documents</span> and update <span className="text-slate-300 font-mono">properties</span>.
                </p>
              </div>
            </div>
            {isApproved && (
              <span className="inline-flex items-center space-x-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] px-2.5 py-1 rounded-full font-semibold">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Approved</span>
              </span>
            )}
          </div>

          {/* Targeted Fields Based on Document Type */}
          {documentType === 'Lease Deed' && (
            <div className="space-y-4">
              <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                Lease Terms &amp; Financials (Will Update Properties Table)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {/* Carpet Area */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Carpet Area</span>
                    <span className="text-[10px] text-slate-500">(e.g., 1200 sq ft)</span>
                  </label>
                  <input
                    type="text"
                    value={extractedData.carpetArea || ''}
                    onChange={(e) => handleFieldChange('carpetArea', e.target.value)}
                    placeholder="null"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Total Rent */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Total Rent</span>
                    <span className="text-[10px] text-slate-500">(₹ / month)</span>
                  </label>
                  <input
                    type="number"
                    value={extractedData.totalRent !== null && extractedData.totalRent !== undefined ? extractedData.totalRent : ''}
                    onChange={(e) => handleFieldChange('totalRent', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="null"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Rent per Sq Ft */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Rent Per Sq Ft</span>
                    <span className="text-[10px] text-slate-500">(₹ / sq ft)</span>
                  </label>
                  <input
                    type="number"
                    value={extractedData.rentPerSqFt !== null && extractedData.rentPerSqFt !== undefined ? extractedData.rentPerSqFt : ''}
                    onChange={(e) => handleFieldChange('rentPerSqFt', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="null"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Lease Start Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Lease Start Date</span>
                    <span className="text-[10px] text-indigo-400 font-mono">(DD-MM-YYYY)</span>
                  </label>
                  <DateInputField
                    value={extractedData.leaseStartDate || ''}
                    onChange={(val) => handleFieldChange('leaseStartDate', val || null)}
                    maxDate={extractedData.leaseValidUpto || undefined}
                    placeholder="DD-MM-YYYY"
                  />
                </div>

                {/* Lease Valid Upto */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Lease Valid Upto</span>
                    <span className="text-[10px] text-indigo-400 font-mono">(DD-MM-YYYY)</span>
                  </label>
                  <DateInputField
                    value={extractedData.leaseValidUpto || ''}
                    onChange={(val) => handleFieldChange('leaseValidUpto', val || null)}
                    minDate={extractedData.leaseStartDate || undefined}
                    hasError={Boolean(
                      extractedData.leaseStartDate &&
                      extractedData.leaseValidUpto &&
                      validateLeaseDateRange(extractedData.leaseStartDate, extractedData.leaseValidUpto)
                    )}
                    errorMessage={
                      validateLeaseDateRange(extractedData.leaseStartDate, extractedData.leaseValidUpto) || undefined
                    }
                    placeholder="DD-MM-YYYY"
                  />
                </div>

                {/* Escalation Percentage */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Escalation Rate (%)</span>
                    <span className="text-[10px] text-slate-500">(e.g., 15)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={extractedData.escalationPercentage !== null && extractedData.escalationPercentage !== undefined ? extractedData.escalationPercentage : ''}
                    onChange={(e) => handleFieldChange('escalationPercentage', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="e.g. 10"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Revision Period Years */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Revision Period</span>
                    <span className="text-[10px] text-slate-500">(Years, e.g., 3)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={extractedData.revisionPeriodYears !== null && extractedData.revisionPeriodYears !== undefined ? extractedData.revisionPeriodYears : ''}
                    onChange={(e) => handleFieldChange('revisionPeriodYears', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="e.g. 3"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Lessee */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Lessee / Tenant</label>
                  <input
                    type="text"
                    value={extractedData.lessee || ''}
                    onChange={(e) => handleFieldChange('lessee', e.target.value)}
                    placeholder="Tenant name"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Lessor */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Lessor / Landlord</label>
                  <input
                    type="text"
                    value={extractedData.lessor || ''}
                    onChange={(e) => handleFieldChange('lessor', e.target.value)}
                    placeholder="Landlord name"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {documentType === 'Insurance' && (
            <div className="space-y-4">
              <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                Insurance Compliance (Will Update Properties Table)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Policy Number (Type: Text) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Policy Number</span>
                    <span className="text-[10px] text-slate-500 font-mono">(Text)</span>
                  </label>
                  <input
                    type="text"
                    id="input-insurance-policyno"
                    value={extractedData.policyNo ?? extractedData.policyNumber ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleFieldChange('policyNo', val);
                      handleFieldChange('policyNumber', val);
                    }}
                    placeholder="e.g. POL-88392-2025"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Sum Insured (Type: Number) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Sum Insured</span>
                    <span className="text-[10px] text-slate-500 font-mono">(₹ Coverage)</span>
                  </label>
                  <input
                    type="number"
                    id="input-insurance-suminsured"
                    value={extractedData.sumInsured !== null && extractedData.sumInsured !== undefined ? extractedData.sumInsured : ''}
                    onChange={(e) => handleFieldChange('sumInsured', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                    placeholder="e.g. 5000000"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Premium Amount (Type: Number) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Premium Amount</span>
                    <span className="text-[10px] text-slate-500 font-mono">(₹ Cost)</span>
                  </label>
                  <input
                    type="number"
                    id="input-insurance-premiumamount"
                    value={extractedData.premiumAmount !== null && extractedData.premiumAmount !== undefined ? extractedData.premiumAmount : ''}
                    onChange={(e) => handleFieldChange('premiumAmount', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                    placeholder="e.g. 35000"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Insurance Validity (Type: Date) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Insurance Validity</span>
                    <span className="text-[10px] text-indigo-400 font-mono">(DD-MM-YYYY)</span>
                  </label>
                  <DateInputField
                    id="input-insurance-validity"
                    value={extractedData.insuranceValidity || ''}
                    onChange={(val) => handleFieldChange('insuranceValidity', val)}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
              </div>
            </div>
          )}

          {documentType === 'Trade License' && (
            <div className="space-y-4">
              <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                Trade License Compliance (Will Update Properties Table)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Trade License Validity */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Trade License Validity</span>
                    <span className="text-[10px] text-indigo-400 font-mono">(DD-MM-YYYY)</span>
                  </label>
                  <DateInputField
                    value={extractedData.tradeLicenseValidity || ''}
                    onChange={(val) => handleFieldChange('tradeLicenseValidity', val)}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
              </div>
            </div>
          )}

          {documentType === 'Municipality Tax' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                  Municipality Tax Details (Will Update Properties Table)
                </div>
                <TaxStatusBadge lastPaidFY={extractedData.taxFinancialYear} showCurrentFYNote />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* Holding Number */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Holding Number</span>
                    <span className="text-[10px] text-slate-500 font-mono">(Assessment ID)</span>
                  </label>
                  <input
                    type="text"
                    id="input-tax-holdingnumber"
                    value={extractedData.holdingNumber ?? ''}
                    onChange={(e) => handleFieldChange('holdingNumber', e.target.value)}
                    placeholder="e.g. HLD-40291/WARD-12"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Tax Financial Year */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Financial Year</span>
                    <span className="text-[10px] text-indigo-400 font-mono">(YYYY-YYYY)</span>
                  </label>
                  <input
                    type="text"
                    id="input-tax-financialyear"
                    value={extractedData.taxFinancialYear ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleFieldChange('taxFinancialYear', val);
                    }}
                    onBlur={(e) => {
                      const normalized = normalizeFinancialYear(e.target.value);
                      if (normalized) {
                        handleFieldChange('taxFinancialYear', normalized);
                      }
                    }}
                    placeholder="e.g. 2025-2026"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Tax Paid Amount */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Tax Paid Amount</span>
                    <span className="text-[10px] text-slate-500 font-mono">(₹ Amount)</span>
                  </label>
                  <input
                    type="number"
                    id="input-tax-paidamount"
                    value={extractedData.taxPaidAmount !== null && extractedData.taxPaidAmount !== undefined ? extractedData.taxPaidAmount : ''}
                    onChange={(e) => handleFieldChange('taxPaidAmount', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                    placeholder="e.g. 18500"
                    className="w-full bg-[#181b22] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => imageUrl && triggerExtraction(imageUrl)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Extraction</span>
            </button>

            <button
              type="button"
              onClick={saveToDatabase}
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-all shadow-lg shadow-emerald-600/25 active:scale-95 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span>{isSaving ? 'Saving & Updating Database...' : 'Approve & Save to Database'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
