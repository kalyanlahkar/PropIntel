import { normalizeFinancialYear } from '../utils/taxCalculator';
import { optimizeImageForOcr } from '../utils/imageOptimizer';

export interface ExtractedDocumentMetrics {
  carpetArea: string | null;
  totalRent: number | null;
  rentPerSqFt: number | null;
  leaseStartDate: string | null;
  leaseValidUpto: string | null;
  escalationPercentage: number | null;
  revisionPeriodYears: number | null;
  lessee: string | null;
  lessor: string | null;
  tradeLicenseValidity: string | null;
  policyNo: string | null;
  policyNumber?: string | null;
  premiumAmount: number | null;
  sumInsured: number | null;
  insuranceValidity: string | null;
  holdingNumber?: string | null;
  taxFinancialYear?: string | null;
  taxPaidAmount?: number | null;
  rawSummary?: string;
  warningMessage?: string;
  extractedSuccessfully?: boolean;
  [key: string]: any;
}

/**
 * Detects and normalizes MIME types for Gemini Vision API.
 */
function resolveMimeType(providedMime: string | null | undefined, urlOrPath: string): string {
  const raw = (providedMime || '').toLowerCase().trim();

  if (raw.includes('pdf') || urlOrPath.toLowerCase().includes('.pdf')) {
    return 'application/pdf';
  }
  if (raw.includes('png') || urlOrPath.toLowerCase().includes('.png')) {
    return 'image/png';
  }
  if (raw.includes('webp') || urlOrPath.toLowerCase().includes('.webp')) {
    return 'image/webp';
  }
  if (raw.includes('heic') || urlOrPath.toLowerCase().includes('.heic')) {
    return 'image/heic';
  }
  if (raw.includes('heif') || urlOrPath.toLowerCase().includes('.heif')) {
    return 'image/heif';
  }

  // Default fallback for images
  return 'image/jpeg';
}

/**
 * Automatically extracts structured property metrics from a document image or URL using the server Gemini Vision pipeline.
 */
export async function extractDocumentData(
  imageUrl: string,
  propertyCode: string,
  directBase64?: string
): Promise<ExtractedDocumentMetrics> {
  const defaultFallback: ExtractedDocumentMetrics = {
    carpetArea: null,
    totalRent: null,
    rentPerSqFt: null,
    leaseStartDate: null,
    leaseValidUpto: null,
    escalationPercentage: null,
    revisionPeriodYears: null,
    lessee: null,
    lessor: null,
    tradeLicenseValidity: null,
    policyNo: null,
    policyNumber: null,
    premiumAmount: null,
    sumInsured: null,
    insuranceValidity: null,
    holdingNumber: null,
    taxFinancialYear: null,
    taxPaidAmount: null,
    rawSummary: "Extracted document fields initialized for verification.",
    extractedSuccessfully: false,
    warningMessage: undefined
  };

  try {
    let rawBase64 = directBase64 || '';
    let detectedMime = 'image/jpeg';

    if (!rawBase64) {
      if (imageUrl.startsWith('data:')) {
        rawBase64 = imageUrl;
        const match = imageUrl.match(/data:(.*?);/);
        detectedMime = resolveMimeType(match ? match[1] : '', imageUrl);
      } else {
        // Attempt to fetch image safely if local or same-origin
        try {
          const response = await fetch(imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            rawBase64 = btoa(binary);
            detectedMime = resolveMimeType(blob.type, imageUrl);
          }
        } catch (fetchErr) {
          console.warn("Client image pre-fetch bypassed (handled server-side):", fetchErr);
        }
      }
    }

    // Optimize image size to prevent oversized POST payloads that cause network "Failed to fetch"
    let cleanBase64 = '';
    let finalMimeType = detectedMime;

    if (rawBase64) {
      const optimized = await optimizeImageForOcr(rawBase64, 1920, 0.85);
      cleanBase64 = optimized.base64Data;
      finalMimeType = optimized.mimeType || detectedMime;
    }

    // Call server endpoint (/api/extract) with 60s timeout protection for heavy multi-page PDFs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let serverData: any = null;

    try {
      const serverRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: cleanBase64,
          imageUrl: imageUrl && !imageUrl.startsWith('data:') ? imageUrl : undefined,
          mimeType: finalMimeType,
          propertyCode: propertyCode
        })
      });

      clearTimeout(timeoutId);

      if (serverRes.ok) {
        serverData = await serverRes.json().catch(() => null);
      } else {
        console.warn("Server extraction returned status:", serverRes.status);
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn("Server extraction request notice (applying fallback):", fetchErr?.message || fetchErr);
      return {
        ...defaultFallback,
        warningMessage: fetchErr?.name === 'AbortError'
          ? "AI extraction timed out after 60s. High-density PDFs may require manual field verification."
          : "AI extraction server temporarily unavailable. You can manually enter details."
      };
    }

    if (!serverData) {
      return defaultFallback;
    }

    return normalizeExtractedData(serverData);
  } catch (err: any) {
    console.warn("Document AI Extraction Pipeline handled gracefully:", err?.message || err);
    return {
      ...defaultFallback,
      warningMessage: err?.message || "AI extraction temporarily unavailable."
    };
  }
}

/**
 * Ensures fields conform strictly to requested schema types
 */
function normalizeExtractedData(raw: any): ExtractedDocumentMetrics {
  const parseNum = (val: any): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const str = String(val).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(str);
    return isNaN(parsed) ? null : parsed;
  };

  const parseStr = (val: any): string | null => {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s.length > 0 ? s : null;
  };

  const policyVal = parseStr(raw.policyNo || raw.policyNumber);
  const rawFY = parseStr(raw.taxFinancialYear || raw.financialYear || raw.latest_tax_financial_year);
  const normalizedFY = normalizeFinancialYear(rawFY) || rawFY;

  return {
    carpetArea: parseStr(raw.carpetArea),
    totalRent: parseNum(raw.totalRent),
    rentPerSqFt: parseNum(raw.rentPerSqFt),
    leaseStartDate: parseStr(raw.leaseStartDate || raw.startDate),
    leaseValidUpto: parseStr(raw.leaseValidUpto || raw.expiryDate),
    escalationPercentage: parseNum(raw.escalationPercentage),
    revisionPeriodYears: parseNum(raw.revisionPeriodYears),
    lessee: parseStr(raw.lessee),
    lessor: parseStr(raw.lessor),
    tradeLicenseValidity: parseStr(raw.tradeLicenseValidity),
    policyNo: policyVal,
    policyNumber: policyVal,
    premiumAmount: parseNum(raw.premiumAmount),
    sumInsured: parseNum(raw.sumInsured),
    insuranceValidity: parseStr(raw.insuranceValidity || raw.insuranceValidUpto),
    holdingNumber: parseStr(raw.holdingNumber || raw.holding_number || raw.assessmentNo || raw.assessmentNumber),
    taxFinancialYear: normalizedFY,
    taxPaidAmount: parseNum(raw.taxPaidAmount ?? raw.latest_tax_amount ?? raw.amountPaid),
    rawSummary: parseStr(raw.rawSummary) || undefined,
    warningMessage: parseStr(raw._warningMessage || raw.warningMessage) || undefined,
    extractedSuccessfully: Boolean(raw._extractedSuccessfully ?? raw.extractedSuccessfully ?? true)
  };
}
