import { createClient } from '@supabase/supabase-js';
import { convertDDMMYYYYToISO } from './utils/dateFormatter';

// Supabase URL & Key retrieved securely from environment variables (.env / VITE_*)
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '') : '';
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || (import.meta.env.VITE_SUPABASE_KEY as string) || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase configuration is missing in environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-anon-key');

// Create
export async function addProperty(propertyData: {
  code: string;
  title?: string;
  propertyTitle?: string;
  property_title?: string;
  location: string;
  state: string;
  lease_start_date?: string | null;
  lease_valid_upto?: string | null;
  monthlyRent?: number;
  carpetAreaSqFt?: number;
  [key: string]: any;
}) {
  const propertyTitle = (propertyData.property_title || propertyData.propertyTitle || propertyData.title || '').trim();

  const insertPayload: Record<string, any> = {
    property_title: propertyTitle,
    property_code: propertyData.code,
    location: propertyData.location,
    state: propertyData.state
  };

  const rawStart = propertyData.lease_start_date || propertyData.leaseStartDate || propertyData.startDate;
  if (rawStart) {
    insertPayload.lease_start_date = convertDDMMYYYYToISO(rawStart);
  }

  const rawExpiry = propertyData.lease_valid_upto || propertyData.leaseValidUpto;
  if (rawExpiry) {
    insertPayload.lease_valid_upto = convertDDMMYYYYToISO(rawExpiry);
  }

  const rawInsExpiry = propertyData.insurance_valid_upto || propertyData.insuranceValidUpto || propertyData.insurance_validity || propertyData.insuranceValidity;
  if (rawInsExpiry) {
    insertPayload.insurance_valid_upto = convertDDMMYYYYToISO(rawInsExpiry);
  }

  const rawSumInsured = propertyData.sum_insured || propertyData.sumInsured;
  if (rawSumInsured !== undefined && rawSumInsured !== null && rawSumInsured !== '') {
    insertPayload.sum_insured = typeof rawSumInsured === 'number' ? rawSumInsured : (Number(String(rawSumInsured).replace(/[^0-9.]/g, '')) || rawSumInsured);
  }

  const rawOwnerRole = propertyData.owner_role || propertyData.ownerRole;
  if (rawOwnerRole) {
    insertPayload.owner_role = rawOwnerRole;
  }

  let { data, error } = await supabase
    .from('properties')
    .insert([insertPayload])
    .select(); // .select() tells Supabase to return the inserted row

  // Handle PGRST204 (Missing column in schema cache e.g. lease_valid_upto)
  if (error && error.code === 'PGRST204') {
    console.warn('PGRST204 encountered during insert. Attempting fallback with core columns only:', error.message);
    const retryPayload: Record<string, any> = {
      property_title: propertyTitle,
      property_code: propertyData.code,
      location: propertyData.location,
      state: propertyData.state
    };
    const retryResult = await supabase
      .from('properties')
      .insert([retryPayload])
      .select();

    data = retryResult.data;
    error = retryResult.error;
  }

  if (error) {
    console.error('Error inserting data:', error);
    return null;
  }
  console.log('Successfully inserted:', data);
  return data;
}

// Read
export async function getProperties() {
  const { data, error } = await supabase
    .from('properties')
    .select('*'); // Get all columns

  if (error) {
    console.error('Error fetching data:', error);
    return [];
  }
  return data;
}

// Read documents from property_documents table
export async function getPropertyDocuments(propertyCode?: string) {
  try {
    let query = supabase
      .from('property_documents')
      .select('*');

    if (propertyCode) {
      query = query.eq('property_code', propertyCode);
    }

    // Attempt order by uploaded_at, with fallback to created_at or unordered if column missing
    try {
      query = query.order('uploaded_at', { ascending: false });
    } catch {
      // fallback
    }

    const { data, error } = await query;
    if (error) {
      // If error was due to uploaded_at ordering, try fallback select without ordering
      const fallbackRes = await (propertyCode 
        ? supabase.from('property_documents').select('*').eq('property_code', propertyCode)
        : supabase.from('property_documents').select('*'));
      
      if (fallbackRes.error) {
        console.warn('Notice fetching property_documents:', fallbackRes.error.message);
        return [];
      }
      return fallbackRes.data || [];
    }
    return data || [];
  } catch (err) {
    console.warn('Error reading property_documents:', err);
    return [];
  }
}

