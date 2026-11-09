import React, { useState } from 'react';
import { SentEmailRecord } from '../types';
import { Mail, CheckCircle2, Eye, ExternalLink, Calendar, User, Clock } from 'lucide-react';

interface SentHistoryProps {
  records: SentEmailRecord[];
  onOpenDraftForClient?: (clientEmail: string) => void;
}

export const SentHistory: React.FC<SentHistoryProps> = ({ records }) => {
  const [selectedRecord, setSelectedRecord] = useState<SentEmailRecord | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display">
            Email Dispatch Log &amp; Archive
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of real estate client communications dispatched through Gmail API and mail clients.
          </p>
        </div>

        <div className="text-xs text-slate-500">
          Total Sent:{' '}
          <span className="font-semibold text-slate-900 font-mono tabular-nums">
            {records.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Subject &amp; Projects</th>
                <th className="py-3 px-4">Method &amp; Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">View Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-600">No emails sent yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Generate and dispatch your first client campaign in the Studio tab.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{record.recipientName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{record.recipientEmail}</div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-medium text-slate-900 truncate">{record.subject}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {record.projectTitles.join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium text-slate-800">
                          {record.method === 'gmail_api'
                            ? 'Gmail REST API'
                            : record.method === 'mailto'
                            ? 'Mail Client'
                            : 'Dispatched'}
                        </span>
                      </div>
                      {record.messageId && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[120px]">
                          ID: {record.messageId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px] tabular-nums">
                      {new Date(record.sentAt).toLocaleDateString()} {new Date(record.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspect Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Sent Email Inspection
                </h3>
                <p className="text-xs text-slate-500">
                  To: {selectedRecord.recipientName} ({selectedRecord.recipientEmail})
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-100 overflow-y-auto flex-1">
              <div className="bg-white p-4 rounded-lg shadow-xs border border-slate-200 mb-3 text-xs space-y-1">
                <div><strong>Subject:</strong> {selectedRecord.subject}</div>
                <div><strong>Date Dispatched:</strong> {new Date(selectedRecord.sentAt).toLocaleString()}</div>
                <div><strong>Delivery Method:</strong> {selectedRecord.method}</div>
                <div><strong>Properties:</strong> {selectedRecord.projectTitles.join(', ')}</div>
              </div>

              <div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-4"
                dangerouslySetInnerHTML={{ __html: selectedRecord.htmlContent }}
              />
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
