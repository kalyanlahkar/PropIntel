export type PropertyType = 
  | 'Lease Deed'
  | 'Encumbrance Certificate'
  | 'Trade License'
  | 'Insurance'
  | 'Municipality Tax'
  | 'Sale Deed';

export type ComplianceStatus = 'Compliant' | 'Expiring Soon' | 'Expired' | 'Pending Audit';

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu & Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const INDIAN_AND_US_STATES = INDIAN_STATES;

export interface ExtractedPropertyData {
  carpetArea?: number | string;
  totalRent?: number | string;
  initialRent?: number;
  rentPerSqFt?: number | string;
  leaseStartDate?: string;
  escalationPercentage?: number;
  revisionPeriodYears?: number;
  lessee?: string;
  lessor?: string;
  startDate?: string;
  expiryDate?: string;
  escalationClause?: string;
  noticePeriod?: string;
  securityDeposit?: string;
  
  // Insurance specific fields
  policyNo?: string;
  policyNumber?: string;
  insuranceProvider?: string;
  insuredEntity?: string;
  sumInsured?: number | string;
  insuranceValidity?: string;
  premiumAmount?: number | string;

  // Municipality Tax specific fields
  holdingNumber?: string | null;
  taxFinancialYear?: string | null;
  taxPaidAmount?: number | null;

  // Trade License specific fields
  licenseNumber?: string;
  issuingAuthority?: string;
  licensee?: string;
  tradeLicenseValidity?: string;
  tradeCategory?: string;

  // Encumbrance Certificate & Sale Deed fields
  certificateNumber?: string;
  searchPeriod?: string;
  buyer?: string;
  seller?: string;
  saleConsideration?: number | string;
  registrationDate?: string;
  propertyDescription?: string;

  keyRisks?: string[];
  rawSummary?: string;
}

export interface PropertyDocument {
  id: string;
  propertyCode?: string;
  documentType: PropertyType;
  fileName: string;
  fileUrl?: string;
  imageDataUrl?: string;
  uploadDate: string;
  extractedData?: ExtractedPropertyData;
  status: 'Processing' | 'Verified' | 'Needs Review';
}

export interface PropertyRecord {
  id: string;
  code: string; // Max 20 chars, alphanumeric, no spaces
  title: string;
  propertyTitle?: string;
  property_title?: string;
  location: string; // 3-150 chars
  state: string;
  carpetAreaSqFt?: number;
  monthlyRent?: number;
  initialRent?: number;
  rentPerSqFt?: number | string;
  leaseStartDate?: string;
  leaseValidUpto?: string;
  insuranceValidUpto?: string;
  insuranceValidity?: string;
  insurance_validity?: string;
  policyNo?: string;
  policy_no?: string;
  premiumAmount?: number | string;
  premium_amount?: number | string;
  sumInsured?: number | string;
  sum_insured?: number | string;
  tradeLicenseValidUpto?: string;
  holdingNumber?: string | null;
  holding_number?: string | null;
  latestTaxFinancialYear?: string | null;
  latest_tax_financial_year?: string | null;
  latestTaxAmount?: number | null;
  latest_tax_amount?: number | null;
  escalationPercentage?: number;
  revisionPeriodYears?: number;
  ownerOrLessee?: string;
  ownerRole?: 'Lessor' | 'Lessee' | string;
  owner_role?: 'Lessor' | 'Lessee' | string;
  lessor?: string;
  lessee?: string;
  documents: PropertyDocument[];
  notes?: string;
  createdDate: string;
}

export interface AlertItem {
  id: string;
  propertyId: string;
  propertyCode: string;
  propertyName: string;
  docType: PropertyType;
  expiryDate: string;
  daysRemaining: number;
  severity: 'urgent' | 'warning' | 'info';
  description: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  citations?: {
    propertyCode: string;
    propertyName: string;
    docType?: PropertyType;
  }[];
}