// Update
export async function updatePropertyInDb(
  propertyCode: string,
  fields: {
    title?: string;
    propertyTitle?: string;
    property_title?: string;
    state?: string;
    location?: string;
    lease_valid_upto?: string | null;
    lease_start_date?: string | null;
    escalation_percentage?: number;
    revision_period_years?: number;
    total_rent?: number;
    carpet_area?: number | string;
    rent_per_sq_ft?: number | string;
    lessee?: string;
    lessor?: string;
    owner_role?: string;
    ownerRole?: string;
    holding_number?: string | null;
    latest_tax_financial_year?: string | null;
    latest_tax_amount?: number | null;
    insurance_valid_upto?: string | null;
    insurance_validity?: string | null;
    policy_no?: string | null;
    policyNo?: string | null;
    premium_amount?: number | null;
    premiumAmount?: number | null;
    sum_insured?: number | string | null;
    sumInsured?: number | string | null;
    trade_license_valid_upto?: string | null;
    trade_license_validity?: string | null;
  }
) {
  const updatePayload: Record<string, any> = {};
  
  const titleVal = fields.property_title || fields.propertyTitle || fields.title;
  if (titleVal !== undefined) {
    updatePayload.property_title = titleVal.trim();
  }

  if (fields.state !== undefined) updatePayload.state = fields.state;
  if (fields.location !== undefined) updatePayload.location = fields.location;
  
  // Format date fields to standard ISO (YYYY-MM-DD) or null for PostgreSQL date columns
  if (fields.lease_valid_upto !== undefined) {
    updatePayload.lease_valid_upto = convertDDMMYYYYToISO(fields.lease_valid_upto);
  }
  if (fields.lease_start_date !== undefined) {
    updatePayload.lease_start_date = convertDDMMYYYYToISO(fields.lease_start_date);
  }
  if (fields.insurance_valid_upto !== undefined) {
    updatePayload.insurance_valid_upto = convertDDMMYYYYToISO(fields.insurance_valid_upto);
  }
  if (fields.insurance_validity !== undefined) {
    updatePayload.insurance_validity = convertDDMMYYYYToISO(fields.insurance_validity);
  }
  if (fields.policy_no !== undefined || fields.policyNo !== undefined) {
    updatePayload.policy_no = fields.policy_no ?? fields.policyNo;
  }
  if (fields.premium_amount !== undefined || fields.premiumAmount !== undefined) {
    updatePayload.premium_amount = fields.premium_amount ?? fields.premiumAmount;
  }
  if (fields.sum_insured !== undefined || fields.sumInsured !== undefined) {
    updatePayload.sum_insured = fields.sum_insured ?? fields.sumInsured;
  }
  if (fields.trade_license_valid_upto !== undefined) {
    updatePayload.trade_license_valid_upto = convertDDMMYYYYToISO(fields.trade_license_valid_upto);
  }
  if (fields.trade_license_validity !== undefined) {
    updatePayload.trade_license_validity = convertDDMMYYYYToISO(fields.trade_license_validity);
  }

  if (fields.escalation_percentage !== undefined) updatePayload.escalation_percentage = fields.escalation_percentage;
  if (fields.revision_period_years !== undefined) updatePayload.revision_period_years = fields.revision_period_years;
  if (fields.total_rent !== undefined) updatePayload.total_rent = fields.total_rent;
  if (fields.carpet_area !== undefined) updatePayload.carpet_area = fields.carpet_area;
  if (fields.rent_per_sq_ft !== undefined) updatePayload.rent_per_sq_ft = fields.rent_per_sq_ft;
  if (fields.lessee !== undefined) updatePayload.lessee = fields.lessee;
  if (fields.lessor !== undefined) updatePayload.lessor = fields.lessor;
  if ((fields as any).owner_role !== undefined || (fields as any).ownerRole !== undefined) {
    updatePayload.owner_role = (fields as any).owner_role ?? (fields as any).ownerRole;
  }
  if (fields.holding_number !== undefined) updatePayload.holding_number = fields.holding_number;
  if (fields.latest_tax_financial_year !== undefined) updatePayload.latest_tax_financial_year = fields.latest_tax_financial_year;
  if (fields.latest_tax_amount !== undefined) updatePayload.latest_tax_amount = fields.latest_tax_amount;

  let { data, error } = await supabase
    .from('properties')
    .update(updatePayload)
    .eq('property_code', propertyCode);

  // If column does not exist in schema (PGRST204), progressively retry removing non-essential fields
  if (error && error.code === 'PGRST204') {
    console.warn("PGRST204 error updating property. Retrying with basic fields only...", error.message);
    const fallbackPayload: Record<string, any> = {};
    if (titleVal !== undefined) fallbackPayload.property_title = titleVal.trim();
    if (fields.state !== undefined) fallbackPayload.state = fields.state;
    if (fields.location !== undefined) fallbackPayload.location = fields.location;

    const retryResult = await supabase
      .from('properties')
      .update(fallbackPayload)
      .eq('property_code', propertyCode);
    data = retryResult.data;
    error = retryResult.error;
  }

  if (error) {
    console.error('Error updating property in Supabase:', error);
  } else {
    console.log('Successfully updated property in Supabase:', data);
  }
  return data;
}

