import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2, X, Loader2 } from 'lucide-react';
import { PropertyRecord } from '../types';

interface DeleteModalProps {
  warningProperty: PropertyRecord | null;
  isDeleting: boolean;
  onCancelWarning: () => void;
  onConfirmDelete: () => void;
  successPropertyCode: string | null;
  onCloseSuccess: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  warningProperty,
  isDeleting,
  onCancelWarning,
  onConfirmDelete,
  successPropertyCode,
  onCloseSuccess,
}) => {
  return (
    <>
      {/* Warning Confirmation Modal */}
      {warningProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#14171d] border border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            {/* Header / Icon */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
                  <p className="text-xs text-rose-400 font-medium">Warning: Irreversible API request</p>
                </div>
              </div>
              <button
                onClick={onCancelWarning}
                disabled={isDeleting}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="mt-4 bg-[#0d0f14] border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500 font-semibold">Property Code:</span>
                <span className="font-mono text-indigo-400 font-bold">{warningProperty.code}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500 font-semibold">Title:</span>
                <span className="font-medium text-white">{warningProperty.title}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500 font-semibold">Location:</span>
                <span className="text-slate-400">{warningProperty.location}, {warningProperty.state}</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this property? Only after you confirm will the delete request be sent to the Supabase database.
            </p>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onCancelWarning}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors disabled:opacity-50 shadow-lg shadow-rose-900/30"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting from API...</span>
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

      {/* Deletion Success Modal */}
      {successPropertyCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#14171d] border border-emerald-900/60 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">Deletion Successful</h3>
            <p className="mt-2 text-xs text-slate-300">
              Property <span className="font-mono text-indigo-400 font-bold">{successPropertyCode}</span> was successfully deleted from Supabase.
            </p>
            <p className="mt-1.5 text-[11px] text-slate-400">
              The remaining entries have been refetched from Supabase.
            </p>

            <button
              type="button"
              onClick={onCloseSuccess}
              className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/30"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
