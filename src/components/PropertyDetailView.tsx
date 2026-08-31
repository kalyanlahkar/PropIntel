import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ArrowLeft, 
  MapPin, 
  FileText, 
  Coins, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  Camera, 
  Edit3, 
  Save, 
  Bot, 
  FileCheck,
  AlertTriangle,
  AlertCircle,
  Download,
  FileSearch,
  Check,
  Trash2,
  TrendingUp,
  Clock,
  Eye,
  ExternalLink,
  X,
  Loader2
} from 'lucide-react';
import { PropertyRecord, PropertyType, ExtractedPropertyData, INDIAN_STATES } from '../types';
import DocumentUploader from './DocumentUploader';
import { calculateCurrentRent } from '../utils/rentCalculator';
import { DateInputField } from './DateInputField';
import { formatDisplayDate, formatDateToDDMMYYYY, validateLeaseDateRange, getDaysRemainingFromDate } from '../utils/dateFormatter';
import { getPropertyDocuments, deleteDocument, updatePropertyInDb } from '../supabaseClient';
import { TaxStatusBadge } from './TaxStatusBadge';
import { isTaxOverdue } from '../utils/taxCalculator';

interface PropertyDetailViewProps {
  property: PropertyRecord;
  onBack: () => void;
  onNavigateToCapture: (propertyCode: string) => void;
  onNavigateToChatWithProperty: (propertyCode: string) => void;
  onUpdateProperty: (updatedProperty: PropertyRecord) => void;
  onDeleteProperty?: (id: string) => void;
}