export async function updatePropertyExpiry(propertyCode: string, expiryDate: string) {
  return updatePropertyInDb(propertyCode, { lease_valid_upto: expiryDate });
}

// Delete
export async function deleteProperty(propertyCode: string, id?: string) {
  let error = null;
  let data = null;

  if (id && !isNaN(Number(id))) {
    const resId = await supabase
      .from('properties')
      .delete()
      .eq('id', Number(id));
    data = resId.data;
    error = resId.error;
  }

  // Also delete by property_code to be thorough
  if (propertyCode) {
    const resCode = await supabase
      .from('properties')
      .delete()
      .eq('property_code', propertyCode);
    if (!data) data = resCode.data;
    if (error && !resCode.error) error = null;
  }

  if (error) {
    console.error('Error deleting data from Supabase:', error);
  } else {
    console.log('Successfully deleted property from Supabase:', propertyCode);
  }
  return data;
}

/**
 * Helper to extract the relative file path/name from a Supabase Storage public URL
 * Handles full public URLs, encoded characters, and query strings.
 * Example: 'https://xyz.supabase.co/storage/v1/object/public/property-documents/A123-123.jpg' -> 'A123-123.jpg'
 */
export function extractStoragePathFromUrl(fileUrl: string): string | null {
  if (!fileUrl) return null;
  const str = String(fileUrl).trim();

  // Skip in-memory base64 data URLs
  if (str.startsWith('data:')) return null;

  const bucketMarker = '/property-documents/';
  const markerIdx = str.indexOf(bucketMarker);

  if (markerIdx !== -1) {
    const rawPath = str.substring(markerIdx + bucketMarker.length);
    return decodeURIComponent(rawPath.split('?')[0].split('#')[0]).trim();
  }

  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const parsed = new URL(str);
      const pathname = parsed.pathname;
      const subIdx = pathname.indexOf(bucketMarker);
      if (subIdx !== -1) {
        const rawPath = pathname.substring(subIdx + bucketMarker.length);
        return decodeURIComponent(rawPath.split('?')[0].split('#')[0]).trim();
      }
      const lastSegment = pathname.split('/').pop() || '';
      return decodeURIComponent(lastSegment.split('?')[0].split('#')[0]).trim();
    } catch {
      const parts = str.split('/');
      const last = parts.pop() || '';
      return decodeURIComponent(last.split('?')[0].split('#')[0]).trim();
    }
  }

  // Plain filename or relative storage path
  return decodeURIComponent(str.split('?')[0].split('#')[0]).trim();
}

export interface DeletePropertyCompleteOptions {
  onStateUpdate?: (deletedCode: string) => void;
  skipConfirm?: boolean;
  showAlert?: boolean;
}

/**
 * Complete "Cascade Delete" function for properties in Supabase
 *
 * Sequence:
 * Step 1: Query 'property_documents' table to select all file_urls matching property_code.
 * Step 2: Extract file paths from URLs and delete physical files from 'property-documents' Supabase Storage bucket.
 * Step 3: Delete the parent record from 'properties' table (Postgres ON DELETE CASCADE cleans up child rows).
 * Step 4: Wrapped in try/catch, safely handles confirmation, and triggers UI state update.
 *
 * @param propertyCode The unique property code identifier (e.g. 'PROP-101')
 * @param optionsOrCallback Optional state update callback OR options object
 */
