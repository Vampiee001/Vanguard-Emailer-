import React from 'react';
import { Mail, AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSending: boolean;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  projectTitles: string[];
  senderEmail?: string;
  batchCount?: number;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSending,
  recipientEmail,
  recipientName,
  subject,
  projectTitles,
  senderEmail,
  batchCount = 1,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-base font-semibold text-slate-900 font-display">
                Confirm Email Dispatch
              </h3>
              <p className="text-xs text-slate-500">
                Action requires your explicit approval before sending via Gmail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4 text-sm text-slate-600">
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              You are about to dispatch an official real estate pitch email from your connected Google account
              {senderEmail ? <strong className="font-semibold text-amber-950"> ({senderEmail})</strong> : ''}.
              This email will be delivered to the recipient&apos;s primary inbox.
            </p>
          </div>

          <div className="space-y-2.5 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Recipient:</span>
              <span className="font-semibold text-slate-900">
                {recipientName} &lt;{recipientEmail}&gt;
              </span>
            </div>
            {batchCount > 1 && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Batch Size:</span>
                <span className="font-semibold text-slate-900">{batchCount} client contacts</span>
              </div>
            )}
            <div className="flex justify-between items-start py-1 border-b border-slate-200/60">
              <span className="text-slate-500 shrink-0 mr-4">Subject Line:</span>
              <span className="font-medium text-slate-900 text-right truncate max-w-[280px]">
                {subject}
              </span>
            </div>
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 shrink-0 mr-4">Properties Included:</span>
              <span className="font-medium text-slate-800 text-right">
                {projectTitles.join(', ') || 'Selected Real Estate Portfolio'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 italic">
            Once sent, a copy of the dispatched message will be archived in your Gmail &quot;Sent&quot; folder and recorded in the application dispatch history.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSending}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Sending via Gmail API...</span>
              </>
            ) : (
              <span>Confirm &amp; Send Email</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
