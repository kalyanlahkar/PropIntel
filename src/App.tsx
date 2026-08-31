import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { AddPropertyView } from './components/AddPropertyView';
import { DocumentCaptureView } from './components/DocumentCaptureView';
import { PropertyDetailView } from './components/PropertyDetailView';
import { AIChatAssistant } from './components/AIChatAssistant';
import { ComplianceAlertsModal } from './components/ComplianceAlertsModal';
import { DeleteModal } from './components/DeleteModal';
import { CashflowProjectionDashboard } from './components/CashflowProjectionDashboard';
import { INITIAL_PROPERTIES } from './data/initialProperties';
import { PropertyRecord, PropertyType, ExtractedPropertyData } from './types';
import { getProperties, getPropertyDocuments, addProperty, updatePropertyExpiry, updatePropertyInDb, deleteProperty, deletePropertyComplete, extractStoragePathFromUrl } from './supabaseClient';
import { getDaysRemainingFromDate, formatDateToDDMMYYYY } from './utils/dateFormatter';

export default function App() {
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'capture' | 'detail' | 'chat' | 'cashflow'>('dashboard');
  const [selectedProperty, setSelectedProperty] = useState<PropertyRecord | null>(null);
  const [captureTargetCode, setCaptureTargetCode] = useState<string | undefined>(undefined);
  const [chatPrompt, setChatPrompt] = useState<string>('');
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);

  // Deletion modal state
  const [propertyToDelete, setPropertyToDelete] = useState<PropertyRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deletedSuccessCode, setDeletedSuccessCode] = useState<string | null>(null);

  // Refetch properties and their uploaded documents strictly from Supabase
  const loadSupabaseProperties = useCallback(async () => {
    setIsLoadingFromDb(true);
    try {
      const [dbData, docsData] = await Promise.all([
        getProperties(),
        getPropertyDocuments()
      ]);

      if (dbData && Array.isArray(dbData)) {
        const allDocs = Array.isArray(docsData) ? docsData : [];

        const dbMapped: PropertyRecord[] = dbData.map((row: any, idx: number) => {
          const rawExpiry = row.lease_valid_upto;
          const expiryVal = rawExpiry && String(rawExpiry).trim() !== '' ? formatDateToDDMMYYYY(String(rawExpiry)) : undefined;
          
          const rawInsExpiry = row.insurance_valid_upto || row.insurance_validity;
          const insExpiryVal = rawInsExpiry && String(rawInsExpiry).trim() !== '' ? formatDateToDDMMYYYY(String(rawInsExpiry)) : undefined;

          const rawSumInsured = row.sum_insured !== null && row.sum_insured !== undefined 
            ? (typeof row.sum_insured === 'number' ? row.sum_insured : (isNaN(Number(row.sum_insured)) ? String(row.sum_insured) : Number(row.sum_insured))) 
            : undefined;

          const rawPolicyNo = row.policy_no || row.policyNo || row.policy_number || row.policyNumber || undefined;
          const rawPremium = row.premium_amount !== null && row.premium_amount !== undefined 
            ? Number(row.premium_amount) 
            : (row.premiumAmount !== null && row.premiumAmount !== undefined ? Number(row.premiumAmount) : undefined);

          const rawTradeLicenseExpiry = row.trade_license_valid_upto || row.trade_license_validity;
          const tradeLicenseExpiryVal = rawTradeLicenseExpiry && String(rawTradeLicenseExpiry).trim() !== '' ? formatDateToDDMMYYYY(String(rawTradeLicenseExpiry)) : undefined;

          const rawTotalRent = row.total_rent !== null && row.total_rent !== undefined ? Number(row.total_rent) : undefined;
          const rawEscalation = row.escalation_percentage !== null && row.escalation_percentage !== undefined ? Number(row.escalation_percentage) : undefined;
          const rawRevision = row.revision_period_years !== null && row.revision_period_years !== undefined ? Number(row.revision_period_years) : undefined;

          const propCode = row.property_code || `PROP-${idx + 100}`;
          const propertyTitle = row.property_title || row.title || row.property_name || row.name || row.property_code || `Property ${idx + 1}`;

          // Find all documents uploaded to Supabase for this property_code
          const matchingDocs = allDocs
            .filter((d: any) => d.property_code && String(d.property_code).trim().toUpperCase() === String(propCode).trim().toUpperCase())
            .map((d: any, dIdx: number) => ({
              id: d.id ? String(d.id) : `doc-${dIdx}-${Date.now()}`,
              propertyCode: d.property_code,
              documentType: (d.document_type || 'Lease Deed') as PropertyType,
              fileName: d.file_url ? (extractStoragePathFromUrl(d.file_url) || d.file_url) : `Document-${dIdx + 1}`,
              fileUrl: d.file_url,
              uploadDate: d.uploaded_at 
                ? String(d.uploaded_at).split('T')[0] 
                : (d.created_at ? String(d.created_at).split('T')[0] : new Date().toISOString().split('T')[0]),
              status: 'Verified' as const
            }));

          return {
            id: row.id ? String(row.id) : `sp-${idx}-${propCode}`,
            code: propCode,
            title: propertyTitle,
            propertyTitle: propertyTitle,
            property_title: propertyTitle,
            location: row.location || 'Location Unspecified',
            state: row.state || 'Assam',
            carpetAreaSqFt: row.carpet_area ? parseFloat(String(row.carpet_area).replace(/[^0-9.]/g, '')) || undefined : undefined,
            monthlyRent: rawTotalRent,
            initialRent: rawTotalRent,
            leaseStartDate: row.lease_start_date ? formatDateToDDMMYYYY(String(row.lease_start_date)) : undefined,
            leaseValidUpto: expiryVal,
            insuranceValidUpto: insExpiryVal,
            insuranceValidity: insExpiryVal,
            insurance_validity: insExpiryVal,
            policyNo: rawPolicyNo,
            policy_no: rawPolicyNo,
            premiumAmount: rawPremium,
            premium_amount: rawPremium,
            sumInsured: rawSumInsured,
            sum_insured: rawSumInsured,
            tradeLicenseValidUpto: tradeLicenseExpiryVal,
            holdingNumber: row.holding_number || undefined,
            holding_number: row.holding_number || undefined,
            latestTaxFinancialYear: row.latest_tax_financial_year || undefined,
            latest_tax_financial_year: row.latest_tax_financial_year || undefined,
            latestTaxAmount: row.latest_tax_amount !== null && row.latest_tax_amount !== undefined ? Number(row.latest_tax_amount) : undefined,
            latest_tax_amount: row.latest_tax_amount !== null && row.latest_tax_amount !== undefined ? Number(row.latest_tax_amount) : undefined,
            escalationPercentage: rawEscalation,
            revisionPeriodYears: rawRevision,
            ownerRole: row.owner_role || (row.lessor ? 'Lessor' : (row.lessee ? 'Lessee' : undefined)),
            owner_role: row.owner_role || (row.lessor ? 'Lessor' : (row.lessee ? 'Lessee' : undefined)),
            ownerOrLessee: row.lessee || row.lessor || undefined,
            lessor: row.lessor || undefined,
            lessee: row.lessee || undefined,
            documents: matchingDocs,
            createdDate: row.created_at || new Date().toISOString().split('T')[0]
          };
        });
        setProperties(dbMapped);
      }
    } catch (err) {
      console.error("Supabase load error:", err);
    } finally {
      setIsLoadingFromDb(false);
    }
  }, []);

  useEffect(() => {
    loadSupabaseProperties();
  }, [loadSupabaseProperties]);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('propintel_properties', JSON.stringify(properties));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }
  }, [properties]);

  // Handlers
  const handleSelectProperty = (property: PropertyRecord) => {
    setSelectedProperty(property);
    setActiveTab('detail');
  };

  const handleAddProperty = (newProp: PropertyRecord) => {
    setProperties((prev) => [newProp, ...prev]);
    setSelectedProperty(newProp);
    setActiveTab('detail');

    // Sync new property to Supabase
    addProperty(newProp).catch((err) => console.error("Error adding property to Supabase:", err));
  };

  const handleUpdateProperty = (updatedProp: PropertyRecord) => {
    setProperties((prev) => prev.map((p) => (p.id === updatedProp.id ? updatedProp : p)));
    setSelectedProperty(updatedProp);

    // Sync updates to Supabase
    if (updatedProp.code) {
      updatePropertyInDb(updatedProp.code, {
        property_title: updatedProp.title || updatedProp.propertyTitle || updatedProp.property_title,
        state: updatedProp.state,
        location: updatedProp.location,
        lease_start_date: updatedProp.leaseStartDate,
        lease_valid_upto: updatedProp.leaseValidUpto,
        insurance_valid_upto: updatedProp.insuranceValidUpto || updatedProp.insuranceValidity,
        insurance_validity: updatedProp.insuranceValidity || updatedProp.insuranceValidUpto,
        policy_no: updatedProp.policyNo || updatedProp.policy_no,
        premium_amount: typeof updatedProp.premiumAmount === 'number' ? updatedProp.premiumAmount : (typeof updatedProp.premium_amount === 'number' ? updatedProp.premium_amount : undefined),
        sum_insured: updatedProp.sumInsured ?? updatedProp.sum_insured,
        trade_license_valid_upto: updatedProp.tradeLicenseValidUpto,
        trade_license_validity: updatedProp.tradeLicenseValidUpto,
        total_rent: updatedProp.monthlyRent ?? updatedProp.initialRent,
        carpet_area: updatedProp.carpetAreaSqFt,
        lessee: updatedProp.lessee ?? updatedProp.ownerOrLessee,
        lessor: updatedProp.lessor,
        owner_role: updatedProp.owner_role || updatedProp.ownerRole,
        holding_number: updatedProp.holdingNumber ?? updatedProp.holding_number,
        latest_tax_financial_year: updatedProp.latestTaxFinancialYear ?? updatedProp.latest_tax_financial_year,
        latest_tax_amount: updatedProp.latestTaxAmount ?? updatedProp.latest_tax_amount,
        escalation_percentage: updatedProp.escalationPercentage,
        revision_period_years: updatedProp.revisionPeriodYears
      }).catch((err) =>
        console.error("Error updating property in Supabase:", err)
      );
    }
  };

  const handleDeleteProperty = (idOrCode: string) => {
    const target = properties.find((p) => p.id === idOrCode || p.code.toLowerCase() === idOrCode.toLowerCase());
    if (target) {
      setPropertyToDelete(target);
    } else {
      setPropertyToDelete({
        id: idOrCode,
        code: idOrCode,
        title: `Property ${idOrCode}`,
        carpetAreaSqFt: 0,
        monthlyRent: 0,
        location: 'Unknown',
        state: 'N/A',
        documents: [],
        createdDate: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;

    setIsDeleting(true);
    const targetCode = propertyToDelete.code;
    const targetId = propertyToDelete.id;

    try {
      const result = await deletePropertyComplete(targetCode, {
        skipConfirm: true,
        showAlert: false,
        onStateUpdate: (deletedCode) => {
          setProperties((prev) => prev.filter((p) => p.code !== deletedCode && p.id !== targetId));
          if (selectedProperty?.id === targetId || selectedProperty?.code === targetCode) {
            setSelectedProperty(null);
            setActiveTab('dashboard');
          }
        }
      });

      if (result.success) {
        setPropertyToDelete(null);
        setDeletedSuccessCode(targetCode);
        await loadSupabaseProperties();
      } else {
        console.error("Deletion failed:", result.error);
        alert(`Deletion failed: ${result.error?.message || result.error || 'Unknown error'}`);
        setPropertyToDelete(null);
      }
    } catch (err: any) {
      console.error("Error during property deletion:", err);
      alert(`Deletion error: ${err?.message || 'Failed to delete property'}`);
      setPropertyToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveExtractedDocument = (
    propertyCode: string,
    docType: PropertyType,
    fileName: string,
    extractedData: ExtractedPropertyData,
    imageDataUrl: string
  ) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.code.toUpperCase() === propertyCode.toUpperCase()) {
          const newDoc = {
            id: `doc-${Date.now()}`,
            propertyCode,
            documentType: docType,
            fileName,
            imageDataUrl,
            uploadDate: new Date().toISOString().split('T')[0],
            status: 'Verified' as const,
            extractedData
          };

          // Update property carpet area, rent, or lease dates if extracted
          const updatedCarpet = extractedData.carpetArea ? Number(extractedData.carpetArea) || p.carpetAreaSqFt : p.carpetAreaSqFt;
          const updatedRent = extractedData.totalRent ? Number(extractedData.totalRent) || p.monthlyRent : p.monthlyRent;
          const updatedStart = extractedData.leaseStartDate || extractedData.startDate || p.leaseStartDate;
          const updatedExpiry = extractedData.expiryDate || extractedData.leaseStartDate ? (extractedData.expiryDate || p.leaseValidUpto) : p.leaseValidUpto;
          const updatedInsExpiry = (docType === 'Insurance' && (extractedData.insuranceValidity || extractedData.expiryDate))
            ? formatDateToDDMMYYYY(extractedData.insuranceValidity || extractedData.expiryDate)
            : p.insuranceValidUpto;
          const updatedSumInsured = (docType === 'Insurance' && extractedData.sumInsured)
            ? extractedData.sumInsured
            : p.sumInsured;

          return {
            ...p,
            carpetAreaSqFt: updatedCarpet,
            monthlyRent: updatedRent,
            leaseStartDate: updatedStart,
            leaseValidUpto: updatedExpiry,
            insuranceValidUpto: updatedInsExpiry,
            sumInsured: updatedSumInsured,
            documents: [newDoc, ...(p.documents || [])]
          };
        }
        return p;
      })
    );

    const target = properties.find((p) => p.code.toUpperCase() === propertyCode.toUpperCase());
    if (target) {
      setSelectedProperty(target);
      setActiveTab('detail');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleNavigateToCapture = (propertyCode?: string) => {
    setCaptureTargetCode(propertyCode);
    setActiveTab('capture');
  };

  const handleNavigateToChatWithProperty = (propertyCode: string) => {
    setChatPrompt(`Summarize key clauses, escalation rates, and compliance risks for ${propertyCode}.`);
    setActiveTab('chat');
  };

  const handleSelectPropertyCodeFromChat = (code: string) => {
    const found = properties.find((p) => p.code.toLowerCase() === code.toLowerCase());
    if (found) {
      setSelectedProperty(found);
      setActiveTab('detail');
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-slate-300 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'capture') setCaptureTargetCode(undefined);
        }}
        properties={properties}
        onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onNavigateToAdd={() => setActiveTab('add')}
            onNavigateToCapture={handleNavigateToCapture}
            onDeleteProperty={handleDeleteProperty}
            onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
          />
        )}

        {activeTab === 'add' && (
          <AddPropertyView
            existingProperties={properties}
            onAddProperty={handleAddProperty}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'capture' && (
          <DocumentCaptureView
            properties={properties}
            selectedPropertyCode={captureTargetCode}
            onSaveExtractedDocument={handleSaveExtractedDocument}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'detail' && selectedProperty && (
          <PropertyDetailView
            property={selectedProperty}
            onBack={() => setActiveTab('dashboard')}
            onNavigateToCapture={handleNavigateToCapture}
            onNavigateToChatWithProperty={handleNavigateToChatWithProperty}
            onUpdateProperty={handleUpdateProperty}
            onDeleteProperty={handleDeleteProperty}
          />
        )}

        {activeTab === 'chat' && (
          <AIChatAssistant
            properties={properties}
            initialPrompt={chatPrompt}
            onSelectPropertyCode={handleSelectPropertyCodeFromChat}
          />
        )}

        {activeTab === 'cashflow' && (
          <div className="space-y-6">
            <CashflowProjectionDashboard
              fallbackProperties={properties}
              onSelectProperty={(code) => {
                const found = properties.find(p => p.code.toLowerCase() === code.toLowerCase());
                if (found) handleSelectProperty(found);
              }}
            />
          </div>
        )}
      </main>

      {/* Compliance Expiry Risk Center Modal */}
      <ComplianceAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        properties={properties}
        onSelectProperty={handleSelectProperty}
        onNavigateToCapture={handleNavigateToCapture}
      />

      {/* Delete Confirmation & Success Modal */}
      <DeleteModal
        warningProperty={propertyToDelete}
        isDeleting={isDeleting}
        onCancelWarning={() => setPropertyToDelete(null)}
        onConfirmDelete={handleConfirmDelete}
        successPropertyCode={deletedSuccessCode}
        onCloseSuccess={() => setDeletedSuccessCode(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#090a0c] py-6 text-center text-[11px] text-slate-500">
        <p>Property Intelligence Platform &copy; 2026 • AI-Powered Document OCR &amp; Compliance Tracking</p>
      </footer>
    </div>
  );
}