export async function deletePropertyComplete(
  propertyCode: string,
  optionsOrCallback?: ((deletedCode: string) => void) | DeletePropertyCompleteOptions
): Promise<{ success: boolean; error?: any; deletedFiles?: string[] }> {
  if (!propertyCode || typeof propertyCode !== 'string') {
    return { success: false, error: 'Invalid property code' };
  }

  const options: DeletePropertyCompleteOptions = typeof optionsOrCallback === 'function'
    ? { onStateUpdate: optionsOrCallback, skipConfirm: true, showAlert: false }
    : (optionsOrCallback || {});

  const onStateUpdate = options.onStateUpdate;
  const skipConfirm = options.skipConfirm ?? false;
  const showAlert = options.showAlert ?? false;

  // Step 4 (Confirmation): Ask user confirmation if requested and available
  if (!skipConfirm) {
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const isConfirmed = window.confirm(
          `Are you sure you want to delete property "${propertyCode}"?\n\nThis will permanently delete the property record, all associated documents from the database, and clean up physical storage files.`
        );
        if (!isConfirmed) {
          console.log(`[deletePropertyComplete] Deletion cancelled by user for property: ${propertyCode}`);
          return { success: false, error: 'Cancelled by user' };
        }
      }
    } catch (e) {
      console.warn('[deletePropertyComplete] Browser modal confirmation blocked in iframe, proceeding with deletion:', e);
    }
  }

  try {
    console.log(`[deletePropertyComplete] Starting cascade delete sequence for property: ${propertyCode}`);

    // Step 1: Fetch associated files from 'property_documents' table
    const { data: docRows, error: fetchDocsError } = await supabase
      .from('property_documents')
      .select('file_url')
      .eq('property_code', propertyCode);

    if (fetchDocsError) {
      console.warn(`[deletePropertyComplete] Notice fetching documents for ${propertyCode}:`, fetchDocsError.message);
    }

    const deletedFiles: string[] = [];

    // Step 2: Delete physical files from Supabase Storage ('property-documents' bucket)
    if (docRows && Array.isArray(docRows) && docRows.length > 0) {
      const filePathsToDelete: string[] = [];

      for (const doc of docRows) {
        if (doc.file_url) {
          const path = extractStoragePathFromUrl(doc.file_url);
          if (path && !filePathsToDelete.includes(path)) {
            filePathsToDelete.push(path);
          }
        }
      }

      if (filePathsToDelete.length > 0) {
        console.log(`[deletePropertyComplete] Deleting ${filePathsToDelete.length} file(s) from 'property-documents' storage:`, filePathsToDelete);
        const { data: storageData, error: storageError } = await supabase
          .storage
          .from('property-documents')
          .remove(filePathsToDelete);

        if (storageError) {
          console.warn('[deletePropertyComplete] Storage removal notice:', storageError.message);
        } else {
          console.log('[deletePropertyComplete] Physical files removed from storage:', storageData);
          deletedFiles.push(...filePathsToDelete);
        }
      }
    }

    // Step 3: Delete the database record from 'properties' table
    // (PostgreSQL ON DELETE CASCADE will automatically clean up child rows in 'property_documents')
    const { error: dbDeleteError } = await supabase
      .from('properties')
      .delete()
      .eq('property_code', propertyCode);

    if (dbDeleteError) {
      console.error('[deletePropertyComplete] Database deletion error:', dbDeleteError);
      throw new Error(`Failed to delete property record from database: ${dbDeleteError.message}`);
    }

    console.log(`[deletePropertyComplete] Property record '${propertyCode}' successfully deleted from database.`);

    // Step 4 (UI State Update): Trigger state update callback to remove deleted property from UI
    if (onStateUpdate) {
      onStateUpdate(propertyCode);
    }

    // Step 4 (Success Alert): Optional alert
    if (showAlert) {
      try {
        const fileNotice = deletedFiles.length > 0 ? ` and ${deletedFiles.length} storage file(s)` : '';
        window.alert(`Property "${propertyCode}"${fileNotice} was successfully and permanently deleted.`);
      } catch (e) {
        console.log('[deletePropertyComplete] Alert skipped:', e);
      }
    }

    return {
      success: true,
      deletedFiles
    };
  } catch (error: any) {
    console.error(`[deletePropertyComplete] Error deleting property ${propertyCode}:`, error);
    if (showAlert) {
      try {
        window.alert(`Failed to delete property "${propertyCode}": ${error?.message || 'An unexpected error occurred.'}`);
      } catch {
        // ignore alert error in iframe
      }
    }
    return {
      success: false,
      error
    };
  }
}

