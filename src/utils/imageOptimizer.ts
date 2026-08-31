/**
 * Client-side image optimizer for fast, lightweight OCR document extraction.
 * Scales down large camera photos and document scans to optimal OCR resolution (< 1920px, ~300KB),
 * preventing network payload bottlenecks and 'Failed to fetch' errors on large uploads.
 */
export async function optimizeImageForOcr(
  dataUrlOrBase64: string,
  maxDimension = 1920,
  quality = 0.85
): Promise<{ base64Data: string; mimeType: string; dataUrl: string }> {
  if (!dataUrlOrBase64 || typeof dataUrlOrBase64 !== 'string') {
    return { base64Data: '', mimeType: 'image/jpeg', dataUrl: '' };
  }

  const trimmed = dataUrlOrBase64.trim();

  // If it's a PDF, do not attempt canvas rendering - return as is
  if (trimmed.startsWith('data:application/pdf') || trimmed.startsWith('JVBERi0')) {
    const rawBase64 = trimmed.replace(/^data:application\/pdf;base64,/, '');
    return {
      base64Data: rawBase64,
      mimeType: 'application/pdf',
      dataUrl: trimmed.startsWith('data:') ? trimmed : `data:application/pdf;base64,${rawBase64}`
    };
  }

  // Format as valid Data URL for Image loading
  let fullDataUrl = trimmed;
  if (!trimmed.startsWith('data:')) {
    fullDataUrl = `data:image/jpeg;base64,${trimmed}`;
  }

  // If it's already a reasonably small data URL (e.g. < 400KB), extract mime & base64
  if (trimmed.length < 500000 && !trimmed.startsWith('data:image/heic') && !trimmed.startsWith('data:image/heif')) {
    const mimeMatch = fullDataUrl.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = fullDataUrl.replace(/^data:[^;]+;base64,/, '');
    return { base64Data, mimeType, dataUrl: fullDataUrl };
  }

  return new Promise((resolve) => {
    // Set up safe fallback in case of loading error
    const fallbackMime = fullDataUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
    const fallbackBase64 = fullDataUrl.replace(/^data:[^;]+;base64,/, '');

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      // Timeout fallback: return original after 3 seconds
      resolve({ base64Data: fallbackBase64, mimeType: fallbackMime, dataUrl: fullDataUrl });
    }, 3000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          resolve({ base64Data: fallbackBase64, mimeType: fallbackMime, dataUrl: fullDataUrl });
          return;
        }

        // Scale down if dimensions exceed maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) {
          resolve({ base64Data: fallbackBase64, mimeType: fallbackMime, dataUrl: fullDataUrl });
          return;
        }

        // Fill white background in case of transparent PNG/WEBP
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const optimizedBase64 = optimizedDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        resolve({
          base64Data: optimizedBase64,
          mimeType: 'image/jpeg',
          dataUrl: optimizedDataUrl
        });
      } catch (err) {
        console.warn('Canvas image compression notice (using fallback):', err);
        resolve({ base64Data: fallbackBase64, mimeType: fallbackMime, dataUrl: fullDataUrl });
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve({ base64Data: fallbackBase64, mimeType: fallbackMime, dataUrl: fullDataUrl });
    };

    img.src = fullDataUrl;
  });
}
