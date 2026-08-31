// Next.js App Router route segment config to allow up to 60 seconds execution
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { GoogleGenAI } from '@google/genai';

function parseAndSanitizeMedia(rawInput, declaredMime, fallbackUrl) {
  let mimeType = declaredMime || 'image/jpeg';
  let cleanBase64 = '';

  if (!rawInput) return { mimeType, cleanBase64 };

  const trimmed = rawInput.trim();

  if (trimmed.startsWith('data:')) {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx !== -1) {
      const header = trimmed.substring(0, commaIdx);
      cleanBase64 = trimmed.substring(commaIdx + 1).replace(/\s+/g, '');
      const mimeMatch = header.match(/data:([^;]+);/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1].toLowerCase().trim();
      }
    } else {
      cleanBase64 = trimmed.replace(/\s+/g, '');
    }
  } else {
    cleanBase64 = trimmed.replace(/\s+/g, '');
  }

  if (cleanBase64.startsWith('JVBERi0')) {
    mimeType = 'application/pdf';
  } else if (cleanBase64.startsWith('iVBORw0KGgo')) {
    mimeType = 'image/png';
  } else if (cleanBase64.startsWith('/9j/')) {
    mimeType = 'image/jpeg';
  } else if (cleanBase64.startsWith('UklGR')) {
    mimeType = 'image/webp';
  } else if (fallbackUrl) {
    const lowerUrl = fallbackUrl.toLowerCase();
    if (lowerUrl.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (lowerUrl.endsWith('.png')) mimeType = 'image/png';
    else if (lowerUrl.endsWith('.webp')) mimeType = 'image/webp';
  }

  return { mimeType, cleanBase64 };
}

export async function POST(req) {
  const defaultFallbackData = {
    carpetArea: null,
    totalRent: null,
    rentPerSqFt: null,
    leaseStartDate: null,
    leaseValidUpto: null,
    escalationPercentage: null,
    revisionPeriodYears: null,
    lessee: null,
    lessor: null,
    holdingNumber: null,
    taxFinancialYear: null,
    taxPaidAmount: null,
    policyNo: null,
    policyNumber: null,
    insuranceProvider: null,
    insuredEntity: null,
    insuranceValidity: null,
    sumInsured: null,
    premiumAmount: null,
    licenseNumber: null,
    issuingAuthority: null,
    licensee: null,
    tradeLicenseValidity: null,
    tradeCategory: null,
    rawSummary: null,
    keyRisks: [],
    _extractedSuccessfully: false
  };

  try {
    const body = await req.json();
    const { imageBase64, imageUrl, documentType, mimeType: userMime, customPrompt } = body;

    let { mimeType, cleanBase64 } = parseAndSanitizeMedia(imageBase64, userMime, imageUrl);

    if (!cleanBase64 && imageUrl) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s internal fetch timeout

      try {
        const fetchRes = await fetch(imageUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (fetchRes.ok) {
          const arrayBuffer = await fetchRes.arrayBuffer();
          const fetchedBase64 = Buffer.from(arrayBuffer).toString('base64');
          const headerType = fetchRes.headers.get('content-type');
          const parsed = parseAndSanitizeMedia(fetchedBase64, headerType || userMime, imageUrl);
          cleanBase64 = parsed.cleanBase64;
          mimeType = parsed.mimeType;
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn('Storage fetch warning in Next.js route:', err);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !cleanBase64 || cleanBase64.length < 50) {
      return Response.json(defaultFallbackData);
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = customPrompt || `You are a highly accurate legal data extraction assistant. Extract property and legal metrics from the attached document of type "${documentType || 'Legal Document'}".
Rules:
1. NO GUESSING: If not written, return null.
2. Return ONLY a valid JSON object matching this schema:
{
  "holdingNumber": string or null,
  "taxFinancialYear": string or null,
  "taxPaidAmount": number or null,
  "carpetArea": string or null,
  "totalRent": number or null,
  "rentPerSqFt": number or null,
  "leaseStartDate": string or null (Format: YYYY-MM-DD),
  "leaseValidUpto": string or null (Format: YYYY-MM-DD),
  "escalationPercentage": number or null,
  "revisionPeriodYears": number or null,
  "lessee": string or null,
  "lessor": string or null,
  "tradeLicenseValidity": string or null,
  "policyNo": string or null,
  "policyNumber": string or null,
  "premiumAmount": number or null,
  "sumInsured": number or null,
  "insuranceValidity": string or null,
  "insuranceProvider": string or null,
  "insuredEntity": string or null,
  "licenseNumber": string or null,
  "issuingAuthority": string or null,
  "licensee": string or null,
  "rawSummary": string or null,
  "keyRisks": array of strings
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0,
      },
    });

    const jsonText = response.text || '{}';
    let parsedData = {};
    try {
      const cleaned = jsonText.replace(/```json/i, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    } catch {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedData = JSON.parse(match[0]);
        } catch {
          // ignore
        }
      }
    }

    return Response.json({
      ...defaultFallbackData,
      ...parsedData,
      _extractedSuccessfully: true,
    });
  } catch (error) {
    console.error('Error in /app/api/extract/route.js:', error);
    return Response.json({
      ...defaultFallbackData,
      _warningMessage: error?.message || 'AI document processing timed out or failed.',
    });
  }
}