// Attach to window object for interactive debugging or direct console invocation
if (typeof window !== 'undefined') {
  (window as any).deletePropertyComplete = deletePropertyComplete;
}

export interface DocumentToDelete {
  id: string | number;
  property_code?: string;
  propertyCode?: string;
  document_type?: string;
  documentType?: string;
  file_url?: string;
  fileUrl?: string;
  [key: string]: any;
}

export interface DeleteDocumentOptions {
  skipConfirm?: boolean;
  showAlert?: boolean;
  onStateUpdate?: (deletedDocId: string | number, updatePayload?: Record<string, any> | null) => void;
}

/**
 * Complex Deletion Function for Supabase Documents
 *
 * Sequence:
 * Step 1: Extract relative file path from file_url and remove from 'property-documents' Supabase Storage.
 * Step 2: Delete the record from 'property_documents' table by id.
 * Step 3: Map and nullify parent fields in 'properties' table based on document_type.
 * Step 4: Display success notification and trigger UI state management.
 *
 * @param document The document object containing { id, property_code, document_type, file_url }
 * @param options Optional configuration including skipConfirm, showAlert, onStateUpdate
 */
export async function deleteDocument(
  document: DocumentToDelete,
  options?: DeleteDocumentOptions
): Promise<{ success: boolean; error?: any; updatePayload?: Record<string, any> | null }> {
  if (!document) {
    return { success: false, error: 'No document specified for deletion' };
  }

  const skipConfirm = options?.skipConfirm ?? false;
  const showAlert = options?.showAlert ?? false;
  const onStateUpdate = options?.onStateUpdate;

  // Ask for window.confirm only if explicitly not skipped and window.confirm is interactive
  if (!skipConfirm) {
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const docTypeName = document.document_type || document.documentType || 'document';
        const isConfirmed = window.confirm(
          `Are you sure you want to delete this ${docTypeName}?\n\nThis will permanently delete the file from Supabase storage, remove the document record, and reset associated compliance fields on the property.`
        );
        if (isConfirmed === false) {
          console.log('[deleteDocument] Deletion cancelled by user for document ID:', document.id);
          return { success: false, error: 'Cancelled by user' };
        }
      }
    } catch (e) {
      console.warn('[deleteDocument] Window confirm prompt error in sandbox iframe, proceeding:', e);
    }
  }

  try {
    const fileUrl = document.file_url || document.fileUrl || '';
    const docId = document.id;
    const propCode = document.property_code || document.propertyCode || '';
    const docType = document.document_type || document.documentType || '';

    console.log(`[deleteDocument] Starting deletion sequence for document ID: ${docId}, Type: ${docType}, Property: ${propCode}`);

    // ==========================================
    // Step 1: Delete from Storage
    // ==========================================
    if (fileUrl && typeof fileUrl === 'string' && !fileUrl.startsWith('data:')) {
      let filePath = '';
      if (fileUrl.includes('property-documents/')) {
        filePath = fileUrl.split('property-documents/')[1].split('?')[0].split('#')[0];
      } else {
        filePath = extractStoragePathFromUrl(fileUrl) || fileUrl;
      }

      if (filePath) {
        const cleanFilePath = decodeURIComponent(filePath).trim();
        console.log(`[deleteDocument] Step 1: Removing physical file from 'property-documents' storage: "${cleanFilePath}"`);
        try {
          const { error: storageError } = await supabase
            .storage
            .from('property-documents')
            .remove([cleanFilePath]);

          if (storageError) {
            console.warn('[deleteDocument] Notice during Supabase Storage removal:', storageError.message);
          } else {
            console.log(`[deleteDocument] Storage file successfully removed: ${cleanFilePath}`);
          }
        } catch (storageErr) {
          console.warn('[deleteDocument] Storage removal caught error:', storageErr);
        }
      }
    }

    // ==========================================
    // Step 2: Delete from property_documents
    // ==========================================
    if (docId !== undefined && docId !== null) {
      console.log(`[deleteDocument] Step 2: Deleting record from 'property_documents' where id = ${docId}`);
      try {
        const { error: deleteDocError } = await supabase
          .from('property_documents')
          .delete()
          .eq('id', docId);

        if (deleteDocError) {
          console.warn('[deleteDocument] Delete by id notice:', deleteDocError.message);
          // If delete by id failed, attempt delete by file_url or property_code
          if (fileUrl) {
            await supabase
              .from('property_documents')
              .delete()
              .eq('file_url', fileUrl);
          }
        }
      } catch (errDoc) {
        console.warn('[deleteDocument] Caught error deleting from property_documents:', errDoc);
        if (fileUrl) {
          await supabase.from('property_documents').delete().eq('file_url', fileUrl);
        }
      }
    } else if (fileUrl) {
      await supabase.from('property_documents').delete().eq('file_url', fileUrl);
    }

    // ==========================================
    // Step 3: Map and Nullify Parent Fields
    // ==========================================
    let updatePayload: Record<string, any> | null = null;

    if (docType === 'Insurance') {
      updatePayload = {
        insurance_validity: null,
        policy_no: null,
        premium_amount: null,
        sum_insured: null,
      };
    } else if (docType === 'Trade License') {
      updatePayload = {
        trade_license_validity: null,
      };
    } else if (docType === 'Municipality Tax') {
      updatePayload = {
        holding_number: null,
        latest_tax_financial_year: null,
        latest_tax_amount: null,
      };
    } else if (docType === 'Lease Deed') {
      updatePayload = {
        carpet_area: null,
        total_rent: null,
        rent_per_sq_ft: null,
        lease_start_date: null,
        lease_valid_upto: null,
        escalation_percentage: null,
        revision_period_years: null,
        lessee: null,
        lessor: null,
      };
    }

    if (updatePayload && propCode) {
      console.log(`[deleteDocument] Step 3: Nullifying parent properties table fields for '${propCode}':`, updatePayload);
      try {
        const { error: updatePropError } = await supabase
          .from('properties')
          .update(updatePayload)
          .eq('property_code', propCode);

        if (updatePropError) {
          console.warn('[deleteDocument] Notice updating parent property table (attempting fallback):', updatePropError.message);
          // Fallback if specific extended columns are missing in DB
          if (docType === 'Insurance') {
            await supabase.from('properties').update({ insurance_validity: null }).eq('property_code', propCode);
          } else if (docType === 'Lease Deed') {
            await supabase.from('properties').update({ lease_valid_upto: null, lease_start_date: null, total_rent: null }).eq('property_code', propCode);
          }
        } else {
          console.log(`[deleteDocument] Parent property '${propCode}' fields nullified successfully.`);
        }
      } catch (errProp) {
        console.warn('[deleteDocument] Caught error during property fields update:', errProp);
      }
    }

    // ==========================================
    // Step 4: UI State Management & Notification
    // ==========================================
    if (onStateUpdate && docId !== undefined && docId !== null) {
      onStateUpdate(docId, updatePayload);
    }

    if (showAlert) {
      try {
        const typeLabel = docType ? ` (${docType})` : '';
        window.alert(`Document${typeLabel} was successfully deleted and associated property compliance fields were reset.`);
      } catch (e) {
        console.log('[deleteDocument] Alert notice:', e);
      }
    }

    return {
      success: true,
      updatePayload,
    };
  } catch (error: any) {
    console.error('[deleteDocument] Error executing document deletion:', error);
    if (showAlert) {
      try {
        window.alert(`Failed to delete document: ${error?.message || 'An unexpected error occurred.'}`);
      } catch {
        // ignore alert error in iframe
      }
    }
    return {
      success: false,
      error,
    };
  }
}

// Attach to window object for interactive debugging or direct console invocation
if (typeof window !== 'undefined') {
  (window as any).deleteDocument = deleteDocument;
}

