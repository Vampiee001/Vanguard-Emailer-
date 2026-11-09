import * as XLSX from 'xlsx';
import { ClientContact } from '../types';

/**
 * Parses any spreadsheet file (.xlsx, .xls, .csv, .tsv) into structured ClientContact records.
 */
export async function parseSpreadsheetFile(file: File): Promise<Partial<ClientContact>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  return mapRawRowsToClients(rows);
}

/**
 * Parses tab-delimited or comma-delimited clipboard text copied directly from Google Sheets or Excel.
 */
export function parsePastedSpreadsheetText(text: string): Partial<ClientContact>[] {
  if (!text.trim()) return [];

  const workbook = XLSX.read(text, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  return mapRawRowsToClients(rows);
}

/**
 * Imports from a Google Sheets URL.
 * Automatically converts shareable view/edit links to the CSV export endpoint.
 */
export async function importFromGoogleSheetUrl(url: string): Promise<Partial<ClientContact>[]> {
  const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch || !sheetIdMatch[1]) {
    throw new Error('Invalid Google Sheets URL. Please make sure it is a valid Google Sheets link.');
  }

  const sheetId = sheetIdMatch[1];
  // Support specific gid if present
  const gidMatch = url.match(/gid=([0-9]+)/);
  const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;

  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error('Could not access Google Sheet. Please verify that the sheet sharing settings are set to "Anyone with the link can view".');
  }

  const csvText = await response.text();
  return parsePastedSpreadsheetText(csvText);
}

/**
 * Maps arbitrary spreadsheet row objects to client fields using flexible header matching.
 */
function mapRawRowsToClients(rows: Record<string, any>[]): Partial<ClientContact>[] {
  const clients: Partial<ClientContact>[] = [];

  for (const row of rows) {
    const keys = Object.keys(row);
    if (keys.length === 0) continue;

    let name = '';
    let email = '';
    let phone = '';
    let company = '';
    let budgetFormatted = '';
    let preferredType: 'all' | 'off-plan' | 'secondary' = 'all';
    let preferredLocation = '';
    let notes = '';
    let status: 'active' | 'vip' | 'lead' | 'contacted' = 'active';

    for (const key of keys) {
      const val = String(row[key] ?? '').trim();
      const k = key.toLowerCase();

      // Email field detection
      if (k.includes('email') || k.includes('mail') || k === 'to') {
        if (val.includes('@')) email = val;
      } else if (!email && val.includes('@')) {
        email = val;
      }

      // Name field detection
      if (k.includes('name') || k.includes('client') || k.includes('lead') || k.includes('investor') || k.includes('contact')) {
        name = val;
      }

      // Phone
      if (k.includes('phone') || k.includes('mobile') || k.includes('tel') || k.includes('cell')) {
        phone = val;
      }

      // Company / Family Office
      if (k.includes('company') || k.includes('firm') || k.includes('office') || k.includes('agency')) {
        company = val;
      }

      // Budget
      if (k.includes('budget') || k.includes('price') || k.includes('capital') || k.includes('fund')) {
        budgetFormatted = val;
      }

      // Preferred type (off-plan vs secondary)
      if (k.includes('type') || k.includes('category') || k.includes('preference') || k.includes('interest')) {
        const vLower = val.toLowerCase();
        if (vLower.includes('off') || vLower.includes('plan') || vLower.includes('pre') || vLower.includes('under')) {
          preferredType = 'off-plan';
        } else if (vLower.includes('sec') || vLower.includes('resale') || vLower.includes('ready')) {
          preferredType = 'secondary';
        }
      }

      // Location
      if (k.includes('location') || k.includes('city') || k.includes('region') || k.includes('area')) {
        preferredLocation = val;
      }

      // Notes / comments
      if (k.includes('note') || k.includes('comment') || k.includes('strategy') || k.includes('req') || k.includes('memo')) {
        notes = val;
      }

      // Tier / Status
      if (k.includes('tier') || k.includes('status')) {
        const vLower = val.toLowerCase();
        if (vLower.includes('vip')) status = 'vip';
        else if (vLower.includes('lead')) status = 'lead';
        else if (vLower.includes('contact')) status = 'contacted';
      }
    }

    if (!email || !email.includes('@')) continue;

    if (!name) {
      name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    clients.push({
      name,
      email,
      phone: phone || undefined,
      company: company || undefined,
      budgetFormatted: budgetFormatted || '$1,000,000+',
      preferredType,
      preferredLocation: preferredLocation || undefined,
      notes: notes || undefined,
      status,
    });
  }

  return clients;
}

/**
 * Exports client contacts into an Excel workbook (.xlsx)
 */
export function exportClientsToExcel(clients: ClientContact[], filename = 'Vanguard_Clients_Sheet.xlsx') {
  const exportData = clients.map((c) => ({
    'Full Name': c.name,
    'Email Address': c.email,
    'Phone Number': c.phone || '',
    'Company / Family Office': c.company || '',
    'Budget Range': c.budgetFormatted || '',
    'Property Preference': c.preferredType === 'off-plan' ? 'Off-Plan' : c.preferredType === 'secondary' ? 'Secondary Resale' : 'All',
    'Preferred Location': c.preferredLocation || '',
    'Investor Notes': c.notes || '',
    'Status Tier': c.status.toUpperCase(),
    'Total Campaigns Sent': c.totalEmailsSent || 0,
    'Last Emailed Date': c.lastEmailedAt ? new Date(c.lastEmailedAt).toLocaleDateString() : 'Never',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
  XLSX.writeFile(workbook, filename);
}
