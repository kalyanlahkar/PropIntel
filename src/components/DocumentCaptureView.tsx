import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Sliders, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  Save, 
  Eye, 
  Info,
  Loader2,
  Building2
} from 'lucide-react';
import { PropertyRecord, PropertyType, ExtractedPropertyData } from '../types';
import { supabase } from '../supabaseClient';
import DocumentUploader from './DocumentUploader';
import { DateInputField } from './DateInputField';
import { validateLeaseDateRange } from '../utils/dateFormatter';
import { optimizeImageForOcr } from '../utils/imageOptimizer';

interface DocumentCaptureViewProps {
  properties: PropertyRecord[];
  selectedPropertyCode?: string;
  onSaveExtractedDocument: (
    propertyCode: string,
    docType: PropertyType,
    fileName: string,
    extractedData: ExtractedPropertyData,
    imageDataUrl: string
  ) => void;
  onCancel: () => void;
}

export const DocumentCaptureView: React.FC<DocumentCaptureViewProps> = ({
  properties,
  selectedPropertyCode,
  onSaveExtractedDocument,
  onCancel
}) => {
  // Mode: 'capture' | 'preview' | 'processing' | 'verify'
  const [step, setStep] = useState<'capture' | 'preview' | 'processing' | 'verify'>('capture');
  const [captureMethod, setCaptureMethod] = useState<'camera' | 'file'>('camera');

  // Property Selection
  const [targetPropertyCode, setTargetPropertyCode] = useState<string>(
    selectedPropertyCode || (properties.length > 0 ? properties[0].code : '')
  );
  const [docType, setDocType] = useState<PropertyType>('Lease Deed');

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Raw and Processed Image Data
  const [rawImageDataUrl, setRawImageDataUrl] = useState<string | null>(null);
  const [processedImageDataUrl, setProcessedImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('Captured_Document.jpg');

  // Pre-processing Adjustments (SRS Spec #5)
  const [isGrayscale, setIsGrayscale] = useState<boolean>(true);
  const [contrastLevel, setContrastLevel] = useState<number>(120); // %
  const [brightnessLevel, setBrightnessLevel] = useState<number>(105); // %

  // AI Extraction Result (Human-in-the-Loop Editable)
  const [extractedData, setExtractedData] = useState<ExtractedPropertyData>({});
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Start Browser Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch((err: any) => {
              if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                console.warn("Camera video play interrupted or failed:", err);
              }
            });
          }
        };
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("Camera permission denied or camera not available. Please use file upload below.");
      setCameraActive(false);
    }
  };

  // Stop Browser Camera
  const stopCamera = () => {
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      try {
        videoRef.current.pause();
      } catch (_) {}
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (captureMethod === 'camera' && step === 'capture') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [captureMethod, step]);

  // Capture Frame from Camera Video Stream
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setRawImageDataUrl(dataUrl);
      setFileName(`OCR_Capture_${Date.now()}.jpg`);
      processImageCanvas(dataUrl);
      setStep('preview');
      stopCamera();
    }
  };

  // Client-Side Image Processing Canvas (SRS Spec #5)
  // 1. Resolution Scaling (Max edge 2000px)
  // 2. Grayscale & Contrast boost
  // 3. Export JPEG 0.8
  const processImageCanvas = (
    srcDataUrl: string,
    grayscale: boolean = isGrayscale,
    contrast: number = contrastLevel,
    brightness: number = brightnessLevel
  ) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale down if > 2000px
      const MAX_EDGE = 2000;
      if (width > MAX_EDGE || height > MAX_EDGE) {
        if (width > height) {
          height = Math.round((height * MAX_EDGE) / width);
          width = MAX_EDGE;
        } else {
          width = Math.round((width * MAX_EDGE) / height);
          height = MAX_EDGE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Apply Filter Manipulations
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const bRatio = brightness / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Brightness
        r *= bRatio;
        g *= bRatio;
        b *= bRatio;

        // 2. Grayscale conversion
        if (grayscale) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray;
          g = gray;
          b = gray;
        }

        // 3. Contrast adjustment
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;

        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }

      ctx.putImageData(imageData, 0, 0);

      // Export JPEG 0.8
      const processedUrl = canvas.toDataURL('image/jpeg', 0.8);
      setProcessedImageDataUrl(processedUrl);
    };
    img.src = srcDataUrl;
  };

  // Re-apply filters when sliders change
  const handleApplyFilterChanges = (newGrayscale: boolean, newContrast: number, newBrightness: number) => {
    setIsGrayscale(newGrayscale);
    setContrastLevel(newContrast);
    setBrightnessLevel(newBrightness);
    if (rawImageDataUrl) {
      processImageCanvas(rawImageDataUrl, newGrayscale, newContrast, newBrightness);
    }
  };

  // Trigger Gemini AI Extraction Flow
  const handleExtractWithAI = async () => {
    if (!processedImageDataUrl && !rawImageDataUrl) return;

    setStep('processing');
    setExtractionError(null);

    const targetData = processedImageDataUrl || rawImageDataUrl;

    try {
      const optimized = await optimizeImageForOcr(targetData, 1920, 0.85);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let response: Response | null = null;
      try {
        response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            imageBase64: optimized.base64Data,
            documentType: docType,
            propertyCode: targetPropertyCode,
            mimeType: optimized.mimeType || 'image/jpeg',
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response || !response.ok) {
        throw new Error(response ? `Server returned HTTP ${response.status}` : 'Server connection failed');
      }

      const data = await response.json();

      if (data._warningMessage && !data._extractedSuccessfully) {
        setExtractionError(data._warningMessage);
      }

      setExtractedData({
        carpetArea: data.carpetArea || '',
        totalRent: data.totalRent || '',
        rentPerSqFt: data.rentPerSqFt || '',
        lessee: data.lessee || '',
        lessor: data.lessor || '',
        startDate: data.leaseStartDate || data.startDate || '',
        expiryDate: data.leaseValidUpto || data.expiryDate || data.tradeLicenseValidity || data.insuranceValidity || '',
        leaseStartDate: data.leaseStartDate || '',
        leaseValidUpto: data.leaseValidUpto || '',
        insuranceValidity: data.insuranceValidity || '',
        tradeLicenseValidity: data.tradeLicenseValidity || '',
        sumInsured: data.sumInsured || '',
        premiumAmount: data.premiumAmount || '',
        policyNumber: data.policyNumber || '',
        insuranceProvider: data.insuranceProvider || '',
        insuredEntity: data.insuredEntity || '',
        licenseNumber: data.licenseNumber || '',
        issuingAuthority: data.issuingAuthority || '',
        licensee: data.licensee || '',
        tradeCategory: data.tradeCategory || '',
        certificateNumber: data.certificateNumber || '',
        searchPeriod: data.searchPeriod || '',
        buyer: data.buyer || '',
        seller: data.seller || '',
        saleConsideration: data.saleConsideration || '',
        registrationDate: data.registrationDate || '',
        propertyDescription: data.propertyDescription || '',
        escalationPercentage: data.escalationPercentage,
        revisionPeriodYears: data.revisionPeriodYears,
        escalationClause: data.escalationPercentage ? `${data.escalationPercentage}% every ${data.revisionPeriodYears || 1}y` : (data.escalationClause || ''),
        noticePeriod: data.noticePeriod || '',
        securityDeposit: data.securityDeposit || '',
        keyRisks: data.keyRisks || [],
        rawSummary: data.rawSummary || '',
      });

      setStep('verify');
    } catch (err: any) {
      console.error("Extraction error:", err);
      setExtractionError(err?.message || "AI extraction temporarily unavailable. You can manually enter values for verification.");
      setExtractedData({
        carpetArea: '',
        totalRent: '',
        lessee: '',
        lessor: '',
        startDate: '',
        expiryDate: '',
        escalationClause: '',
        noticePeriod: '',
        securityDeposit: '',
        licenseNumber: '',
        policyNumber: '',
        keyRisks: [],
        rawSummary: '',
      });
      setStep('verify');
    }
  };

  // Save Final Confirmed Document (Human-in-the-Loop)
  const handleSaveDocument = () => {
    if (!targetPropertyCode) {
      alert("Please select or specify a target Property Code.");
      return;
    }

    if (docType === 'Lease Deed' && extractedData.startDate && extractedData.expiryDate) {
      const rangeError = validateLeaseDateRange(extractedData.startDate, extractedData.expiryDate);
      if (rangeError) {
        alert(`Validation Error: ${rangeError}`);
        return;
      }
    }

    onSaveExtractedDocument(
      targetPropertyCode,
      docType,
      fileName,
      extractedData,
      processedImageDataUrl || rawImageDataUrl || ''
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1a1d23] border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Document Capture &amp; OCR Intelligence</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Optimized image pre-processing and Gemini AI structured extraction.
            </p>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl transition-colors self-start sm:self-center"
        >
          Cancel &amp; Return
        </button>
      </div>

      {/* Target Property & Document Type Selection */}
      <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl p-6 shadow-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Attach To Property Code <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={targetPropertyCode}
              onChange={(e) => setTargetPropertyCode(e.target.value)}
              className="w-full bg-[#0d0f14] border border-slate-800 text-xs rounded-xl pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} - {p.title} ({p.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Document Category <span className="text-rose-400">*</span>
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as PropertyType)}
            className="w-full bg-[#0d0f14] border border-slate-800 text-xs rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="Lease Deed">Lease Deed</option>
            <option value="Encumbrance Certificate">Encumbrance Certificate</option>
            <option value="Trade License">Trade License</option>
            <option value="Municipality Tax">Municipality Tax</option>
            <option value="Insurance">Insurance</option>
            <option value="Sale Deed">Sale Deed</option>
          </select>
        </div>
      </div>

      {/* STEP 1: CAPTURE OR UPLOAD */}
      {step === 'capture' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Method Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
            <button
              onClick={() => setCaptureMethod('camera')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                captureMethod === 'camera'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Live Browser Camera</span>
            </button>
            <button
              onClick={() => setCaptureMethod('file')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                captureMethod === 'file'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document File</span>
            </button>
          </div>

          {captureMethod === 'camera' ? (
            <div className="space-y-4">
              {cameraError ? (
                <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              ) : (
                <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden aspect-video max-h-[480px] flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Framing Overlay Guide */}
                  <div className="absolute inset-8 border-2 border-dashed border-indigo-400/60 rounded-xl pointer-events-none flex flex-col justify-between p-4">
                    <div className="text-center bg-slate-950/80 text-indigo-300 text-[10px] font-mono py-1 px-3 rounded-full self-center border border-indigo-500/30">
                      ALIGN DOCUMENT WITHIN BOUNDS FOR OPTIMAL OCR
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <button
                  onClick={handleSnapPhoto}
                  disabled={!cameraActive}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-2xl shadow-xl flex items-center space-x-2 transition-all active:scale-95"
                >
                  <Camera className="w-5 h-5" />
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <DocumentUploader
                propertyCode={targetPropertyCode}
                onUploadComplete={(publicUrl, filePath) => {
                  setFileName(filePath);
                  setRawImageDataUrl(publicUrl);
                  processImageCanvas(publicUrl);
                  setStep('preview');
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* STEP 2: PRE-PROCESSING & OCR OPTIMIZATION CONTROLS */}
      {step === 'preview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Client-Side OCR Pre-Processing</h3>
              <p className="text-xs text-slate-400">
                Rescaling, grayscale conversion, and contrast enhancement for maximum Gemini Vision accuracy.
              </p>
            </div>
            <button
              onClick={() => setStep('capture')}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake / Re-upload</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Image Canvas Preview */}
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center overflow-hidden min-h-[320px]">
              {processedImageDataUrl ? (
                <img
                  src={processedImageDataUrl}
                  alt="Processed Document"
                  className="max-h-[400px] w-auto object-contain rounded-lg shadow-md"
                />
              ) : (
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              )}
              <span className="text-[10px] text-slate-500 font-mono mt-2">
                Processed Resolution: ≤2000px Edge • Grayscale: {isGrayscale ? 'Enabled' : 'Disabled'} • Quality: JPEG 0.8
              </span>
            </div>

            {/* Filter Controls Sidebar */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-5">
              <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                <Sliders className="w-4 h-4" />
                <span>OCR Filters</span>
              </div>

              {/* Grayscale Toggle */}
              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-medium text-white block">Grayscale Filter</span>
                  <span className="text-[10px] text-slate-400">Removes background color noise</span>
                </div>
                <input
                  type="checkbox"
                  checked={isGrayscale}
                  onChange={(e) => handleApplyFilterChanges(e.target.checked, contrastLevel, brightnessLevel)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              {/* Contrast Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Contrast Enhancement</span>
                  <span className="font-mono text-indigo-400">{contrastLevel}%</span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={200}
                  value={contrastLevel}
                  onChange={(e) => handleApplyFilterChanges(isGrayscale, Number(e.target.value), brightnessLevel)}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Brightness Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Brightness Compensation</span>
                  <span className="font-mono text-indigo-400">{brightnessLevel}%</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={150}
                  value={brightnessLevel}
                  onChange={(e) => handleApplyFilterChanges(isGrayscale, contrastLevel, Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <button
                onClick={handleExtractWithAI}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-xs transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run Gemini AI Extraction</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PROCESSING SPINNER */}
      {step === 'processing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Gemini Vision OCR Extracting Data...</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Analyzing lease clauses, carpet areas, rent escalation rates, and legal compliance risks.
            </p>
          </div>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
            <div className="w-2/3 h-full bg-indigo-500 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* STEP 4: VERIFY & HUMAN-IN-THE-LOOP EDITABLE FORM */}
      {step === 'verify' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Human-in-the-Loop Audit &amp; Verification</h3>
                <p className="text-xs text-slate-400">
                  Review and edit Gemini-extracted terms before committing to the property record.
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveDocument}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-lg active:scale-95 transition-all self-end sm:self-center"
            >
              <Save className="w-4 h-4" />
              <span>Confirm &amp; Attach to Property</span>
            </button>
          </div>

          {extractionError && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{extractionError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Extracted Document Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center">
              {processedImageDataUrl && (
                <img
                  src={processedImageDataUrl}
                  alt="Document"
                  className="max-h-[350px] w-auto object-contain rounded-lg shadow-sm"
                />
              )}
              <span className="text-[11px] text-slate-400 mt-2 font-mono">{fileName}</span>
            </div>

            {/* Editable Form - Adapted by docType */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {docType === 'Lease Deed' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Carpet Area (sq ft)
                      </label>
                      <input
                        type="text"
                        value={extractedData.carpetArea || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, carpetArea: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. 1250"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Total Monthly Rent (₹)
                      </label>
                      <input
                        type="text"
                        value={extractedData.totalRent || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, totalRent: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. 85000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Lessee / Tenant
                      </label>
                      <input
                        type="text"
                        value={extractedData.lessee || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, lessee: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Lessor / Landlord
                      </label>
                      <input
                        type="text"
                        value={extractedData.lessor || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, lessor: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Commencement Date</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">(DD-MM-YYYY)</span>
                      </label>
                      <DateInputField
                        value={extractedData.startDate || extractedData.leaseStartDate || ''}
                        onChange={(val) => setExtractedData({ ...extractedData, startDate: val, leaseStartDate: val })}
                        maxDate={extractedData.expiryDate || extractedData.leaseValidUpto || undefined}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Lease Valid Upto</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">(DD-MM-YYYY)</span>
                      </label>
                      <DateInputField
                        value={extractedData.expiryDate || extractedData.leaseValidUpto || ''}
                        onChange={(val) => setExtractedData({ ...extractedData, expiryDate: val, leaseValidUpto: val })}
                        minDate={extractedData.startDate || extractedData.leaseStartDate || undefined}
                        hasError={Boolean(
                          extractedData.startDate &&
                          extractedData.expiryDate &&
                          validateLeaseDateRange(extractedData.startDate, extractedData.expiryDate)
                        )}
                        errorMessage={
                          validateLeaseDateRange(extractedData.startDate, extractedData.expiryDate) || undefined
                        }
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Escalation Clause
                      </label>
                      <input
                        type="text"
                        value={extractedData.escalationClause || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, escalationClause: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. 5% every 1y"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Notice Period
                      </label>
                      <input
                        type="text"
                        value={extractedData.noticePeriod || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, noticePeriod: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. 3 Months"
                      />
                    </div>
                  </div>
                </>
              )}

              {docType === 'Insurance' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Policy Number
                      </label>
                      <input
                        type="text"
                        value={extractedData.policyNo || extractedData.policyNumber || extractedData.licenseNumber || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, policyNo: e.target.value, policyNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. POL-88392-2025"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Insurance Provider
                      </label>
                      <input
                        type="text"
                        value={extractedData.insuranceProvider || extractedData.lessor || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, insuranceProvider: e.target.value, lessor: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. HDFC ERGO / ICICI Lombard"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Insured Entity / Policyholder
                      </label>
                      <input
                        type="text"
                        value={extractedData.insuredEntity || extractedData.lessee || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, insuredEntity: e.target.value, lessee: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Sum Insured / Coverage (₹)
                      </label>
                      <input
                        type="number"
                        value={extractedData.sumInsured !== undefined && extractedData.sumInsured !== null ? extractedData.sumInsured : ''}
                        onChange={(e) => setExtractedData({ ...extractedData, sumInsured: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. 50000000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Premium Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={extractedData.premiumAmount !== undefined && extractedData.premiumAmount !== null ? extractedData.premiumAmount : ''}
                        onChange={(e) => setExtractedData({ ...extractedData, premiumAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. 35000"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Insurance Valid Upto</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">(DD-MM-YYYY)</span>
                      </label>
                      <DateInputField
                        value={extractedData.insuranceValidity || extractedData.expiryDate || ''}
                        onChange={(val) => setExtractedData({ ...extractedData, insuranceValidity: val, expiryDate: val })}
                        minDate={extractedData.startDate || undefined}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Policy Start Date</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">(DD-MM-YYYY)</span>
                      </label>
                      <DateInputField
                        value={extractedData.startDate || ''}
                        onChange={(val) => setExtractedData({ ...extractedData, startDate: val })}
                        maxDate={extractedData.expiryDate || extractedData.insuranceValidity || undefined}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                  </div>
                </>
              )}

              {docType === 'Trade License' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Trade License / Reg. No.
                      </label>
                      <input
                        type="text"
                        value={extractedData.licenseNumber || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, licenseNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. TL-BBMP-2024-9182"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Issuing Municipal Authority
                      </label>
                      <input
                        type="text"
                        value={extractedData.issuingAuthority || extractedData.lessor || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, issuingAuthority: e.target.value, lessor: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. BBMP / BMC / NDMC"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Licensee / Business Name
                      </label>
                      <input
                        type="text"
                        value={extractedData.licensee || extractedData.lessee || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, licensee: e.target.value, lessee: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Trade Category
                      </label>
                      <input
                        type="text"
                        value={extractedData.tradeCategory || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, tradeCategory: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. Commercial / Retail"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Issue Date</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">(DD-MM-YYYY)</span>
                      </label>
                      <DateInputField
                        value={extractedData.startDate || ''}
                        onChange={(val) => setExtractedData({ ...extractedData, startDate: val })}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>License Valid Upto</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">(DD-MM-YYYY)</span>
                      </label>
                      <DateInputField
                        value={extractedData.tradeLicenseValidity || extractedData.expiryDate || ''}
                        onChange={(val) => setExtractedData({ ...extractedData, tradeLicenseValidity: val, expiryDate: val })}
                        minDate={extractedData.startDate || undefined}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                  </div>
                </>
              )}

              {docType === 'Municipality Tax' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Holding Number
                      </label>
                      <input
                        type="text"
                        value={extractedData.holdingNumber || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, holdingNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        placeholder="e.g. HLD-98213"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Financial Year</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">(YYYY-YYYY)</span>
                      </label>
                      <input
                        type="text"
                        value={extractedData.taxFinancialYear || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, taxFinancialYear: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        placeholder="e.g. 2025-2026"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Tax Paid Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={extractedData.taxPaidAmount !== undefined && extractedData.taxPaidAmount !== null ? extractedData.taxPaidAmount : ''}
                        onChange={(e) => setExtractedData({ ...extractedData, taxPaidAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. 15000"
                      />
                    </div>
                  </div>
                </>
              )}

              {docType === 'Encumbrance Certificate' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Application / Certificate No.
                      </label>
                      <input
                        type="text"
                        value={extractedData.certificateNumber || extractedData.licenseNumber || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, certificateNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. EC-KA-2024-5510"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Registered Owner / Applicant
                      </label>
                      <input
                        type="text"
                        value={extractedData.lessee || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, lessee: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Search Period Start</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">(DD-MM-YYYY)</span>
                      </label>
                      <DateInputField
                        value={extractedData.startDate || ''}
                        onChange={(val) => setExtractedData({ ...extractedData, startDate: val })}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Search Period End</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">(DD-MM-YYYY)</span>
                      </label>
                      <DateInputField
                        value={extractedData.expiryDate || ''}
                        onChange={(val) => setExtractedData({ ...extractedData, expiryDate: val })}
                        minDate={extractedData.startDate || undefined}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Property Description
                    </label>
                    <input
                      type="text"
                      value={extractedData.propertyDescription || ''}
                      onChange={(e) => setExtractedData({ ...extractedData, propertyDescription: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {docType === 'Sale Deed' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Buyer / Purchaser
                      </label>
                      <input
                        type="text"
                        value={extractedData.buyer || extractedData.lessee || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, buyer: e.target.value, lessee: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Seller / Vendor
                      </label>
                      <input
                        type="text"
                        value={extractedData.seller || extractedData.lessor || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, seller: e.target.value, lessor: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Registration Date</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-normal">(DD-MM-YYYY)</span>
                      </label>
                      <DateInputField
                        value={extractedData.registrationDate || extractedData.startDate || ''}
                        onChange={(val) => setExtractedData({ ...extractedData, registrationDate: val, startDate: val })}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Sale Consideration (₹)
                      </label>
                      <input
                        type="text"
                        value={extractedData.saleConsideration || extractedData.totalRent || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, saleConsideration: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Executive Summary
                </label>
                <textarea
                  rows={2}
                  value={extractedData.rawSummary || ''}
                  onChange={(e) => setExtractedData({ ...extractedData, rawSummary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