export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  property,
  onBack,
  onNavigateToCapture,
  onNavigateToChatWithProperty,
  onUpdateProperty,
  onDeleteProperty
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(property.title || property.propertyTitle || property.property_title || '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [editedLocation, setEditedLocation] = useState(property.location);
  const [editedState, setEditedState] = useState(property.state || 'Assam');
  const [editedLeaseValidUpto, setEditedLeaseValidUpto] = useState(property.leaseValidUpto === '---' ? '' : property.leaseValidUpto || '');
  const [editedInitialRent, setEditedInitialRent] = useState<string>(
    property.initialRent !== undefined && property.initialRent !== null
      ? String(property.initialRent)
      : property.monthlyRent !== undefined && property.monthlyRent !== null
      ? String(property.monthlyRent)
      : ''
  );
  const [editedStartDate, setEditedStartDate] = useState(property.leaseStartDate || '');
  const [editedEscalation, setEditedEscalation] = useState(
    property.escalationPercentage !== undefined && property.escalationPercentage !== null
      ? String(property.escalationPercentage)
      : ''
  );
  const [editedRevisionPeriod, setEditedRevisionPeriod] = useState(
    property.revisionPeriodYears !== undefined && property.revisionPeriodYears !== null
      ? String(property.revisionPeriodYears)
      : ''
  );
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const [activeDocIndex, setActiveDocIndex] = useState(0);

  useEffect(() => {
    setEditedTitle(property.title || property.propertyTitle || property.property_title || '');
    setEditedLocation(property.location || '');
    setEditedState(property.state || 'Assam');
    setEditedLeaseValidUpto(property.leaseValidUpto === '---' ? '' : property.leaseValidUpto || '');
    setEditedStartDate(property.leaseStartDate || '');
    setEditedInitialRent(
      property.initialRent !== undefined && property.initialRent !== null
        ? String(property.initialRent)
        : property.monthlyRent !== undefined && property.monthlyRent !== null
        ? String(property.monthlyRent)
        : ''
    );
    setEditedEscalation(
      property.escalationPercentage !== undefined && property.escalationPercentage !== null
        ? String(property.escalationPercentage)
        : ''
    );
    setEditedRevisionPeriod(
      property.revisionPeriodYears !== undefined && property.revisionPeriodYears !== null
        ? String(property.revisionPeriodYears)
        : ''
    );
    setTitleError(null);
    setDateRangeError(null);
  }, [property]);

  const handleStartDateChange = (newStart: string) => {
    setEditedStartDate(newStart);
    const err = validateLeaseDateRange(newStart, editedLeaseValidUpto);
    setDateRangeError(err);
  };

  const handleLeaseValidUptoChange = (newExpiry: string) => {
    setEditedLeaseValidUpto(newExpiry);
    const err = validateLeaseDateRange(editedStartDate, newExpiry);
    setDateRangeError(err);
  };

  const initialRentValue = property.initialRent ?? property.monthlyRent ?? null;
  const currentRentValue = calculateCurrentRent(
    property.leaseStartDate,
    initialRentValue,
    property.escalationPercentage,
    property.revisionPeriodYears
  );

  const handleUploadComplete = (publicUrl: string, filePath: string, extractedMetrics?: any) => {
    const docCategory = (extractedMetrics?.documentType || 'Lease Deed') as PropertyType;
    const newDoc = {
      id: `doc-${Date.now()}`,
      fileName: filePath,
      documentType: docCategory,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'Verified' as const,
      fileUrl: publicUrl,
      extractedData: {
        carpetArea: extractedMetrics?.carpetArea || undefined,
        totalRent: extractedMetrics?.totalRent ? String(extractedMetrics.totalRent) : undefined,
        initialRent: extractedMetrics?.totalRent ? Number(extractedMetrics.totalRent) : undefined,
        rentPerSqFt: extractedMetrics?.rentPerSqFt ? String(extractedMetrics.rentPerSqFt) : undefined,
        leaseStartDate: extractedMetrics?.leaseStartDate || undefined,
        startDate: extractedMetrics?.leaseStartDate || extractedMetrics?.startDate || undefined,
        expiryDate: extractedMetrics?.leaseValidUpto || extractedMetrics?.tradeLicenseValidity || extractedMetrics?.insuranceValidity || '---',
        leaseValidUpto: extractedMetrics?.leaseValidUpto || undefined,
        insuranceValidity: extractedMetrics?.insuranceValidity || undefined,
        tradeLicenseValidity: extractedMetrics?.tradeLicenseValidity || undefined,
        sumInsured: extractedMetrics?.sumInsured || undefined,
        premiumAmount: extractedMetrics?.premiumAmount || undefined,
        policyNo: extractedMetrics?.policyNo || extractedMetrics?.policyNumber || undefined,
        policyNumber: extractedMetrics?.policyNo || extractedMetrics?.policyNumber || undefined,
        insuranceProvider: extractedMetrics?.insuranceProvider || undefined,
        insuredEntity: extractedMetrics?.insuredEntity || undefined,
        licenseNumber: extractedMetrics?.licenseNumber || undefined,
        issuingAuthority: extractedMetrics?.issuingAuthority || undefined,
        licensee: extractedMetrics?.licensee || undefined,
        tradeCategory: extractedMetrics?.tradeCategory || undefined,
        certificateNumber: extractedMetrics?.certificateNumber || undefined,
        searchPeriod: extractedMetrics?.searchPeriod || undefined,
        buyer: extractedMetrics?.buyer || undefined,
        seller: extractedMetrics?.seller || undefined,
        saleConsideration: extractedMetrics?.saleConsideration || undefined,
        registrationDate: extractedMetrics?.registrationDate || undefined,
        propertyDescription: extractedMetrics?.propertyDescription || undefined,
        escalationPercentage: extractedMetrics?.escalationPercentage !== undefined ? extractedMetrics.escalationPercentage : undefined,
        revisionPeriodYears: extractedMetrics?.revisionPeriodYears !== undefined ? extractedMetrics.revisionPeriodYears : undefined,
        escalationClause: extractedMetrics?.escalationPercentage 
          ? `${extractedMetrics.escalationPercentage}% every ${extractedMetrics.revisionPeriodYears || 1} years` 
          : undefined,
        lessee: extractedMetrics?.lessee || undefined,
        lessor: extractedMetrics?.lessor || undefined,
        rawSummary: extractedMetrics?.rawSummary || `Uploaded to Supabase storage (${filePath}).`,
        keyRisks: extractedMetrics?.keyRisks || []
      }
    };

    const updatedProperty: PropertyRecord = {
      ...property,
      carpetAreaSqFt: extractedMetrics?.carpetArea
        ? parseFloat(String(extractedMetrics.carpetArea).replace(/[^0-9.]/g, '')) || property.carpetAreaSqFt
        : property.carpetAreaSqFt,
      monthlyRent: extractedMetrics?.totalRent !== undefined ? Number(extractedMetrics.totalRent) : property.monthlyRent,
      initialRent: extractedMetrics?.totalRent !== undefined ? Number(extractedMetrics.totalRent) : (property.initialRent ?? property.monthlyRent),
      leaseStartDate: extractedMetrics?.leaseStartDate || property.leaseStartDate,
      escalationPercentage: extractedMetrics?.escalationPercentage !== undefined ? extractedMetrics.escalationPercentage : property.escalationPercentage,
      revisionPeriodYears: extractedMetrics?.revisionPeriodYears !== undefined ? extractedMetrics.revisionPeriodYears : property.revisionPeriodYears,
      leaseValidUpto: extractedMetrics?.leaseValidUpto || property.leaseValidUpto,
      insuranceValidUpto: extractedMetrics?.insuranceValidity || property.insuranceValidUpto,
      insuranceValidity: extractedMetrics?.insuranceValidity || property.insuranceValidity,
      policyNo: extractedMetrics?.policyNo || extractedMetrics?.policyNumber || property.policyNo,
      policy_no: extractedMetrics?.policyNo || extractedMetrics?.policyNumber || property.policy_no,
      sumInsured: extractedMetrics?.sumInsured !== undefined ? extractedMetrics.sumInsured : property.sumInsured,
      sum_insured: extractedMetrics?.sumInsured !== undefined ? extractedMetrics.sumInsured : property.sum_insured,
      premiumAmount: extractedMetrics?.premiumAmount !== undefined ? extractedMetrics.premiumAmount : property.premiumAmount,
      premium_amount: extractedMetrics?.premiumAmount !== undefined ? extractedMetrics.premiumAmount : property.premium_amount,
      tradeLicenseValidUpto: extractedMetrics?.tradeLicenseValidity || property.tradeLicenseValidUpto,
      ownerOrLessee: extractedMetrics?.lessee || property.ownerOrLessee,
      documents: [...(property.documents || []), newDoc]
    };

    onUpdateProperty(updatedProperty);
    setActiveDocIndex((property.documents?.length || 0));
  };

  const handleSavePropertyEdits = () => {
    // Validate property title
    const cleanTitle = editedTitle.trim();
    if (!cleanTitle) {
      setTitleError('Please provide a Property Title to name this property.');
      return;
    }

    // Validate lease date range
    const rangeError = validateLeaseDateRange(editedStartDate, editedLeaseValidUpto);
    if (rangeError) {
      setDateRangeError(rangeError);
      alert(rangeError);
      return;
    }

    const parsedRent = editedInitialRent ? parseFloat(editedInitialRent) : undefined;
    const parsedEscalation = editedEscalation ? parseFloat(editedEscalation) : undefined;
    const parsedRevision = editedRevisionPeriod ? parseFloat(editedRevisionPeriod) : undefined;

    const updated: PropertyRecord = {
      ...property,
      title: cleanTitle,
      propertyTitle: cleanTitle,
      property_title: cleanTitle,
      location: editedLocation.trim(),
      state: editedState,
      leaseValidUpto: editedLeaseValidUpto && editedLeaseValidUpto.trim() !== '' ? editedLeaseValidUpto : undefined,
      initialRent: parsedRent,
      monthlyRent: parsedRent,
      leaseStartDate: editedStartDate || undefined,
      escalationPercentage: parsedEscalation,
      revisionPeriodYears: parsedRevision
    };

    onUpdateProperty(updated);
    setIsEditing(false);
    setTitleError(null);
    setDateRangeError(null);
  };

  // Extracted intelligence fields editing state across document types
  const [isEditingExtractedFields, setIsEditingExtractedFields] = useState(false);
  
  // Lease Deed fields
  const [extractedLessee, setExtractedLessee] = useState('');
  const [extractedLessor, setExtractedLessor] = useState('');
  const [extractedCommencementDate, setExtractedCommencementDate] = useState('');
  const [extractedLeaseValidUpto, setExtractedLeaseValidUpto] = useState('');
  const [extractedInitialRent, setExtractedInitialRent] = useState('');
  const [extractedEscalationPercentage, setExtractedEscalationPercentage] = useState('');
  const [extractedRevisionPeriodYears, setExtractedRevisionPeriodYears] = useState('1');
  const [extractedCarpetArea, setExtractedCarpetArea] = useState('');
  const [extractedNoticePeriod, setExtractedNoticePeriod] = useState('');
  const [extractedSecurityDeposit, setExtractedSecurityDeposit] = useState('');

  // Insurance fields
  const [extractedPolicyNo, setExtractedPolicyNo] = useState('');
  const [extractedInsuredEntity, setExtractedInsuredEntity] = useState('');
  const [extractedInsuranceValidUpto, setExtractedInsuranceValidUpto] = useState('');
  const [extractedSumInsured, setExtractedSumInsured] = useState('');
  const [extractedPremiumAmount, setExtractedPremiumAmount] = useState('');

  // Municipality Tax fields
  const [extractedHoldingNumber, setExtractedHoldingNumber] = useState('');
  const [extractedTaxFinancialYear, setExtractedTaxFinancialYear] = useState('');
  const [extractedTaxPaidAmount, setExtractedTaxPaidAmount] = useState('');

  // Trade License fields
  const [extractedLicenseNumber, setExtractedLicenseNumber] = useState('');
  const [extractedIssuingAuthority, setExtractedIssuingAuthority] = useState('');
  const [extractedLicensee, setExtractedLicensee] = useState('');
  const [extractedTradeStartDate, setExtractedTradeStartDate] = useState('');
  const [extractedTradeExpiryDate, setExtractedTradeExpiryDate] = useState('');
  const [extractedTradeCategory, setExtractedTradeCategory] = useState('');
  const [extractedTradePremisesArea, setExtractedTradePremisesArea] = useState('');

  // Encumbrance Certificate & Generic fields
  const [extractedCertificateNumber, setExtractedCertificateNumber] = useState('');
  const [extractedPropertyDesc, setExtractedPropertyDesc] = useState('');
  const [extractedSearchPeriodStart, setExtractedSearchPeriodStart] = useState('');
  const [extractedSearchPeriodEnd, setExtractedSearchPeriodEnd] = useState('');

  // Sale Deed fields
  const [extractedBuyer, setExtractedBuyer] = useState('');
  const [extractedSeller, setExtractedSeller] = useState('');
  const [extractedRegistrationDate, setExtractedRegistrationDate] = useState('');
  const [extractedSaleConsideration, setExtractedSaleConsideration] = useState('');

  const [extractedFieldErrors, setExtractedFieldErrors] = useState<Record<string, string>>({});
  const [isSavingExtractedFields, setIsSavingExtractedFields] = useState(false);
  const [extractedSaveSuccess, setExtractedSaveSuccess] = useState(false);

  // Database presence flags for non-null enforcement
  const dbExistingValues = {
    // Lease
    lessee: Boolean(property.lessee || property.ownerOrLessee),
    lessor: Boolean(property.lessor),
    leaseStartDate: Boolean(property.leaseStartDate),
    leaseValidUpto: Boolean(property.leaseValidUpto && property.leaseValidUpto !== '---'),
    rent: Boolean(property.initialRent !== undefined && property.initialRent !== null && Number(property.initialRent) > 0) || Boolean(property.monthlyRent !== undefined && property.monthlyRent !== null && Number(property.monthlyRent) > 0),
    carpetArea: Boolean(property.carpetAreaSqFt && Number(property.carpetAreaSqFt) > 0),

    // Insurance
    policyNo: Boolean(property.policyNo || property.policy_no),
    insuredEntity: Boolean(property.title),
    insuranceValidUpto: Boolean(property.insuranceValidUpto || property.insuranceValidity),
    sumInsured: Boolean(property.sumInsured !== undefined && property.sumInsured !== null && property.sumInsured !== ''),
    premiumAmount: Boolean((property.premiumAmount !== undefined && property.premiumAmount !== null && Number(property.premiumAmount) > 0) || (property.premium_amount !== undefined && property.premium_amount !== null && Number(property.premium_amount) > 0)),

    // Municipality Tax
    holdingNumber: Boolean(property.holdingNumber || property.holding_number),
    taxFinancialYear: Boolean(property.latestTaxFinancialYear || property.latest_tax_financial_year),
    taxPaidAmount: Boolean((property.latestTaxAmount !== undefined && property.latestTaxAmount !== null && Number(property.latestTaxAmount) > 0) || (property.latest_tax_amount !== undefined && property.latest_tax_amount !== null && Number(property.latest_tax_amount) > 0)),

    // Trade License
    tradeLicenseValidity: Boolean(property.tradeLicenseValidity || property.trade_license_valid_upto),
  };

  const startEditingExtractedFields = () => {
    const currentDocObj = property.documents?.[activeDocIndex];
    const currentExt = currentDocObj?.extractedData || {};

    // Lease Deed
    setExtractedLessee(currentExt.lessee || property.lessee || property.ownerOrLessee || '');
    setExtractedLessor(currentExt.lessor || property.lessor || '');
    setExtractedCommencementDate(currentExt.leaseStartDate || currentExt.startDate || property.leaseStartDate || '');
    setExtractedLeaseValidUpto(currentExt.expiryDate || property.leaseValidUpto || '');
    setExtractedInitialRent(
      currentExt.totalRent !== undefined && currentExt.totalRent !== null
        ? String(currentExt.totalRent)
        : property.initialRent !== undefined && property.initialRent !== null
        ? String(property.initialRent)
        : property.monthlyRent !== undefined && property.monthlyRent !== null
        ? String(property.monthlyRent)
        : ''
    );
    setExtractedEscalationPercentage(
      currentExt.escalationPercentage !== undefined && currentExt.escalationPercentage !== null
        ? String(currentExt.escalationPercentage)
        : property.escalationPercentage !== undefined && property.escalationPercentage !== null
        ? String(property.escalationPercentage)
        : ''
    );
    setExtractedRevisionPeriodYears(
      currentExt.revisionPeriodYears !== undefined && currentExt.revisionPeriodYears !== null
        ? String(currentExt.revisionPeriodYears)
        : property.revisionPeriodYears !== undefined && property.revisionPeriodYears !== null
        ? String(property.revisionPeriodYears)
        : '1'
    );
    setExtractedCarpetArea(
      currentExt.carpetArea !== undefined && currentExt.carpetArea !== null
        ? String(currentExt.carpetArea)
        : property.carpetAreaSqFt
        ? String(property.carpetAreaSqFt)
        : ''
    );
    setExtractedNoticePeriod(currentExt.noticePeriod || '');
    setExtractedSecurityDeposit(currentExt.securityDeposit || '');

    // Insurance
    setExtractedPolicyNo(currentExt.policyNo || currentExt.policyNumber || property.policyNo || property.policy_no || currentExt.licenseNumber || '');
    setExtractedInsuredEntity(currentExt.insuredEntity || currentExt.lessee || property.title || '');
    setExtractedInsuranceValidUpto(property.insuranceValidUpto || currentExt.insuranceValidity || currentExt.expiryDate || '');
    setExtractedSumInsured(
      property.sumInsured !== undefined && property.sumInsured !== null && property.sumInsured !== ''
        ? String(property.sumInsured)
        : currentExt.sumInsured !== undefined && currentExt.sumInsured !== null && currentExt.sumInsured !== ''
        ? String(currentExt.sumInsured)
        : ''
    );
    setExtractedPremiumAmount(
      currentExt.premiumAmount !== undefined && currentExt.premiumAmount !== null
        ? String(currentExt.premiumAmount)
        : property.premiumAmount !== undefined && property.premiumAmount !== null
        ? String(property.premiumAmount)
        : property.premium_amount !== undefined && property.premium_amount !== null
        ? String(property.premium_amount)
        : ''
    );

    // Municipality Tax
    setExtractedHoldingNumber(currentExt.holdingNumber || property.holdingNumber || property.holding_number || '');
    setExtractedTaxFinancialYear(currentExt.taxFinancialYear || property.latestTaxFinancialYear || property.latest_tax_financial_year || '');
    setExtractedTaxPaidAmount(
      currentExt.taxPaidAmount !== undefined && currentExt.taxPaidAmount !== null
        ? String(currentExt.taxPaidAmount)
        : property.latestTaxAmount !== undefined && property.latestTaxAmount !== null
        ? String(property.latestTaxAmount)
        : property.latest_tax_amount !== undefined && property.latest_tax_amount !== null
        ? String(property.latest_tax_amount)
        : ''
    );

    // Trade License
    setExtractedLicenseNumber(currentExt.licenseNumber || '');
    setExtractedIssuingAuthority(currentExt.issuingAuthority || currentExt.lessor || '');
    setExtractedLicensee(currentExt.licensee || currentExt.lessee || property.title || '');
    setExtractedTradeStartDate(currentExt.startDate || '');
    setExtractedTradeExpiryDate(currentExt.tradeLicenseValidity || currentExt.expiryDate || property.tradeLicenseValidity || '');
    setExtractedTradeCategory(currentExt.tradeCategory || 'Commercial / Retail');
    setExtractedTradePremisesArea(currentExt.carpetArea ? String(currentExt.carpetArea) : '');

    // Encumbrance Certificate
    setExtractedCertificateNumber(currentExt.certificateNumber || currentExt.licenseNumber || '');
    setExtractedPropertyDesc(currentExt.propertyDescription || '');
    setExtractedSearchPeriodStart(currentExt.startDate || '');
    setExtractedSearchPeriodEnd(currentExt.expiryDate || '');

    // Sale Deed
    setExtractedBuyer(currentExt.buyer || currentExt.lessee || property.ownerOrLessee || '');
    setExtractedSeller(currentExt.seller || currentExt.lessor || '');
    setExtractedRegistrationDate(currentExt.registrationDate || currentExt.startDate || '');
    setExtractedSaleConsideration(
      currentExt.saleConsideration !== undefined && currentExt.saleConsideration !== null
        ? String(currentExt.saleConsideration)
        : currentExt.totalRent !== undefined && currentExt.totalRent !== null
        ? String(currentExt.totalRent)
        : ''
    );

    setExtractedFieldErrors({});
    setIsEditingExtractedFields(true);
  };

  const hasExtractedViolations = () => {
    const docType = currentDoc?.documentType;
    if (docType === 'Lease Deed') {
      return Boolean(
        (dbExistingValues.lessee && !extractedLessee.trim()) ||
        (dbExistingValues.lessor && !extractedLessor.trim()) ||
        (dbExistingValues.leaseStartDate && !extractedCommencementDate.trim()) ||
        (dbExistingValues.leaseValidUpto && !extractedLeaseValidUpto.trim()) ||
        (dbExistingValues.rent && (!extractedInitialRent.trim() || Number(extractedInitialRent) <= 0)) ||
        (dbExistingValues.carpetArea && (!extractedCarpetArea.trim() || Number(extractedCarpetArea) <= 0))
      );
    }
    if (docType === 'Insurance') {
      return Boolean(
        (dbExistingValues.policyNo && !extractedPolicyNo.trim()) ||
        (dbExistingValues.insuranceValidUpto && !extractedInsuranceValidUpto.trim()) ||
        (dbExistingValues.sumInsured && !extractedSumInsured.trim()) ||
        (dbExistingValues.premiumAmount && (!extractedPremiumAmount.trim() || Number(extractedPremiumAmount) <= 0))
      );
    }
    if (docType === 'Municipality Tax') {
      return Boolean(
        (dbExistingValues.holdingNumber && !extractedHoldingNumber.trim()) ||
        (dbExistingValues.taxFinancialYear && !extractedTaxFinancialYear.trim()) ||
        (dbExistingValues.taxPaidAmount && (!extractedTaxPaidAmount.trim() || Number(extractedTaxPaidAmount) <= 0))
      );
    }
    if (docType === 'Trade License') {
      return Boolean(
        (dbExistingValues.tradeLicenseValidity && !extractedTradeExpiryDate.trim())
      );
    }
    return false;
  };

  const handleSaveExtractedFields = async () => {
    const errors: Record<string, string> = {};
    const docType = currentDoc?.documentType;

    if (docType === 'Lease Deed') {
      // 1. Lessee check
      if (dbExistingValues.lessee && !extractedLessee.trim()) {
        errors.lessee = 'Lessee / Tenant Name cannot be empty because a value exists in the database.';
      }
      // 2. Lessor check
      if (dbExistingValues.lessor && !extractedLessor.trim()) {
        errors.lessor = 'Lessor / Landlord Name cannot be empty because a value exists in the database.';
      }
      // 3. Commencement Date check
      if (dbExistingValues.leaseStartDate && !extractedCommencementDate.trim()) {
        errors.leaseStartDate = 'Commencement date cannot be empty because a value exists in the database.';
      }
      // 4. Lease Valid Upto check
      if (dbExistingValues.leaseValidUpto && !extractedLeaseValidUpto.trim()) {
        errors.leaseValidUpto = 'Lease valid upto date cannot be empty because a value exists in the database.';
      }
      if (extractedCommencementDate.trim() && extractedLeaseValidUpto.trim()) {
        const dateErr = validateLeaseDateRange(extractedCommencementDate, extractedLeaseValidUpto);
        if (dateErr) {
          errors.dateRange = dateErr;
        }
      }
      // 5. Rent check
      if (dbExistingValues.rent && (!extractedInitialRent.trim() || isNaN(parseFloat(extractedInitialRent)) || parseFloat(extractedInitialRent) <= 0)) {
        errors.rent = 'Rent amount cannot be empty or zero because a value exists in the database.';
      }
      // 6. Carpet Area check
      if (dbExistingValues.carpetArea && (!extractedCarpetArea.trim() || isNaN(parseFloat(extractedCarpetArea)) || parseFloat(extractedCarpetArea) <= 0)) {
        errors.carpetArea = 'Carpet area cannot be empty or zero because a value exists in the database.';
      }
    } else if (docType === 'Insurance') {
      // 1. Policy Number check
      if (dbExistingValues.policyNo && !extractedPolicyNo.trim()) {
        errors.policyNo = 'Policy Number cannot be empty because a value exists in the database.';
      }
      // 2. Insurance Valid Upto check
      if (dbExistingValues.insuranceValidUpto && !extractedInsuranceValidUpto.trim()) {
        errors.insuranceValidUpto = 'Insurance validity date cannot be empty because a value exists in the database.';
      }
      // 3. Sum Insured check
      if (dbExistingValues.sumInsured && !extractedSumInsured.trim()) {
        errors.sumInsured = 'Sum Insured cannot be empty because a value exists in the database.';
      }
      // 4. Premium Amount check
      if (dbExistingValues.premiumAmount && (!extractedPremiumAmount.trim() || isNaN(parseFloat(extractedPremiumAmount.replace(/,/g, ''))) || parseFloat(extractedPremiumAmount.replace(/,/g, '')) <= 0)) {
        errors.premiumAmount = 'Premium amount cannot be empty or zero because a value exists in the database.';
      }
    } else if (docType === 'Municipality Tax') {
      // 1. Holding Number check
      if (dbExistingValues.holdingNumber && !extractedHoldingNumber.trim()) {
        errors.holdingNumber = 'Holding Number cannot be empty because a value exists in the database.';
      }
      // 2. Financial Year check
      if (dbExistingValues.taxFinancialYear && !extractedTaxFinancialYear.trim()) {
        errors.taxFinancialYear = 'Financial Year cannot be empty because a value exists in the database.';
      }
      if (extractedTaxFinancialYear.trim() && !/^\d{4}-\d{4}$/.test(extractedTaxFinancialYear.trim())) {
        errors.taxFinancialYearFormat = 'Financial Year must strictly follow YYYY-YYYY format (e.g. 2025-2026).';
      }
      // 3. Tax Paid Amount check
      if (dbExistingValues.taxPaidAmount && (!extractedTaxPaidAmount.trim() || isNaN(parseFloat(extractedTaxPaidAmount.replace(/,/g, ''))) || parseFloat(extractedTaxPaidAmount.replace(/,/g, '')) <= 0)) {
        errors.taxPaidAmount = 'Tax paid amount cannot be empty or zero because a value exists in the database.';
      }
    } else if (docType === 'Trade License') {
      // Trade License validity check
      if (dbExistingValues.tradeLicenseValidity && !extractedTradeExpiryDate.trim()) {
        errors.tradeLicenseValidity = 'Trade license validity date cannot be empty because a value exists in the database.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setExtractedFieldErrors(errors);
      return;
    }

    setIsSavingExtractedFields(true);
    try {
      const currentActiveDoc = property.documents?.[activeDocIndex];
      let docExtractedPatch: Record<string, any> = {};
      let propPatch: Partial<PropertyRecord> = {};
      let dbPayload: Record<string, any> = {};

      if (docType === 'Lease Deed') {
        const cleanLessee = extractedLessee.trim() || undefined;
        const cleanLessor = extractedLessor.trim() || undefined;
        const cleanStartDate = extractedCommencementDate.trim() || undefined;
        const cleanExpiryDate = extractedLeaseValidUpto.trim() || undefined;
        const cleanRent = extractedInitialRent.trim() ? parseFloat(extractedInitialRent) : undefined;
        const cleanEscalation = extractedEscalationPercentage.trim() ? parseFloat(extractedEscalationPercentage) : undefined;
        const cleanRevision = extractedRevisionPeriodYears.trim() ? parseFloat(extractedRevisionPeriodYears) : undefined;
        const cleanCarpet = extractedCarpetArea.trim() ? parseFloat(extractedCarpetArea) : undefined;

        docExtractedPatch = {
          lessee: cleanLessee,
          lessor: cleanLessor,
          leaseStartDate: cleanStartDate,
          startDate: cleanStartDate,
          expiryDate: cleanExpiryDate,
          totalRent: cleanRent,
          escalationPercentage: cleanEscalation,
          revisionPeriodYears: cleanRevision,
          carpetArea: cleanCarpet,
          noticePeriod: extractedNoticePeriod.trim() || undefined,
          securityDeposit: extractedSecurityDeposit.trim() || undefined,
        };

        propPatch = {
          lessee: cleanLessee,
          ownerOrLessee: cleanLessee,
          lessor: cleanLessor,
          leaseStartDate: cleanStartDate,
          leaseValidUpto: cleanExpiryDate,
          monthlyRent: cleanRent,
          initialRent: cleanRent,
          escalationPercentage: cleanEscalation,
          revisionPeriodYears: cleanRevision,
          carpetAreaSqFt: cleanCarpet,
        };

        dbPayload = {
          lessee: cleanLessee,
          lessor: cleanLessor,
          lease_start_date: cleanStartDate,
          lease_valid_upto: cleanExpiryDate,
          total_rent: cleanRent,
          carpet_area: cleanCarpet,
          escalation_percentage: cleanEscalation,
          revision_period_years: cleanRevision
        };
      } else if (docType === 'Insurance') {
        const cleanPolicy = extractedPolicyNo.trim() || undefined;
        const cleanEntity = extractedInsuredEntity.trim() || undefined;
        const cleanInsVal = extractedInsuranceValidUpto.trim() || undefined;
        const cleanSum = extractedSumInsured.trim() ? (isNaN(Number(extractedSumInsured.replace(/,/g, ''))) ? extractedSumInsured.trim() : Number(extractedSumInsured.replace(/,/g, ''))) : undefined;
        const cleanPrem = extractedPremiumAmount.trim() ? parseFloat(extractedPremiumAmount.replace(/,/g, '')) : undefined;

        docExtractedPatch = {
          policyNo: cleanPolicy,
          policyNumber: cleanPolicy,
          insuredEntity: cleanEntity,
          insuranceValidity: cleanInsVal,
          expiryDate: cleanInsVal,
          sumInsured: cleanSum,
          premiumAmount: cleanPrem,
        };

        propPatch = {
          policyNo: cleanPolicy,
          insuranceValidUpto: cleanInsVal,
          insuranceValidity: cleanInsVal,
          sumInsured: cleanSum,
          premiumAmount: cleanPrem,
          premium_amount: cleanPrem,
        };

        dbPayload = {
          policy_no: cleanPolicy,
          insurance_valid_upto: cleanInsVal,
          insurance_validity: cleanInsVal,
          sum_insured: cleanSum,
          premium_amount: cleanPrem,
        };
      } else if (docType === 'Municipality Tax') {
        const cleanHolding = extractedHoldingNumber.trim() || undefined;
        const cleanFY = extractedTaxFinancialYear.trim() || undefined;
        const cleanAmt = extractedTaxPaidAmount.trim() ? parseFloat(extractedTaxPaidAmount.replace(/,/g, '')) : undefined;

        docExtractedPatch = {
          holdingNumber: cleanHolding,
          taxFinancialYear: cleanFY,
          taxPaidAmount: cleanAmt,
        };

        propPatch = {
          holdingNumber: cleanHolding,
          holding_number: cleanHolding,
          latestTaxFinancialYear: cleanFY,
          latest_tax_financial_year: cleanFY,
          latestTaxAmount: cleanAmt,
          latest_tax_amount: cleanAmt,
        };

        dbPayload = {
          holding_number: cleanHolding,
          latest_tax_financial_year: cleanFY,
          latest_tax_amount: cleanAmt,
        };
      } else if (docType === 'Trade License') {
        const cleanLic = extractedLicenseNumber.trim() || undefined;
        const cleanAuth = extractedIssuingAuthority.trim() || undefined;
        const cleanLicName = extractedLicensee.trim() || undefined;
        const cleanStart = extractedTradeStartDate.trim() || undefined;
        const cleanExp = extractedTradeExpiryDate.trim() || undefined;
        const cleanCat = extractedTradeCategory.trim() || undefined;
        const cleanPrem = extractedTradePremisesArea.trim() ? parseFloat(extractedTradePremisesArea) : undefined;

        docExtractedPatch = {
          licenseNumber: cleanLic,
          issuingAuthority: cleanAuth,
          licensee: cleanLicName,
          startDate: cleanStart,
          tradeLicenseValidity: cleanExp,
          expiryDate: cleanExp,
          tradeCategory: cleanCat,
          carpetArea: cleanPrem,
        };

        propPatch = {
          tradeLicenseValidUpto: cleanExp,
        };

        dbPayload = {
          trade_license_valid_upto: cleanExp,
          trade_license_validity: cleanExp,
        };
      } else if (docType === 'Encumbrance Certificate') {
        docExtractedPatch = {
          certificateNumber: extractedCertificateNumber.trim() || undefined,
          licenseNumber: extractedCertificateNumber.trim() || undefined,
          propertyDescription: extractedPropertyDesc.trim() || undefined,
          startDate: extractedSearchPeriodStart.trim() || undefined,
          expiryDate: extractedSearchPeriodEnd.trim() || undefined,
        };
      } else if (docType === 'Sale Deed') {
        const cleanBuyer = extractedBuyer.trim() || undefined;
        const cleanSeller = extractedSeller.trim() || undefined;
        const cleanRegDate = extractedRegistrationDate.trim() || undefined;
        const cleanConsideration = extractedSaleConsideration.trim() ? (isNaN(Number(extractedSaleConsideration.replace(/,/g, ''))) ? extractedSaleConsideration.trim() : Number(extractedSaleConsideration.replace(/,/g, ''))) : undefined;
        const cleanCarpet = extractedCarpetArea.trim() ? parseFloat(extractedCarpetArea) : undefined;

        docExtractedPatch = {
          buyer: cleanBuyer,
          seller: cleanSeller,
          registrationDate: cleanRegDate,
          saleConsideration: cleanConsideration,
          carpetArea: cleanCarpet,
        };

        propPatch = {
          ownerOrLessee: cleanBuyer,
          lessee: cleanBuyer,
          lessor: cleanSeller,
          leaseStartDate: cleanRegDate,
          carpetAreaSqFt: cleanCarpet,
        };

        dbPayload = {
          lessee: cleanBuyer,
          lessor: cleanSeller,
          lease_start_date: cleanRegDate,
          carpet_area: cleanCarpet,
        };
      }

      // Update document list
      const updatedDocs = (property.documents || []).map((doc, idx) => {
        if (idx === activeDocIndex || (currentActiveDoc && doc.id === currentActiveDoc.id)) {
          return {
            ...doc,
            extractedData: {
              ...(doc.extractedData || {}),
              ...docExtractedPatch,
            }
          };
        }
        return doc;
      });

      const updatedProp: PropertyRecord = {
        ...property,
        ...propPatch,
        documents: updatedDocs
      };

      if (Object.keys(dbPayload).length > 0) {
        await updatePropertyInDb(property.code, dbPayload);
      }

      onUpdateProperty(updatedProp);
      setIsEditingExtractedFields(false);
      setExtractedFieldErrors({});
      setExtractedSaveSuccess(true);
      setTimeout(() => setExtractedSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving extracted fields:", err);
      setExtractedFieldErrors({ general: 'Failed to save to database. Please check connection and try again.' });
    } finally {
      setIsSavingExtractedFields(false);
    }
  };

  const [viewingDoc, setViewingDoc] = useState<{
    fileName: string;
    documentType: string;
    fileUrl: string;
    uploadDate?: string;
  } | null>(null);
  const [isLoadingDocUrl, setIsLoadingDocUrl] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [docDeleteSuccessMsg, setDocDeleteSuccessMsg] = useState<string | null>(null);

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    const doc = docToDelete;
    const docId = doc.id;
    const docType = doc.documentType || doc.document_type || 'Document';
    const fileUrl = doc.fileUrl || doc.file_url || doc.imageDataUrl || '';

    setIsDeletingDoc(true);
    try {
      const result = await deleteDocument(
        {
          id: docId,
          property_code: property.code,
          propertyCode: property.code,
          document_type: docType,
          documentType: docType,
          file_url: fileUrl,
          fileUrl: fileUrl,
        },
        {
          skipConfirm: true,
          showAlert: false,
        }
      );

      if (result.success) {
        // Remove document from local React state
        const remainingDocs = (property.documents || []).filter(
          (d: any) => String(d.id) !== String(docId)
        );

        let updatedProp: PropertyRecord = {
          ...property,
          documents: remainingDocs,
        };

        // Reset parent fields according to document_type
        if (docType === 'Insurance') {
          updatedProp = {
            ...updatedProp,
            insuranceValidUpto: undefined,
            insuranceValidity: undefined,
            insurance_validity: undefined,
            policyNo: undefined,
            policy_no: undefined,
            premiumAmount: undefined,
            premium_amount: undefined,
            sumInsured: undefined,
            sum_insured: undefined,
          };
        } else if (docType === 'Trade License') {
          updatedProp = {
            ...updatedProp,
            tradeLicenseValidUpto: undefined,
          };
        } else if (docType === 'Municipality Tax') {
          updatedProp = {
            ...updatedProp,
            holdingNumber: undefined,
            holding_number: undefined,
            latestTaxFinancialYear: undefined,
            latest_tax_financial_year: undefined,
            latestTaxAmount: undefined,
            latest_tax_amount: undefined,
          };
        } else if (docType === 'Lease Deed') {
          updatedProp = {
            ...updatedProp,
            carpetAreaSqFt: 0,
            monthlyRent: 0,
            initialRent: 0,
            rentPerSqFt: 0,
            leaseStartDate: undefined,
            leaseValidUpto: undefined,
            escalationPercentage: undefined,
            revisionPeriodYears: undefined,
            ownerOrLessee: undefined,
            lessor: undefined,
            lessee: undefined,
          };
        }

        // Notify parent state
        onUpdateProperty(updatedProp);

        // Adjust active index
        if (activeDocIndex >= remainingDocs.length) {
          setActiveDocIndex(Math.max(0, remainingDocs.length - 1));
        }

        // Close doc preview if viewing the deleted doc
        if (viewingDoc && (viewingDoc.fileName === doc.fileName || viewingDoc.fileUrl === fileUrl)) {
          setViewingDoc(null);
        }

        setDocToDelete(null);
        setDocDeleteSuccessMsg(`${docType} document successfully deleted.`);
        setTimeout(() => setDocDeleteSuccessMsg(null), 4000);
      } else {
        alert(result.error || 'Failed to delete document from Supabase');
      }
    } catch (err: any) {
      console.error('[confirmDeleteDoc] Error executing document delete:', err);
      alert(`Error deleting document: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const handleDeleteDocument = (doc: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!doc) return;
    setDocToDelete(doc);
  };

  const handleViewDocument = async (doc: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // 1. If doc already has a valid fileUrl, open immediately
    if (doc.fileUrl && String(doc.fileUrl).trim() !== '') {
      setViewingDoc({
        fileName: doc.fileName || `${property.code}-${doc.documentType || 'Document'}`,
        documentType: doc.documentType || 'Document',
        fileUrl: doc.fileUrl,
        uploadDate: doc.uploadDate
      });
      return;
    }

    // 2. Fetch directly from property_documents table using property_code
    try {
      setIsLoadingDocUrl(true);
      const docsFromDb = await getPropertyDocuments(property.code);
      
      const match = docsFromDb.find((d: any) => 
        (doc.id && String(d.id) === String(doc.id)) ||
        (doc.documentType && String(d.document_type).toLowerCase() === String(doc.documentType).toLowerCase()) ||
        (doc.fileName && d.file_url && d.file_url.includes(doc.fileName))
      ) || docsFromDb[0];

      if (match && match.file_url) {
        setViewingDoc({
          fileName: doc.fileName || match.file_url.split('/').pop() || `${property.code}-${match.document_type || 'Document'}`,
          documentType: match.document_type || doc.documentType || 'Document',
          fileUrl: match.file_url,
          uploadDate: match.uploaded_at ? String(match.uploaded_at).split('T')[0] : doc.uploadDate
        });
      } else {
        alert(`No document file URL found for property code ${property.code} in property_documents table.`);
      }
    } catch (err: any) {
      console.error("Error fetching file_url from property_documents:", err);
      alert(`Could not fetch document URL: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsLoadingDocUrl(false);
    }
  };

  const currentDoc = property.documents?.[activeDocIndex];
  const extracted: ExtractedPropertyData = currentDoc?.extractedData || {};

  const hasLeaseDeedUploaded = (property.documents || []).some(
    (d: any) => String(d.documentType || d.document_type || '').toLowerCase() === 'lease deed'
  );

  const hasLeaseDeedData = Boolean(
    hasLeaseDeedUploaded ||
    (property.monthlyRent !== undefined && property.monthlyRent !== null && Number(property.monthlyRent) > 0) ||
    (property.initialRent !== undefined && property.initialRent !== null && Number(property.initialRent) > 0) ||
    (property.leaseValidUpto && property.leaseValidUpto !== '---' && property.leaseValidUpto !== 'N/A' && property.leaseValidUpto.trim() !== '') ||
    (property.leaseStartDate && property.leaseStartDate !== '---' && property.leaseStartDate !== 'N/A' && property.leaseStartDate.trim() !== '') ||
    (property.escalationPercentage !== undefined && property.escalationPercentage !== null) ||
    (property.revisionPeriodYears !== undefined && property.revisionPeriodYears !== null)
  );

  const getLeaseBadge = () => {
    if (!hasLeaseDeedData) {
      return null;
    }

    if (!property.leaseValidUpto || property.leaseValidUpto === '---' || property.leaseValidUpto === 'N/A') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          No Lease Validity Set
        </span>
      );
    }

    const days = getDaysRemainingFromDate(property.leaseValidUpto);
    if (days === 999999) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          {formatDisplayDate(property.leaseValidUpto)}
        </span>
      );
    }

    if (days <= 0) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          Lease Expired ({Math.abs(days)} days ago)
        </span>
      );
    }

    if (days <= 60) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 animate-pulse" />
          Renewal in {days} days
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
        Valid Lease ({formatDisplayDate(property.leaseValidUpto)})
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Navigation Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateToChatWithProperty(property.code)}
            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all"
          >
            <Bot className="w-4 h-4 text-indigo-400" />
            <span>Query AI Assistant About {property.code}</span>
          </button>

          <button
            onClick={() => onNavigateToCapture(property.code)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-md active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>OCR Scan New Doc</span>
          </button>
        </div>
      </div>

      {/* Property Core Overview Card */}
      <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-start space-x-4">
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                  {property.code}
                </span>
                {getLeaseBadge()}
              </div>

              {isEditing ? (
                <div className="mt-2 space-y-1">
                  <input
                    type="text"
                    id="input-edit-property-title"
                    placeholder="Property Title / Name (Required)"
                    value={editedTitle}
                    onChange={(e) => {
                      setEditedTitle(e.target.value);
                      if (titleError) setTitleError(null);
                    }}
                    className={`text-lg font-bold text-white bg-[#0d0f14] border rounded-lg px-3 py-1.5 w-full focus:outline-none transition-colors ${
                      titleError ? 'border-rose-500/80 focus:border-rose-400 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  {titleError && (
                    <p className="text-xs text-rose-400 flex items-center pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                      {titleError}
                    </p>
                  )}
                </div>
              ) : (
                <h1 className="text-2xl font-extrabold text-white mt-1">{property.title}</h1>
              )}

              <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {isEditing ? (
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <input
                      type="text"
                      placeholder="Street Address / Location"
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      className="bg-[#0d0f14] border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs flex-1 focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={editedState}
                      onChange={(e) => setEditedState(e.target.value)}
                      className="bg-[#0d0f14] border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span>{property.location}, {property.state}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-center">
            {isEditing ? (
              <button
                onClick={handleSavePropertyEdits}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Save Property Edits</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Fields</span>
                </button>
                {onDeleteProperty && (
                  <button
                    onClick={() => onDeleteProperty(property.id)}
                    className="bg-rose-950/50 hover:bg-rose-900 text-rose-400 hover:text-rose-200 border border-rose-800/50 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Metrics Grid - Only shown if Lease Deed is uploaded or lease deed data is available */}
        {(hasLeaseDeedData || isEditing) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lease Validity Card */}
            <div className="bg-[#0d0f14] border border-slate-800/80 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Lease Validity</span>
              {isEditing ? (
                <div className="mt-2 space-y-1">
                  <label className="text-[10px] text-slate-500 block">Valid Upto (DD-MM-YYYY)</label>
                  <DateInputField
                    value={editedLeaseValidUpto}
                    onChange={handleLeaseValidUptoChange}
                    minDate={editedStartDate || undefined}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
              ) : (
                <div className="mt-1">
                  <span className="text-sm font-bold text-slate-200 font-mono block">
                    {property.leaseValidUpto ? formatDisplayDate(property.leaseValidUpto) : 'Not Specified'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {property.leaseStartDate ? `From ${formatDisplayDate(property.leaseStartDate)}` : 'Start date not set'}
                  </span>
                </div>
              )}
            </div>

            {/* Rent Overview: Initial Rent vs Prominent Current Rent */}
            <div className="bg-[#0d0f14] border border-slate-800/80 rounded-xl p-4 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Coins className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Rent Schedule</span>
                </span>
                {property.escalationPercentage && property.revisionPeriodYears ? (
                  <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>+{property.escalationPercentage}% every {property.revisionPeriodYears}y</span>
                  </span>
                ) : null}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Initial Rent</label>
                    <input
                      type="number"
                      value={editedInitialRent}
                      onChange={(e) => setEditedInitialRent(e.target.value)}
                      placeholder="Initial rent"
                      className="bg-[#1a1d23] border border-slate-800 text-white text-xs rounded px-2 py-1 mt-0.5 w-full font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Start (DD-MM-YYYY)</label>
                    <DateInputField
                      value={editedStartDate}
                      onChange={handleStartDateChange}
                      maxDate={editedLeaseValidUpto || undefined}
                      placeholder="DD-MM-YYYY"
                      className="mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Escalation %</label>
                    <input
                      type="number"
                      value={editedEscalation}
                      onChange={(e) => setEditedEscalation(e.target.value)}
                      placeholder="e.g. 10"
                      className="bg-[#1a1d23] border border-slate-800 text-white text-xs rounded px-2 py-1 mt-0.5 w-full font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Revision (Yrs)</label>
                    <input
                      type="number"
                      value={editedRevisionPeriod}
                      onChange={(e) => setEditedRevisionPeriod(e.target.value)}
                      placeholder="e.g. 5"
                      className="bg-[#1a1d23] border border-slate-800 text-white text-xs rounded px-2 py-1 mt-0.5 w-full font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {/* Initial Rent (grayed out / smaller) */}
                  <div className="flex items-baseline space-x-1.5 text-xs text-slate-500">
                    <span className="text-[11px] font-medium text-slate-400">Initial Rent:</span>
                    <span className="font-mono text-slate-400">
                      {initialRentValue !== null && initialRentValue !== undefined
                        ? `₹${initialRentValue.toLocaleString('en-IN')}`
                        : '---'}
                    </span>
                  </div>

                  {/* Separator */}
                  <span className="text-slate-600 text-xs">/</span>

                  {/* Current Rent (Prominently displayed right next to it) */}
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xs font-semibold text-slate-300">Current Rent:</span>
                    <span className="text-lg font-black text-emerald-400 font-mono tracking-tight">
                      {currentRentValue
                        ? `₹${currentRentValue.toLocaleString('en-IN')}`
                        : initialRentValue
                        ? `₹${initialRentValue.toLocaleString('en-IN')}`
                        : '---'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">/ month</span>
                  </div>

                  {property.leaseStartDate && (
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1 ml-auto">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Since {formatDisplayDate(property.leaseStartDate)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Document Repository & AI Extracted Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
        {/* Document Repository Navigation */}
        <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 w-full">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Attached Documents ({property.documents?.length || 0})</span>
            </h3>
          </div>

          {!property.documents || property.documents.length === 0 ? (
            <div className="p-6 text-center space-y-3 bg-[#0d0f14] rounded-xl border border-slate-800/60">
              <FileSearch className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No documents attached yet.</p>
              <button
                onClick={() => onNavigateToCapture(property.code)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-lg shadow-indigo-500/20"
              >
                Capture Document
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {property.documents.map((doc, idx) => (
                <div
                  key={doc.id}
                  id={`doc-card-${doc.id || idx}`}
                  onClick={() => setActiveDocIndex(idx)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    activeDocIndex === idx
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-lg ring-1 ring-indigo-500/20'
                      : 'bg-[#0d0f14] border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-100 block truncate max-w-full">
                        {doc.fileName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block pl-5.5">
                      Uploaded {formatDisplayDate(doc.uploadDate)} • {doc.documentType}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      id={`btn-view-doc-${doc.id || idx}`}
                      onClick={(e) => handleViewDocument(doc, e)}
                      disabled={isLoadingDocUrl}
                      title="View original document from Supabase"
                      className="bg-indigo-600/25 hover:bg-indigo-600/45 active:scale-95 text-indigo-200 hover:text-white border border-indigo-500/40 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all shadow-sm"
                    >
                      {isLoadingDocUrl ? (
                        <Loader2 className="w-3.5 h-3.5 text-indigo-300 animate-spin" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-indigo-300" />
                      )}
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      id={`btn-delete-doc-${doc.id || idx}`}
                      onClick={(e) => handleDeleteDocument(doc, e)}
                      disabled={isDeletingDoc && docToDelete?.id === doc.id}
                      title="Delete document permanently from Supabase & Storage"
                      className="bg-rose-950/40 hover:bg-rose-900/60 active:scale-95 text-rose-400 hover:text-rose-200 border border-rose-800/50 text-[11px] font-semibold px-2 py-1 rounded-lg flex items-center space-x-1 transition-all shadow-sm disabled:opacity-50"
                    >
                      {isDeletingDoc && docToDelete?.id === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 text-rose-300 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className="hidden sm:inline">Delete</span>
                    </button>

                    <span className="text-[10px] font-semibold bg-slate-800/90 border border-slate-700/80 text-slate-300 px-2 py-0.5 rounded-md">
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Supabase Document Uploader */}
          <div className="pt-2">
            <DocumentUploader
              propertyCode={property.code}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </div>

        {/* AI Extracted Structured Data (Human-in-the-Loop) */}
        <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 w-full">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-indigo-400" />
                <span>AI-Extracted Property Intelligence</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Parsed by Gemini Vision AI with confidence verification.
              </p>
            </div>

            {currentDoc && (
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                {isEditingExtractedFields ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingExtractedFields(false);
                        setExtractedFieldErrors({});
                      }}
                      disabled={isSavingExtractedFields}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveExtractedFields}
                      disabled={isSavingExtractedFields || hasExtractedViolations()}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                    >
                      {isSavingExtractedFields ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Extracted Terms</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startEditingExtractedFields}
                    className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Terms</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleViewDocument(currentDoc)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Original</span>
                </button>
                <button
                  type="button"
                  id="btn-delete-current-doc"
                  onClick={(e) => handleDeleteDocument(currentDoc, e)}
                  disabled={isDeletingDoc && docToDelete?.id === currentDoc.id}
                  title="Delete this document and reset its property fields"
                  className="bg-rose-950/50 hover:bg-rose-900 text-rose-400 hover:text-rose-200 border border-rose-800/60 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-md shadow-rose-950/30 active:scale-95 disabled:opacity-50"
                >
                  {isDeletingDoc && docToDelete?.id === currentDoc.id ? (
                    <Loader2 className="w-3.5 h-3.5 text-rose-300 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>Delete Document</span>
                </button>
                <span className="text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold px-3 py-1 rounded-full">
                  {currentDoc.documentType}
                </span>
              </div>
            )}
          </div>

          {extractedSaveSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Extracted terms successfully updated in property record and synchronized with database.</span>
            </div>
          )}

          {extractedFieldErrors.general && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{extractedFieldErrors.general}</span>
            </div>
          )}

          {!currentDoc ? (
            <p className="text-xs text-slate-500 italic py-8 text-center">
              Select or upload a document to view AI-extracted terms.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Executive Summary */}
              {extracted.rawSummary && (
                <div className="p-4 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Executive Summary</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{extracted.rawSummary}</p>
                </div>
              )}

              {/* Legal & Compliance Risks Highlight */}
              {extracted.keyRisks && extracted.keyRisks.length > 0 && (
                <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Legal &amp; Compliance Risk Flags</span>
                  </span>
                  <ul className="space-y-1">
                    {extracted.keyRisks.map((risk, idx) => (
                      <li key={idx} className="text-xs text-amber-200/90 flex items-start space-x-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Fields Table - Dynamically Adapted to Document Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {currentDoc.documentType === 'Lease Deed' && (
                  <>
                    {isEditingExtractedFields ? (
                      <>
                        {/* 1. Lessee / Tenant Name */}
                        <div className={`p-3.5 bg-[#0d0f14] border rounded-xl space-y-1.5 transition-colors ${dbExistingValues.lessee && !extractedLessee.trim() ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800'}`}>
                          <div className="flex items-center justify-between">
                            <label htmlFor="edit-lessee-name" className="text-[10px] text-slate-400 font-semibold uppercase">Lessee / Tenant Name</label>
                            {dbExistingValues.lessee && (
                              <span className="text-[9px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">DB Value Exists</span>
                            )}
                          </div>
                          <input
                            id="edit-lessee-name"
                            type="text"
                            value={extractedLessee}
                            onChange={(e) => setExtractedLessee(e.target.value)}
                            placeholder="e.g. Reliance Retail Ltd"
                            className={`w-full bg-[#0a0c10] border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${dbExistingValues.lessee && !extractedLessee.trim() ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-indigo-500'}`}
                          />
                          {dbExistingValues.lessee && !extractedLessee.trim() && (
                            <p className="text-[10px] text-rose-400 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Cannot be empty (value exists in database)</span>
                            </p>
                          )}
                        </div>

                        {/* 2. Lessor / Landlord Name */}
                        <div className={`p-3.5 bg-[#0d0f14] border rounded-xl space-y-1.5 transition-colors ${dbExistingValues.lessor && !extractedLessor.trim() ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800'}`}>
                          <div className="flex items-center justify-between">
                            <label htmlFor="edit-lessor-name" className="text-[10px] text-slate-400 font-semibold uppercase">Lessor / Landlord Name</label>
                            {dbExistingValues.lessor && (
                              <span className="text-[9px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">DB Value Exists</span>
                            )}
                          </div>
                          <input
                            id="edit-lessor-name"
                            type="text"
                            value={extractedLessor}
                            onChange={(e) => setExtractedLessor(e.target.value)}
                            placeholder="e.g. ABC Properties LLP"
                            className={`w-full bg-[#0a0c10] border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${dbExistingValues.lessor && !extractedLessor.trim() ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-indigo-500'}`}
                          />
                          {dbExistingValues.lessor && !extractedLessor.trim() && (
                            <p className="text-[10px] text-rose-400 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Cannot be empty (value exists in database)</span>
                            </p>
                          )}
                        </div>

                        {/* 3. Commencement Date */}
                        <div className={`p-3.5 bg-[#0d0f14] border rounded-xl space-y-1.5 transition-colors ${dbExistingValues.leaseStartDate && !extractedCommencementDate.trim() ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800'}`}>
                          <div className="flex items-center justify-between">
                            <label htmlFor="edit-commencement-date" className="text-[10px] text-slate-400 font-semibold uppercase">Commencement Date</label>
                            {dbExistingValues.leaseStartDate && (
                              <span className="text-[9px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">DB Value Exists</span>
                            )}
                          </div>
                          <DateInputField
                            id="edit-commencement-date"
                            value={extractedCommencementDate}
                            onChange={(val) => {
                              setExtractedCommencementDate(val);
                              const err = validateLeaseDateRange(val, extractedLeaseValidUpto);
                              setExtractedFieldErrors((prev) => ({ ...prev, dateRange: err || '' }));
                            }}
                            placeholder="DD-MM-YYYY"
                          />
                          {dbExistingValues.leaseStartDate && !extractedCommencementDate.trim() && (
                            <p className="text-[10px] text-rose-400 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Cannot be empty (value exists in database)</span>
                            </p>
                          )}
                        </div>

                        {/* 4. Lease Valid Upto */}
                        <div className={`p-3.5 bg-[#0d0f14] border rounded-xl space-y-1.5 transition-colors ${dbExistingValues.leaseValidUpto && !extractedLeaseValidUpto.trim() ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800'}`}>
                          <div className="flex items-center justify-between">
                            <label htmlFor="edit-lease-valid-upto" className="text-[10px] text-slate-400 font-semibold uppercase">Lease Valid Upto</label>
                            {dbExistingValues.leaseValidUpto && (
                              <span className="text-[9px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">DB Value Exists</span>
                            )}
                          </div>
                          <DateInputField
                            id="edit-lease-valid-upto"
                            value={extractedLeaseValidUpto}
                            minDate={extractedCommencementDate || undefined}
                            onChange={(val) => {
                              setExtractedLeaseValidUpto(val);
                              const err = validateLeaseDateRange(extractedCommencementDate, val);
                              setExtractedFieldErrors((prev) => ({ ...prev, dateRange: err || '' }));
                            }}
                            placeholder="DD-MM-YYYY"
                          />
                          {dbExistingValues.leaseValidUpto && !extractedLeaseValidUpto.trim() && (
                            <p className="text-[10px] text-rose-400 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Cannot be empty (value exists in database)</span>
                            </p>
                          )}
                          {extractedFieldErrors.dateRange && (
                            <p className="text-[10px] text-rose-400 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{extractedFieldErrors.dateRange}</span>
                            </p>
                          )}
                        </div>

                        {/* 5. Rent & Escalation Terms */}
                        <div className={`p-3.5 bg-[#0d0f14] border rounded-xl space-y-2 sm:col-span-2 transition-colors ${dbExistingValues.rent && (!extractedInitialRent.trim() || Number(extractedInitialRent) <= 0) ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Rent &amp; Escalation Terms</span>
                            {dbExistingValues.rent && (
                              <span className="text-[9px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">DB Value Exists</span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label htmlFor="edit-rent-amount" className="text-[10px] text-slate-400 block mb-1">Monthly Rent (₹)</label>
                              <input
                                id="edit-rent-amount"
                                type="number"
                                value={extractedInitialRent}
                                onChange={(e) => setExtractedInitialRent(e.target.value)}
                                placeholder="e.g. 50000"
                                className={`w-full bg-[#0a0c10] border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 ${dbExistingValues.rent && (!extractedInitialRent.trim() || Number(extractedInitialRent) <= 0) ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-indigo-500'}`}
                              />
                              {dbExistingValues.rent && (!extractedInitialRent.trim() || Number(extractedInitialRent) <= 0) && (
                                <p className="text-[10px] text-rose-400 mt-1 flex items-center space-x-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span>Cannot be empty or zero</span>
                                </p>
                              )}
                            </div>
                            <div>
                              <label htmlFor="edit-escalation-pct" className="text-[10px] text-slate-400 block mb-1">Escalation (%)</label>
                              <input
                                id="edit-escalation-pct"
                                type="number"
                                step="0.1"
                                value={extractedEscalationPercentage}
                                onChange={(e) => setExtractedEscalationPercentage(e.target.value)}
                                placeholder="e.g. 5"
                                className="w-full bg-[#0a0c10] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label htmlFor="edit-revision-period" className="text-[10px] text-slate-400 block mb-1">Revision Period (Years)</label>
                              <input
                                id="edit-revision-period"
                                type="number"
                                value={extractedRevisionPeriodYears}
                                onChange={(e) => setExtractedRevisionPeriodYears(e.target.value)}
                                placeholder="e.g. 1"
                                className="w-full bg-[#0a0c10] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 6. Carpet Area */}
                        <div className={`p-3.5 bg-[#0d0f14] border rounded-xl space-y-1.5 transition-colors ${dbExistingValues.carpetArea && (!extractedCarpetArea.trim() || Number(extractedCarpetArea) <= 0) ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800'}`}>
                          <div className="flex items-center justify-between">
                            <label htmlFor="edit-carpet-area" className="text-[10px] text-slate-400 font-semibold uppercase">Carpet Area (sq ft)</label>
                            {dbExistingValues.carpetArea && (
                              <span className="text-[9px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">DB Value Exists</span>
                            )}
                          </div>
                          <input
                            id="edit-carpet-area"
                            type="number"
                            value={extractedCarpetArea}
                            onChange={(e) => setExtractedCarpetArea(e.target.value)}
                            placeholder="e.g. 1200"
                            className={`w-full bg-[#0a0c10] border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 ${dbExistingValues.carpetArea && (!extractedCarpetArea.trim() || Number(extractedCarpetArea) <= 0) ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-indigo-500'}`}
                          />
                          {dbExistingValues.carpetArea && (!extractedCarpetArea.trim() || Number(extractedCarpetArea) <= 0) && (
                            <p className="text-[10px] text-rose-400 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Cannot be empty or zero (value exists in database)</span>
                            </p>
                          )}
                        </div>

                        {/* Notice Period */}
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1.5">
                          <label htmlFor="edit-notice-period" className="text-[10px] text-slate-400 font-semibold uppercase block">Notice Period</label>
                          <input
                            id="edit-notice-period"
                            type="text"
                            value={extractedNoticePeriod}
                            onChange={(e) => setExtractedNoticePeriod(e.target.value)}
                            placeholder="e.g. 30 days"
                            className="w-full bg-[#0a0c10] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Security Deposit */}
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1.5 sm:col-span-2">
                          <label htmlFor="edit-security-deposit" className="text-[10px] text-slate-400 font-semibold uppercase block">Security Deposit</label>
                          <input
                            id="edit-security-deposit"
                            type="text"
                            value={extractedSecurityDeposit}
                            onChange={(e) => setExtractedSecurityDeposit(e.target.value)}
                            placeholder="e.g. ₹1,50,000 / 3 Months Rent"
                            className="w-full bg-[#0a0c10] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Lessee / Tenant Name</span>
                          <p className="text-xs font-bold text-white">{extracted.lessee || property.lessee || property.ownerOrLessee || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Lessor / Landlord Name</span>
                          <p className="text-xs font-bold text-white">{extracted.lessor || property.lessor || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Commencement Date (DD-MM-YYYY)</span>
                          <p className="text-xs font-bold text-slate-200 font-mono">
                            {formatDisplayDate(extracted.leaseStartDate || extracted.startDate || property.leaseStartDate)}
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Lease Valid Upto (DD-MM-YYYY)</span>
                          <p className="text-xs font-bold text-amber-300 font-mono">
                            {formatDisplayDate(extracted.expiryDate || property.leaseValidUpto)}
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5 sm:col-span-2">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Rent &amp; Escalation Terms</span>
                          <div className="flex flex-wrap items-baseline gap-3 mt-1">
                            <span className="text-xs text-slate-400">
                              Initial: <span className="font-mono text-slate-300">₹{extracted.totalRent || initialRentValue ? (extracted.totalRent || initialRentValue)?.toLocaleString('en-IN') : '---'}</span>
                            </span>
                            <span className="text-xs font-semibold text-slate-200">
                              Current: <span className="font-mono font-bold text-emerald-400">
                                ₹{(currentRentValue || extracted.totalRent || initialRentValue)?.toLocaleString('en-IN') || '---'}
                              </span>
                            </span>
                            {(extracted.escalationPercentage || property.escalationPercentage) && (
                              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                                +{extracted.escalationPercentage || property.escalationPercentage}% every {extracted.revisionPeriodYears || property.revisionPeriodYears || 1}y
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Carpet Area</span>
                          <p className="text-xs font-bold text-slate-200">
                            {extracted.carpetArea ? `${extracted.carpetArea} sq ft` : (property.carpetAreaSqFt ? `${property.carpetAreaSqFt} sq ft` : 'N/A')}
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Notice Period</span>
                          <p className="text-xs font-bold text-slate-200">{extracted.noticePeriod || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5 sm:col-span-2">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Security Deposit</span>
                          <p className="text-xs font-bold text-white">{extracted.securityDeposit || 'N/A'}</p>
                        </div>
                      </>
                    )}
                  </>
                )}
                {currentDoc.documentType === 'Insurance' && (
                  <>
                    {isEditingExtractedFields ? (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Policy Number</span>
                            {dbExistingValues.policyNo && (
                              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                DB Value Exists
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={extractedPolicyNo}
                            onChange={(e) => {
                              setExtractedPolicyNo(e.target.value);
                              if (extractedFieldErrors.policyNo) {
                                setExtractedFieldErrors(prev => ({ ...prev, policyNo: '' }));
                              }
                            }}
                            placeholder="e.g. POL-98234"
                            className={`w-full bg-[#14171f] border ${extractedFieldErrors.policyNo || (dbExistingValues.policyNo && !extractedPolicyNo.trim()) ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500'} rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none transition-colors`}
                          />
                          {extractedFieldErrors.policyNo && (
                            <p className="text-[10px] text-rose-400 font-medium">{extractedFieldErrors.policyNo}</p>
                          )}
                          {dbExistingValues.policyNo && !extractedPolicyNo.trim() && !extractedFieldErrors.policyNo && (
                            <p className="text-[10px] text-rose-400 font-medium">Cannot be empty (value exists in database)</p>
                          )}
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Policyholder / Insured Entity</span>
                          <input
                            type="text"
                            value={extractedInsuredEntity}
                            onChange={(e) => setExtractedInsuredEntity(e.target.value)}
                            placeholder="e.g. Acme Corp / Property Owner"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Insurance Valid Upto (DD-MM-YYYY)</span>
                            {dbExistingValues.insuranceValidUpto && (
                              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                DB Value Exists
                              </span>
                            )}
                          </div>
                          <DateInputField
                            value={extractedInsuranceValidUpto}
                            onChange={(val) => {
                              setExtractedInsuranceValidUpto(val);
                              if (extractedFieldErrors.insuranceValidUpto) {
                                setExtractedFieldErrors(prev => ({ ...prev, insuranceValidUpto: '' }));
                              }
                            }}
                            placeholder="DD-MM-YYYY"
                            className={`w-full ${extractedFieldErrors.insuranceValidUpto || (dbExistingValues.insuranceValidUpto && !extractedInsuranceValidUpto.trim()) ? 'border-rose-500/80 ring-1 ring-rose-500/30' : ''}`}
                          />
                          {extractedFieldErrors.insuranceValidUpto && (
                            <p className="text-[10px] text-rose-400 font-medium">{extractedFieldErrors.insuranceValidUpto}</p>
                          )}
                          {dbExistingValues.insuranceValidUpto && !extractedInsuranceValidUpto.trim() && !extractedFieldErrors.insuranceValidUpto && (
                            <p className="text-[10px] text-rose-400 font-medium">Cannot be empty (value exists in database)</p>
                          )}
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Sum Insured / Coverage</span>
                            {dbExistingValues.sumInsured && (
                              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                DB Value Exists
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={extractedSumInsured}
                            onChange={(e) => {
                              setExtractedSumInsured(e.target.value);
                              if (extractedFieldErrors.sumInsured) {
                                setExtractedFieldErrors(prev => ({ ...prev, sumInsured: '' }));
                              }
                            }}
                            placeholder="e.g. 50000000"
                            className={`w-full bg-[#14171f] border ${extractedFieldErrors.sumInsured || (dbExistingValues.sumInsured && !extractedSumInsured.trim()) ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500'} rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none transition-colors`}
                          />
                          {extractedFieldErrors.sumInsured && (
                            <p className="text-[10px] text-rose-400 font-medium">{extractedFieldErrors.sumInsured}</p>
                          )}
                          {dbExistingValues.sumInsured && !extractedSumInsured.trim() && !extractedFieldErrors.sumInsured && (
                            <p className="text-[10px] text-rose-400 font-medium">Cannot be empty (value exists in database)</p>
                          )}
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Annual Premium (₹)</span>
                            {dbExistingValues.premiumAmount && (
                              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                DB Value Exists
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            value={extractedPremiumAmount}
                            onChange={(e) => {
                              setExtractedPremiumAmount(e.target.value);
                              if (extractedFieldErrors.premiumAmount) {
                                setExtractedFieldErrors(prev => ({ ...prev, premiumAmount: '' }));
                              }
                            }}
                            placeholder="e.g. 150000"
                            className={`w-full bg-[#14171f] border ${extractedFieldErrors.premiumAmount || (dbExistingValues.premiumAmount && (!extractedPremiumAmount.trim() || Number(extractedPremiumAmount) <= 0)) ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500'} rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none transition-colors`}
                          />
                          {extractedFieldErrors.premiumAmount && (
                            <p className="text-[10px] text-rose-400 font-medium">{extractedFieldErrors.premiumAmount}</p>
                          )}
                          {dbExistingValues.premiumAmount && (!extractedPremiumAmount.trim() || Number(extractedPremiumAmount) <= 0) && !extractedFieldErrors.premiumAmount && (
                            <p className="text-[10px] text-rose-400 font-medium">Cannot be empty or zero (value exists in database)</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Policy Number</span>
                          <p className="text-xs font-bold text-indigo-300 font-mono">{extracted.policyNo || extracted.policyNumber || property.policyNo || property.policy_no || extracted.licenseNumber || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Policyholder / Insured Entity</span>
                          <p className="text-xs font-bold text-white">{extracted.insuredEntity || extracted.lessee || property.title || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Insurance Valid Upto (DD-MM-YYYY)</span>
                          <p className="text-xs font-bold text-amber-300 font-mono">
                            {formatDisplayDate(property.insuranceValidUpto || extracted.insuranceValidity || extracted.expiryDate)}
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Sum Insured / Total Coverage</span>
                          <p className="text-xs font-bold text-emerald-400 font-mono">
                            {(() => {
                              const val = property.sumInsured ?? extracted.sumInsured;
                              if (val === undefined || val === null || val === '') return 'N/A';
                              if (typeof val === 'number') return `₹${val.toLocaleString('en-IN')}`;
                              const num = Number(String(val).replace(/[^0-9.]/g, ''));
                              return !isNaN(num) && num > 0 ? `₹${num.toLocaleString('en-IN')}` : String(val);
                            })()}
                          </p>
                        </div>

                        {(extracted.premiumAmount !== undefined && extracted.premiumAmount !== null || property.premiumAmount !== undefined && property.premiumAmount !== null || property.premium_amount !== undefined && property.premium_amount !== null) && (
                          <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5 sm:col-span-2">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">Annual Premium</span>
                            <p className="text-xs font-bold text-slate-200 font-mono">
                              {(() => {
                                const pVal = extracted.premiumAmount ?? property.premiumAmount ?? property.premium_amount;
                                if (typeof pVal === 'number') return `₹${pVal.toLocaleString('en-IN')}`;
                                return pVal ? `₹${pVal}` : 'N/A';
                              })()}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {currentDoc.documentType === 'Trade License' && (
                  <>
                    {isEditingExtractedFields ? (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Trade License / Reg. No.</span>
                          <input
                            type="text"
                            value={extractedLicenseNumber}
                            onChange={(e) => setExtractedLicenseNumber(e.target.value)}
                            placeholder="e.g. TL-2024-998"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Issuing Municipal Authority</span>
                          <input
                            type="text"
                            value={extractedIssuingAuthority}
                            onChange={(e) => setExtractedIssuingAuthority(e.target.value)}
                            placeholder="e.g. Municipal Corporation"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Licensee / Establishment</span>
                          <input
                            type="text"
                            value={extractedLicensee}
                            onChange={(e) => setExtractedLicensee(e.target.value)}
                            placeholder="e.g. Business Name"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Issue Date (DD-MM-YYYY)</span>
                          <DateInputField
                            value={extractedTradeStartDate}
                            onChange={(val) => setExtractedTradeStartDate(val)}
                            placeholder="DD-MM-YYYY"
                            className="w-full"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">License Valid Upto (DD-MM-YYYY)</span>
                            {dbExistingValues.tradeLicenseValidity && (
                              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                DB Value Exists
                              </span>
                            )}
                          </div>
                          <DateInputField
                            value={extractedTradeExpiryDate}
                            onChange={(val) => {
                              setExtractedTradeExpiryDate(val);
                              if (extractedFieldErrors.tradeLicenseValidity) {
                                setExtractedFieldErrors(prev => ({ ...prev, tradeLicenseValidity: '' }));
                              }
                            }}
                            placeholder="DD-MM-YYYY"
                            className={`w-full ${extractedFieldErrors.tradeLicenseValidity || (dbExistingValues.tradeLicenseValidity && !extractedTradeExpiryDate.trim()) ? 'border-rose-500/80 ring-1 ring-rose-500/30' : ''}`}
                          />
                          {extractedFieldErrors.tradeLicenseValidity && (
                            <p className="text-[10px] text-rose-400 font-medium">{extractedFieldErrors.tradeLicenseValidity}</p>
                          )}
                          {dbExistingValues.tradeLicenseValidity && !extractedTradeExpiryDate.trim() && !extractedFieldErrors.tradeLicenseValidity && (
                            <p className="text-[10px] text-rose-400 font-medium">Cannot be empty (value exists in database)</p>
                          )}
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Trade Category</span>
                          <input
                            type="text"
                            value={extractedTradeCategory}
                            onChange={(e) => setExtractedTradeCategory(e.target.value)}
                            placeholder="e.g. Commercial / Retail"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1 sm:col-span-2">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Licensed Premises Area (sq ft)</span>
                          <input
                            type="number"
                            value={extractedTradePremisesArea}
                            onChange={(e) => setExtractedTradePremisesArea(e.target.value)}
                            placeholder="e.g. 1500"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none transition-colors"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Trade License / Reg. No.</span>
                          <p className="text-xs font-bold text-indigo-300 font-mono">{extracted.licenseNumber || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Issuing Municipal Authority</span>
                          <p className="text-xs font-bold text-white">{extracted.issuingAuthority || extracted.lessor || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Licensee / Establishment Name</span>
                          <p className="text-xs font-bold text-white">{extracted.licensee || extracted.lessee || property.title || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Issue Date (DD-MM-YYYY)</span>
                          <p className="text-xs font-bold text-slate-200 font-mono">
                            {formatDisplayDate(extracted.startDate)}
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">License Valid Upto (DD-MM-YYYY)</span>
                          <p className="text-xs font-bold text-amber-300 font-mono">
                            {formatDisplayDate(extracted.tradeLicenseValidity || extracted.expiryDate)}
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Trade Category</span>
                          <p className="text-xs font-bold text-slate-200">{extracted.tradeCategory || 'Commercial / Retail'}</p>
                        </div>

                        {extracted.carpetArea && (
                          <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5 sm:col-span-2">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">Licensed Premises Area</span>
                            <p className="text-xs font-bold text-slate-200">{extracted.carpetArea} sq ft</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {currentDoc.documentType === 'Municipality Tax' && (
                  <>
                    {isEditingExtractedFields ? (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Holding Number / Assessment ID</span>
                            {dbExistingValues.holdingNumber && (
                              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                DB Value Exists
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={extractedHoldingNumber}
                            onChange={(e) => {
                              setExtractedHoldingNumber(e.target.value);
                              if (extractedFieldErrors.holdingNumber) {
                                setExtractedFieldErrors(prev => ({ ...prev, holdingNumber: '' }));
                              }
                            }}
                            placeholder="e.g. HLD-4091"
                            className={`w-full bg-[#14171f] border ${extractedFieldErrors.holdingNumber || (dbExistingValues.holdingNumber && !extractedHoldingNumber.trim()) ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500'} rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none transition-colors`}
                          />
                          {extractedFieldErrors.holdingNumber && (
                            <p className="text-[10px] text-rose-400 font-medium">{extractedFieldErrors.holdingNumber}</p>
                          )}
                          {dbExistingValues.holdingNumber && !extractedHoldingNumber.trim() && !extractedFieldErrors.holdingNumber && (
                            <p className="text-[10px] text-rose-400 font-medium">Cannot be empty (value exists in database)</p>
                          )}
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Financial Year (YYYY-YYYY)</span>
                            {dbExistingValues.taxFinancialYear && (
                              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                DB Value Exists
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={extractedTaxFinancialYear}
                            onChange={(e) => {
                              setExtractedTaxFinancialYear(e.target.value);
                              if (extractedFieldErrors.taxFinancialYear || extractedFieldErrors.taxFinancialYearFormat) {
                                setExtractedFieldErrors(prev => ({ ...prev, taxFinancialYear: '', taxFinancialYearFormat: '' }));
                              }
                            }}
                            placeholder="e.g. 2025-2026"
                            className={`w-full bg-[#14171f] border ${extractedFieldErrors.taxFinancialYear || extractedFieldErrors.taxFinancialYearFormat || (dbExistingValues.taxFinancialYear && !extractedTaxFinancialYear.trim()) ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500'} rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none transition-colors`}
                          />
                          {extractedFieldErrors.taxFinancialYear && (
                            <p className="text-[10px] text-rose-400 font-medium">{extractedFieldErrors.taxFinancialYear}</p>
                          )}
                          {extractedFieldErrors.taxFinancialYearFormat && (
                            <p className="text-[10px] text-rose-400 font-medium">{extractedFieldErrors.taxFinancialYearFormat}</p>
                          )}
                          {dbExistingValues.taxFinancialYear && !extractedTaxFinancialYear.trim() && !extractedFieldErrors.taxFinancialYear && !extractedFieldErrors.taxFinancialYearFormat && (
                            <p className="text-[10px] text-rose-400 font-medium">Cannot be empty (value exists in database)</p>
                          )}
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Tax Paid Amount (₹)</span>
                            {dbExistingValues.taxPaidAmount && (
                              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                DB Value Exists
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            value={extractedTaxPaidAmount}
                            onChange={(e) => {
                              setExtractedTaxPaidAmount(e.target.value);
                              if (extractedFieldErrors.taxPaidAmount) {
                                setExtractedFieldErrors(prev => ({ ...prev, taxPaidAmount: '' }));
                              }
                            }}
                            placeholder="e.g. 18500"
                            className={`w-full bg-[#14171f] border ${extractedFieldErrors.taxPaidAmount || (dbExistingValues.taxPaidAmount && (!extractedTaxPaidAmount.trim() || Number(extractedTaxPaidAmount) <= 0)) ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500'} rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none transition-colors`}
                          />
                          {extractedFieldErrors.taxPaidAmount && (
                            <p className="text-[10px] text-rose-400 font-medium">{extractedFieldErrors.taxPaidAmount}</p>
                          )}
                          {dbExistingValues.taxPaidAmount && (!extractedTaxPaidAmount.trim() || Number(extractedTaxPaidAmount) <= 0) && !extractedFieldErrors.taxPaidAmount && (
                            <p className="text-[10px] text-rose-400 font-medium">Cannot be empty or zero (value exists in database)</p>
                          )}
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Tax Compliance Preview</span>
                          <div className="pt-1.5">
                            <TaxStatusBadge
                              lastPaidFY={extractedTaxFinancialYear.trim() || undefined}
                              showCurrentFYNote
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Holding Number / Assessment ID</span>
                          <p className="text-xs font-bold text-indigo-300 font-mono">
                            {extracted.holdingNumber || property.holdingNumber || property.holding_number || 'N/A'}
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Financial Year</span>
                          <div className="flex items-center space-x-2">
                            <p className="text-xs font-bold text-white font-mono">
                              {extracted.taxFinancialYear || property.latestTaxFinancialYear || property.latest_tax_financial_year || 'N/A'}
                            </p>
                            <TaxStatusBadge
                              lastPaidFY={extracted.taxFinancialYear || property.latestTaxFinancialYear || property.latest_tax_financial_year}
                            />
                          </div>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Tax Paid Amount</span>
                          <p className="text-xs font-bold text-emerald-400 font-mono">
                            {(() => {
                              const val = extracted.taxPaidAmount ?? property.latestTaxAmount ?? property.latest_tax_amount;
                              if (val === undefined || val === null || val === '') return 'N/A';
                              if (typeof val === 'number') return `₹${val.toLocaleString('en-IN')}`;
                              const num = Number(String(val).replace(/[^0-9.]/g, ''));
                              return !isNaN(num) && num > 0 ? `₹${num.toLocaleString('en-IN')}` : String(val);
                            })()}
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Tax Compliance Status</span>
                          <div className="pt-0.5">
                            <TaxStatusBadge
                              lastPaidFY={extracted.taxFinancialYear || property.latestTaxFinancialYear || property.latest_tax_financial_year}
                              showCurrentFYNote
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {currentDoc.documentType === 'Encumbrance Certificate' && (
                  <>
                    {isEditingExtractedFields ? (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Application / Certificate No.</span>
                          <input
                            type="text"
                            value={extractedCertificateNumber}
                            onChange={(e) => setExtractedCertificateNumber(e.target.value)}
                            placeholder="e.g. EC-88219"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Registered Owner / Applicant</span>
                          <input
                            type="text"
                            value={extractedLessee}
                            onChange={(e) => setExtractedLessee(e.target.value)}
                            placeholder="e.g. Registered Owner"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Search Period Start</span>
                          <DateInputField
                            value={extractedSearchPeriodStart}
                            onChange={(val) => setExtractedSearchPeriodStart(val)}
                            placeholder="DD-MM-YYYY"
                            className="w-full"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Search Period End</span>
                          <DateInputField
                            value={extractedSearchPeriodEnd}
                            onChange={(val) => setExtractedSearchPeriodEnd(val)}
                            placeholder="DD-MM-YYYY"
                            className="w-full"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1 sm:col-span-2">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Property Description</span>
                          <input
                            type="text"
                            value={extractedPropertyDesc}
                            onChange={(e) => setExtractedPropertyDesc(e.target.value)}
                            placeholder="e.g. Flat / Plot Details, Location"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Application / Certificate No.</span>
                          <p className="text-xs font-bold text-indigo-300 font-mono">{extracted.certificateNumber || extracted.licenseNumber || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Registered Owner / Applicant</span>
                          <p className="text-xs font-bold text-white">{extracted.lessee || property.ownerOrLessee || property.title || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Search Period Start</span>
                          <p className="text-xs font-bold text-slate-200 font-mono">{formatDisplayDate(extracted.startDate)}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Search Period End</span>
                          <p className="text-xs font-bold text-amber-300 font-mono">{formatDisplayDate(extracted.expiryDate)}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5 sm:col-span-2">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Property Description</span>
                          <p className="text-xs font-bold text-slate-200">{extracted.propertyDescription || `${property.location}, ${property.state}`}</p>
                        </div>
                      </>
                    )}
                  </>
                )}

                {currentDoc.documentType === 'Sale Deed' && (
                  <>
                    {isEditingExtractedFields ? (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Buyer / Purchaser Name</span>
                          <input
                            type="text"
                            value={extractedBuyer}
                            onChange={(e) => setExtractedBuyer(e.target.value)}
                            placeholder="e.g. Buyer Name"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Seller / Vendor Name</span>
                          <input
                            type="text"
                            value={extractedSeller}
                            onChange={(e) => setExtractedSeller(e.target.value)}
                            placeholder="e.g. Seller Name"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Registration Date (DD-MM-YYYY)</span>
                          <DateInputField
                            value={extractedRegistrationDate}
                            onChange={(val) => setExtractedRegistrationDate(val)}
                            placeholder="DD-MM-YYYY"
                            className="w-full"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Sale Consideration (₹)</span>
                          <input
                            type="text"
                            value={extractedSaleConsideration}
                            onChange={(e) => setExtractedSaleConsideration(e.target.value)}
                            placeholder="e.g. 7500000"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-1 sm:col-span-2">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Carpet / Land Area (sq ft)</span>
                          <input
                            type="number"
                            value={extractedCarpetArea}
                            onChange={(e) => setExtractedCarpetArea(e.target.value)}
                            placeholder="e.g. 2400"
                            className="w-full bg-[#14171f] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none transition-colors"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Buyer / Purchaser Name</span>
                          <p className="text-xs font-bold text-white">{extracted.buyer || extracted.lessee || property.ownerOrLessee || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Seller / Vendor Name</span>
                          <p className="text-xs font-bold text-white">{extracted.seller || extracted.lessor || 'N/A'}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Registration Date (DD-MM-YYYY)</span>
                          <p className="text-xs font-bold text-slate-200 font-mono">{formatDisplayDate(extracted.registrationDate || extracted.startDate)}</p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Sale Consideration / Value</span>
                          <p className="text-xs font-bold text-emerald-400 font-mono">
                            {extracted.saleConsideration 
                              ? (typeof extracted.saleConsideration === 'number' ? `₹${extracted.saleConsideration.toLocaleString('en-IN')}` : String(extracted.saleConsideration))
                              : (extracted.totalRent ? `₹${Number(extracted.totalRent).toLocaleString('en-IN')}` : 'N/A')}
                          </p>
                        </div>

                        <div className="p-3.5 bg-[#0d0f14] border border-slate-800 rounded-xl space-y-0.5 sm:col-span-2">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Carpet / Land Area</span>
                          <p className="text-xs font-bold text-slate-200">
                            {extracted.carpetArea ? `${extracted.carpetArea} sq ft` : (property.carpetAreaSqFt ? `${property.carpetAreaSqFt} sq ft` : 'N/A')}
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div 
          id="document-viewer-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setViewingDoc(null)}
        >
          <div 
            className="bg-[#161920] border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#1a1d23]">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                      {property.code}
                    </span>
                    <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                      {viewingDoc.documentType}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate mt-1">
                    {viewingDoc.fileName}
                  </h3>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <a
                  href={viewingDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open in New Tab</span>
                </a>

                <a
                  href={viewingDoc.fileUrl}
                  download={viewingDoc.fileName || 'document'}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>

                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-[#0d0f14] p-4 sm:p-6 overflow-auto flex items-center justify-center relative">
              {(() => {
                const url = viewingDoc.fileUrl;
                const isPdf = url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf');

                if (isPdf) {
                  return (
                    <iframe
                      src={url}
                      title={viewingDoc.fileName}
                      className="w-full h-full rounded-xl border border-slate-800 bg-white"
                    />
                  );
                }

                // Treat as image or default preview
                return (
                  <div className="max-w-full max-h-full flex flex-col items-center justify-center space-y-3">
                    <img
                      src={url}
                      alt={viewingDoc.fileName}
                      className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl border border-slate-800 bg-[#161920]"
                      onError={(e) => {
                        // Fallback if image load fails
                        (e.target as HTMLElement).style.display = 'none';
                        const fallbackEl = document.getElementById('doc-fallback-view');
                        if (fallbackEl) fallbackEl.style.display = 'flex';
                      }}
                    />
                    <div 
                      id="doc-fallback-view"
                      style={{ display: 'none' }}
                      className="flex-col items-center space-y-4 p-8 bg-[#161920] border border-slate-800 rounded-2xl text-center"
                    >
                      <FileText className="w-12 h-12 text-indigo-400 mx-auto" />
                      <p className="text-sm font-semibold text-slate-300">
                        Document preview is not directly embeddable.
                      </p>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center space-x-2 shadow-lg"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Document in Full Viewer</span>
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-[#161920] flex items-center justify-between text-xs text-slate-400">
              <span className="truncate max-w-md">
                Source: <span className="font-mono text-slate-300">{viewingDoc.fileUrl.split('?')[0]}</span>
              </span>
              <span>{viewingDoc.uploadDate ? `Uploaded on ${formatDisplayDate(viewingDoc.uploadDate)}` : ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Document Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#14171d] border border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete Document</h3>
                  <p className="text-xs text-rose-400 font-medium">Permanent Supabase Deletion</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={isDeletingDoc}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Details */}
            <div className="mt-4 bg-[#0d0f14] border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500 font-semibold">Document:</span>
                <span className="font-medium text-white truncate max-w-[200px]">{docToDelete.fileName}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500 font-semibold">Type:</span>
                <span className="font-semibold text-indigo-400">{docToDelete.documentType || docToDelete.document_type}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500 font-semibold">Property:</span>
                <span className="font-mono text-slate-300">{property.code} ({property.title})</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this document? This will remove the file from Supabase storage, delete the record from <code className="text-rose-300 font-mono">property_documents</code>, and reset corresponding compliance fields on this property.
            </p>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={isDeletingDoc}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-doc"
                onClick={confirmDeleteDoc}
                disabled={isDeletingDoc}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors disabled:opacity-50 shadow-lg shadow-rose-900/30"
              >
                {isDeletingDoc ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting Document...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {docDeleteSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{docDeleteSuccessMsg}</span>
        </div>
      )}
    </div>
  );
};
