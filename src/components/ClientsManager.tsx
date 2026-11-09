import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { ClientContact } from '../types';
import { generateSampleCsv } from '../data/sampleClients';
import { 
  parseSpreadsheetFile, 
  parsePastedSpreadsheetText, 
  importFromGoogleSheetUrl, 
  exportClientsToExcel 
} from '../services/sheets';
import { 
  listDriveSpreadsheets, 
  fetchSpreadsheetClients, 
  syncAllClientsToGoogleSheet, 
  DriveSpreadsheetFile 
} from '../services/driveSheets';
import { 
  Upload, 
  UserPlus, 
  Download, 
  Search, 
  Mail, 
  Send, 
  Trash2, 
  Check, 
  AlertCircle, 
  RotateCcw, 
  CheckSquare, 
  Square, 
  FileSpreadsheet, 
  Link, 
  Sparkles, 
  ExternalLink,
  HardDrive,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface ClientsManagerProps {
  clients: ClientContact[];
  onAddClient: (client: ClientContact) => void;
  onAddBatchClients: (clients: ClientContact[]) => void;
  onDeleteClient: (id: string) => void;
  onSelectClientForEmail: (client: ClientContact) => void;
  selectedClientId?: string;
  user: User | null;
  accessToken: string | null;
  connectedSheet: { id: string; name: string } | null;
  onConnectSheet: (sheet: { id: string; name: string } | null) => void;
  onSignInRequired: () => void;
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({
  clients,
  onAddClient,
  onAddBatchClients,
  onDeleteClient,
  onSelectClientForEmail,
  selectedClientId,
  user,
  accessToken,
  connectedSheet,
  onConnectSheet,
  onSignInRequired,
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'off-plan' | 'secondary'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'vip' | 'active' | 'lead' | 'contacted'>('all');
  const [budgetFilter, setBudgetFilter] = useState<'all' | 'under5m' | '5m-15m' | '15m-plus'>('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState<'all' | 'emailed' | 'not-emailed'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'most-emailed' | 'status-vip'>('name-asc');

  // Multi-select for batch pitch
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  // Modals & Sheet Import
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<'drive' | 'file' | 'google-sheet' | 'paste'>('drive');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isProcessingSheet, setIsProcessingSheet] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive Spreadsheets state
  const [driveSheets, setDriveSheets] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isSyncingToSheet, setIsSyncingToSheet] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // New single client form state
  const [newClient, setNewClient] = useState<Partial<ClientContact>>({
    name: '',
    email: '',
    phone: '',
    company: '',
    budgetFormatted: 'AED 5.0M - AED 15.0M',
    preferredType: 'all',
    preferredLocation: '',
    notes: '',
    status: 'active',
  });

  // Load Google Drive spreadsheets when modal opens or tab switches to 'drive'
  useEffect(() => {
    if (isUploadModalOpen && uploadTab === 'drive' && accessToken) {
      loadDriveSheets();
    }
  }, [isUploadModalOpen, uploadTab, accessToken]);

  const loadDriveSheets = async () => {
    if (!accessToken) return;
    setIsLoadingDrive(true);
    try {
      const files = await listDriveSpreadsheets(accessToken);
      setDriveSheets(files);
    } catch (err) {
      console.warn('Failed to list Drive files:', err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleSelectDriveSpreadsheet = async (sheetFile: DriveSpreadsheetFile) => {
    if (!accessToken) return;

    setIsProcessingSheet(true);
    setUploadFeedback(`Importing email leads from "${sheetFile.name}"...`);

    try {
      const { clients: imported, spreadsheetName } = await fetchSpreadsheetClients(
        accessToken,
        sheetFile.id
      );

      processParsedRecords(imported, `Successfully imported ${imported.length} lead(s) from "${spreadsheetName}"!`);
      onConnectSheet({ id: sheetFile.id, name: spreadsheetName });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import from Google Sheet';
      setUploadFeedback(`Error: ${msg}`);
    } finally {
      setIsProcessingSheet(false);
    }
  };

  const handleManualSyncToConnectedSheet = async () => {
    if (!connectedSheet || !accessToken) return;

    const confirmed = window.confirm(
      `Update Google Sheet "${connectedSheet.name}" with current ${clients.length} client records, status, and campaign activity?`
    );
    if (!confirmed) return;

    setIsSyncingToSheet(true);
    setSyncFeedback(null);

    try {
      await syncAllClientsToGoogleSheet(accessToken, connectedSheet.id, clients);
      setSyncFeedback(`Successfully synced ${clients.length} contacts to Google Sheet!`);
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setSyncFeedback(`Sync failed: ${msg}`);
    } finally {
      setIsSyncingToSheet(false);
    }
  };

  // Comprehensive Filtering & Searching
  const filteredClients = clients
    .filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.company && c.company.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.preferredLocation && c.preferredLocation.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q)) ||
          (c.budgetFormatted && c.budgetFormatted.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (typeFilter !== 'all' && c.preferredType !== 'all' && c.preferredType !== typeFilter) {
        return false;
      }

      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }

      if (emailStatusFilter === 'emailed' && (c.totalEmailsSent || 0) === 0) return false;
      if (emailStatusFilter === 'not-emailed' && (c.totalEmailsSent || 0) > 0) return false;

      if (budgetFilter !== 'all' && c.budgetFormatted) {
        const b = c.budgetFormatted.toLowerCase();
        if (budgetFilter === 'under5m') {
          if (b.includes('15') || b.includes('20') || b.includes('25') || b.includes('30') || b.includes('40') || b.includes('45')) return false;
        }
        if (budgetFilter === '5m-15m') {
          if (!b.includes('5') && !b.includes('6') && !b.includes('8') && !b.includes('10') && !b.includes('12')) return false;
        }
        if (budgetFilter === '15m-plus') {
          if (!b.includes('15') && !b.includes('20') && !b.includes('22') && !b.includes('25') && !b.includes('30') && !b.includes('40') && !b.includes('45')) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'most-emailed') return (b.totalEmailsSent || 0) - (a.totalEmailsSent || 0);
      if (sortBy === 'status-vip') return (b.status === 'vip' ? 1 : 0) - (a.status === 'vip' ? 1 : 0);
      return a.name.localeCompare(b.name);
    });

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    budgetFilter !== 'all' ||
    emailStatusFilter !== 'all' ||
    sortBy !== 'name-asc';

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setBudgetFilter('all');
    setEmailStatusFilter('all');
    setSortBy('name-asc');
  };

  const handleToggleSelectClient = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedBatchIds.length === filteredClients.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(filteredClients.map((c) => c.id));
    }
  };

  // Sheet file upload (.xlsx, .xls, .csv, .tsv)
  const handleSheetFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingSheet(true);
    setUploadFeedback(`Reading spreadsheet "${file.name}"...`);

    try {
      const parsed = await parseSpreadsheetFile(file);
      processParsedRecords(parsed, `Imported ${parsed.length} client(s) from "${file.name}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to read spreadsheet file';
      setUploadFeedback(`Error: ${msg}`);
    } finally {
      setIsProcessingSheet(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Google Sheets link import
  const handleImportGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) return;

    setIsProcessingSheet(true);
    setUploadFeedback('Fetching data from Google Sheets...');

    try {
      const parsed = await importFromGoogleSheetUrl(googleSheetUrl);
      processParsedRecords(parsed, `Successfully imported ${parsed.length} client(s) from Google Sheet!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not access Google Sheet';
      setUploadFeedback(`Import Notice: ${msg}`);
    } finally {
      setIsProcessingSheet(false);
    }
  };

  // Pasted data import (from Google Sheets or Excel clipboard)
  const handleImportPastedData = () => {
    if (!pastedText.trim()) return;

    setIsProcessingSheet(true);
    try {
      const parsed = parsePastedSpreadsheetText(pastedText);
      processParsedRecords(parsed, `Successfully parsed and imported ${parsed.length} client(s)!`);
    } catch {
      setUploadFeedback('Could not parse pasted data. Please ensure it contains email addresses.');
    } finally {
      setIsProcessingSheet(false);
    }
  };

  const processParsedRecords = (parsed: Partial<ClientContact>[], successMsg: string) => {
    if (parsed.length === 0) {
      setUploadFeedback('No valid rows with email addresses found.');
      return;
    }

    const newBatch: ClientContact[] = parsed.map((item, idx) => ({
      id: `client_${Date.now()}_${idx}`,
      name: item.name || 'Valued Investor',
      email: item.email || '',
      phone: item.phone,
      company: item.company,
      budgetFormatted: item.budgetFormatted || '$1,000,000+',
      preferredType: item.preferredType || 'all',
      preferredLocation: item.preferredLocation,
      notes: item.notes || 'Imported via Spreadsheet',
      status: item.status || 'active',
      totalEmailsSent: item.totalEmailsSent || 0,
    }));

    onAddBatchClients(newBatch);
    setUploadFeedback(successMsg);
    setTimeout(() => {
      setIsUploadModalOpen(false);
      setUploadFeedback(null);
      setPastedText('');
      setGoogleSheetUrl('');
    }, 1200);
  };

  const handleDownloadSample = () => {
    const csvContent = generateSampleCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_investor_clients.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    exportClientsToExcel(clients, `Vanguard_RealEstate_Clients_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleCreateSingleClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.email) return;

    onAddClient({
      id: `client_${Date.now()}`,
      name: newClient.name,
      email: newClient.email,
      phone: newClient.phone,
      company: newClient.company,
      budgetFormatted: newClient.budgetFormatted || '$1,000,000+',
      preferredType: newClient.preferredType || 'all',
      preferredLocation: newClient.preferredLocation,
      notes: newClient.notes || '',
      status: newClient.status || 'active',
      totalEmailsSent: 0,
    });

    setIsAddModalOpen(false);
    setNewClient({
      name: '',
      email: '',
      phone: '',
      company: '',
      budgetFormatted: '$1.5M - $3.0M',
      preferredType: 'all',
      preferredLocation: '',
      notes: '',
      status: 'active',
    });
  };

  return (
    <div className="space-y-6">
      {/* Connected Google Sheet Status Ribbon */}
      {connectedSheet && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950 font-display">
                  Connected Google Drive Sheet:
                </span>
                <span className="font-semibold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {connectedSheet.name}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Campaign dispatches automatically sync back to this Google Sheet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <a
              href={`https://docs.google.com/spreadsheets/d/${connectedSheet.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-800 bg-white border border-emerald-300 rounded-md hover:bg-emerald-100/50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open in Sheets</span>
            </a>

            <button
              onClick={handleManualSyncToConnectedSheet}
              disabled={isSyncingToSheet}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingToSheet ? 'animate-spin' : ''}`} />
              <span>{isSyncingToSheet ? 'Syncing...' : 'Sync All to Sheet'}</span>
            </button>

            <button
              onClick={() => onConnectSheet(null)}
              className="text-[11px] text-slate-400 hover:text-slate-600 px-1.5 py-1"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {syncFeedback && (
        <div className="p-2.5 bg-slate-900 text-white text-xs rounded-lg flex items-center justify-between">
          <span>{syncFeedback}</span>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Banner & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display">
            Client &amp; Investor Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Connect to Google Drive sheets, upload Excel (.xlsx) workbooks, and sync your email database in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Batch Pitch Button */}
          {selectedBatchIds.length > 0 && (
            <button
              onClick={() => {
                const target = clients.find((c) => c.id === selectedBatchIds[0]);
                if (target) onSelectClientForEmail(target);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pitch Selected ({selectedBatchIds.length})</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            title="Export all contacts to Excel (.xlsx)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Excel</span>
          </button>

          {/* Connect Drive & Upload Sheets Button */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span>Google Drive Sheets &amp; Excel</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Single Lead</span>
          </button>
        </div>
      </div>

      {/* Advanced Search and Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by client name, email, company, budget, notes, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Segmented Preference Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Clients ({clients.length})
            </button>
            <button
              onClick={() => setTypeFilter('off-plan')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'off-plan'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Off-Plan Focus
            </button>
            <button
              onClick={() => setTypeFilter('secondary')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'secondary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Secondary Resale
            </button>
          </div>
        </div>

        {/* Detailed Secondary Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Tier:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs focus:outline-none"
              >
                <option value="all">All Tiers</option>
                <option value="vip">VIP Investors</option>
                <option value="active">Active Buyers</option>
                <option value="lead">New Leads</option>
                <option value="contacted">Contacted</option>
              </select>
            </div>

            {/* Email Dispatch Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Activity:</span>
              <select
                value={emailStatusFilter}
                onChange={(e) => setEmailStatusFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs focus:outline-none"
              >
                <option value="all">All Outreach</option>
                <option value="emailed">Already Pitched (&gt;0)</option>
                <option value="not-emailed">Never Pitched (0 Sent)</option>
              </select>
            </div>

            {/* Budget Filter (AED) */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Budget:</span>
              <select
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs focus:outline-none"
              >
                <option value="all">All Budgets</option>
                <option value="under5m">Under AED 5M</option>
                <option value="5m-15m">AED 5M - 15M</option>
                <option value="15m-plus">AED 15M+</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs focus:outline-none"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="status-vip">VIP First</option>
                <option value="most-emailed">Most Campaigns</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}

            <span className="text-slate-400 text-[11px] font-mono tabular-nums">
              Showing {filteredClients.length} of {clients.length} leads
            </span>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <button
                    onClick={handleSelectAllFiltered}
                    className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                    title={selectedBatchIds.length === filteredClients.length ? 'Deselect all' : 'Select all matching'}
                  >
                    {selectedBatchIds.length > 0 && selectedBatchIds.length === filteredClients.length ? (
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Client Name &amp; Tier</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Preference &amp; Budget</th>
                <th className="py-3 px-4">Investment Strategy</th>
                <th className="py-3 px-4 text-center">Campaigns</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400 space-y-2">
                    <Mail className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                    <p className="font-semibold text-slate-700">No leads match your filter criteria</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Adjust your search or connect to a Google Sheet from Google Drive.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-2 px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedClientId === client.id;
                  const isBatchChecked = selectedBatchIds.includes(client.id);

                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected || isBatchChecked ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleSelectClient(client.id)}
                          className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
                        >
                          {isBatchChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{client.name}</span>
                          {client.status === 'vip' && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                              VIP
                            </span>
                          )}
                        </div>
                        {client.company && (
                          <div className="text-[11px] text-slate-500">{client.company}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-700">{client.email}</span>
                        {client.phone && (
                          <div className="text-[11px] text-slate-400">{client.phone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="font-medium text-slate-900">
                            {client.preferredType === 'off-plan'
                              ? 'Off-Plan'
                              : client.preferredType === 'secondary'
                              ? 'Secondary Resale'
                              : 'All Categories'}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="font-mono tabular-nums text-slate-600">
                            {client.budgetFormatted || 'Flexible'}
                          </span>
                        </div>
                        {client.preferredLocation && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {client.preferredLocation}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-600 line-clamp-1 max-w-[260px]">
                          {client.notes || 'Standard high-net-worth investor profile'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums">
                        {client.totalEmailsSent > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            {client.totalEmailsSent} sent
                          </span>
                        ) : (
                          <span className="text-slate-400">0 sent</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectClientForEmail(client)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Pitch</span>
                          </button>
                          <button
                            onClick={() => onDeleteClient(client.id)}
                            title="Delete lead"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sheets & Google Drive Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-amber-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    Connect Google Drive Sheets &amp; Spreadsheets
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Browse your Google Drive sheets or upload Excel workbooks to manage leads
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-4 text-xs font-medium text-slate-600">
              <button
                onClick={() => setUploadTab('drive')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  uploadTab === 'drive'
                    ? 'border-amber-600 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Google Drive Sheets</span>
              </button>
              <button
                onClick={() => setUploadTab('file')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  uploadTab === 'file'
                    ? 'border-amber-600 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel (.xlsx) / CSV</span>
              </button>
              <button
                onClick={() => setUploadTab('google-sheet')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                  uploadTab === 'google-sheet'
                    ? 'border-amber-600 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Sheets URL Link
              </button>
              <button
                onClick={() => setUploadTab('paste')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                  uploadTab === 'paste'
                    ? 'border-amber-600 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Paste Cells
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {uploadFeedback && (
                <div
                  className={`p-3 text-xs rounded-lg flex items-center gap-2 ${
                    isProcessingSheet
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : uploadFeedback.includes('Success') || uploadFeedback.includes('Imported')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {isProcessingSheet ? (
                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : uploadFeedback.includes('Success') || uploadFeedback.includes('Imported') ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{uploadFeedback}</span>
                </div>
              )}

              {/* Tab 0: Browse Google Drive Sheets */}
              {uploadTab === 'drive' && (
                <div className="space-y-3">
                  {!accessToken ? (
                    <div className="text-center py-8 space-y-3 border border-slate-200 rounded-xl bg-slate-50/50 p-6">
                      <HardDrive className="w-10 h-10 mx-auto text-amber-600 opacity-60" />
                      <h4 className="font-semibold text-slate-900 text-sm font-display">
                        Connect Google Account to Access Google Drive
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Allow the app to browse your Google Drive spreadsheets to select and sync your email list database.
                      </p>
                      <button
                        onClick={onSignInRequired}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <HardDrive className="w-4 h-4" />
                        <span>Connect Google Drive &amp; Sheets</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-semibold text-slate-700">
                          Select a Spreadsheet from your Google Drive:
                        </span>
                        <button
                          onClick={loadDriveSheets}
                          disabled={isLoadingDrive}
                          className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                          <span>Refresh Drive</span>
                        </button>
                      </div>

                      {isLoadingDrive ? (
                        <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                          <span>Scanning your Google Drive spreadsheets...</span>
                        </div>
                      ) : driveSheets.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 space-y-1 bg-slate-50 rounded-lg p-4">
                          <FolderOpen className="w-6 h-6 mx-auto opacity-30" />
                          <p className="font-medium text-slate-700">No Google Sheets found in your Drive</p>
                          <p className="text-[11px]">
                            You can upload an Excel file or paste a Google Sheets URL in the other tabs.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {driveSheets.map((file) => (
                            <div
                              key={file.id}
                              onClick={() => handleSelectDriveSpreadsheet(file)}
                              className="p-3 border border-slate-200 rounded-lg hover:border-amber-400 hover:bg-amber-50/40 transition-colors flex items-center justify-between cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div className="overflow-hidden">
                                  <div className="font-semibold text-xs text-slate-900 group-hover:text-amber-900 truncate">
                                    {file.name}
                                  </div>
                                  {file.modifiedTime && (
                                    <div className="text-[10px] text-slate-400">
                                      Modified: {new Date(file.modifiedTime).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                                Connect &amp; Import
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 1: File Upload (.xlsx, .xls, .csv, .tsv) */}
              {uploadTab === 'file' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-500 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.tsv"
                      onChange={handleSheetFileUpload}
                      className="hidden"
                    />
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-amber-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-800">
                      Click to choose Excel (.xlsx, .xls) or CSV spreadsheet
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Auto-detects Name, Email Address, Phone, Budget, and Property Preference
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadSample}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 underline cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Sample CSV Template</span>
                    </button>
                    <span>Supports all Excel workbooks</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Google Sheets URL */}
              {uploadTab === 'google-sheet' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Paste Public / Shared Google Sheets URL:
                    </label>
                    <div className="relative">
                      <Link className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="url"
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0X.../edit?usp=sharing"
                        value={googleSheetUrl}
                        onChange={(e) => setGoogleSheetUrl(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Make sure your Google Sheet sharing setting is set to <strong>&quot;Anyone with the link can view&quot;</strong>.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!googleSheetUrl.trim() || isProcessingSheet}
                      onClick={handleImportGoogleSheet}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Fetch &amp; Import from Google Sheets</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Paste Sheet Cells */}
              {uploadTab === 'paste' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Paste cells copied from Google Sheets / Excel:
                    </label>
                    <textarea
                      rows={6}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={`Name\tEmail\tBudget\tPreference\nArthur Pendelton\tarthur@familyoffice.co.uk\t$3M - $5M\tsecondary\nElena Rostova\telena@swisswealth.ch\t$1M - $2M\toff-plan`}
                      className="w-full p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Tip: Select rows in Google Sheets, copy (Ctrl+C / Cmd+C), and paste directly here.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!pastedText.trim() || isProcessingSheet}
                      onClick={handleImportPastedData}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Parse &amp; Import Rows
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFeedback(null);
                }}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Add New Client Lead
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSingleClient} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Client Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Elena Rostova"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. elena@investmentgroup.com"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+971 50 123 4567"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Budget (AED)</label>
                  <input
                    type="text"
                    placeholder="AED 5.0M - AED 15.0M"
                    value={newClient.budgetFormatted}
                    onChange={(e) => setNewClient({ ...newClient, budgetFormatted: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Property Preference</label>
                <select
                  value={newClient.preferredType}
                  onChange={(e) => setNewClient({ ...newClient, preferredType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="all">All Opportunities (Off-Plan &amp; Secondary)</option>
                  <option value="off-plan">Off-Plan Pre-Construction Only</option>
                  <option value="secondary">Secondary Market Turnkey Resale Only</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Investment Strategy Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Seeks high capital growth waterfront villas or turnkey ready penthouses"
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
