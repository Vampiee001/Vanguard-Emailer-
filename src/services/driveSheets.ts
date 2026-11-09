import { ClientContact } from '../types';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Lists the user's Google Sheets spreadsheets from Google Drive.
 */
export async function listDriveSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=30`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Google Drive API error (${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Reads all rows from a Google Sheet and converts them to ClientContact objects.
 */
export async function fetchSpreadsheetClients(
  accessToken: string,
  spreadsheetId: string
): Promise<{ clients: Partial<ClientContact>[]; sheetTitle: string; spreadsheetName: string }> {
  // 1. Get spreadsheet metadata to find first sheet name dynamically (best practice)
  const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaResponse.ok) {
    const errorBody = await metaResponse.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch spreadsheet metadata (${metaResponse.status})`);
  }

  const metadata = await metaResponse.json();
  const spreadsheetName = metadata.properties?.title || 'Google Sheet';
  const firstSheet = metadata.sheets?.[0];
  const sheetTitle = firstSheet?.properties?.title || 'Sheet1';

  // 2. Read values from the first sheet
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:Z500`;
  const valuesResponse = await fetch(valuesUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!valuesResponse.ok) {
    const errorBody = await valuesResponse.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to read sheet data (${valuesResponse.status})`);
  }

  const valuesData = await valuesResponse.json();
  const rawRows: string[][] = valuesData.values || [];
  if (rawRows.length < 2) {
    return { clients: [], sheetTitle, spreadsheetName };
  }

  const headers = rawRows[0].map((h) => String(h || '').trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('client') || h.includes('lead'));
  const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
  const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('tel'));
  const companyIdx = headers.findIndex((h) => h.includes('company') || h.includes('firm') || h.includes('office'));
  const budgetIdx = headers.findIndex((h) => h.includes('budget') || h.includes('price') || h.includes('capital'));
  const typeIdx = headers.findIndex((h) => h.includes('type') || h.includes('preference') || h.includes('category'));
  const locationIdx = headers.findIndex((h) => h.includes('location') || h.includes('city') || h.includes('area'));
  const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('comment') || h.includes('strategy'));
  const statusIdx = headers.findIndex((h) => h.includes('tier') || h.includes('status'));
  const sentIdx = headers.findIndex((h) => h.includes('sent') || h.includes('campaign'));

  const clients: Partial<ClientContact>[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const email = (emailIdx !== -1 && row[emailIdx]) ? row[emailIdx].trim() : row.find((c) => String(c).includes('@'))?.trim();
    if (!email || !email.includes('@')) continue;

    const name = (nameIdx !== -1 && row[nameIdx])
      ? row[nameIdx].trim()
      : email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    const phone = (phoneIdx !== -1 && row[phoneIdx]) ? row[phoneIdx].trim() : undefined;
    const company = (companyIdx !== -1 && row[companyIdx]) ? row[companyIdx].trim() : undefined;
    const budgetFormatted = (budgetIdx !== -1 && row[budgetIdx]) ? row[budgetIdx].trim() : '$1,000,000+';

    let preferredType: 'all' | 'off-plan' | 'secondary' = 'all';
    if (typeIdx !== -1 && row[typeIdx]) {
      const t = row[typeIdx].toLowerCase();
      if (t.includes('off') || t.includes('plan') || t.includes('pre')) preferredType = 'off-plan';
      else if (t.includes('sec') || t.includes('resale') || t.includes('ready')) preferredType = 'secondary';
    }

    const preferredLocation = (locationIdx !== -1 && row[locationIdx]) ? row[locationIdx].trim() : undefined;
    const notes = (notesIdx !== -1 && row[notesIdx]) ? row[notesIdx].trim() : undefined;

    let status: 'active' | 'vip' | 'lead' | 'contacted' = 'active';
    if (statusIdx !== -1 && row[statusIdx]) {
      const s = row[statusIdx].toLowerCase();
      if (s.includes('vip')) status = 'vip';
      else if (s.includes('lead')) status = 'lead';
      else if (s.includes('contact')) status = 'contacted';
    }

    const totalEmailsSent = (sentIdx !== -1 && row[sentIdx]) ? parseInt(row[sentIdx], 10) || 0 : 0;

    clients.push({
      name,
      email,
      phone,
      company,
      budgetFormatted,
      preferredType,
      preferredLocation,
      notes,
      status,
      totalEmailsSent,
    });
  }

  return { clients, sheetTitle, spreadsheetName };
}

/**
 * Updates a specific client's sent count and timestamp in the connected Google Sheet.
 */
export async function updateClientInGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  clientEmail: string,
  totalSent: number,
  lastEmailedAt: string
): Promise<boolean> {
  try {
    // 1. Find sheet name and read email column
    const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaResponse.ok) return false;
    const metadata = await metaResponse.json();
    const sheetTitle = metadata.sheets?.[0]?.properties?.title || 'Sheet1';

    const valuesResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:Z500`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!valuesResponse.ok) return false;
    const valuesData = await valuesResponse.json();
    const rows: string[][] = valuesData.values || [];
    if (rows.length < 2) return false;

    const headers = rows[0].map((h) => String(h || '').trim().toLowerCase());
    const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
    let sentIdx = headers.findIndex((h) => h.includes('sent') || h.includes('campaign'));
    let dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('emailed') || h.includes('last'));

    // Find row index
    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const rowEmail = (emailIdx !== -1 ? rows[i][emailIdx] : rows[i].find((c) => String(c).includes('@')) || '').trim();
      if (rowEmail.toLowerCase() === clientEmail.toLowerCase()) {
        targetRowIndex = i + 1; // 1-indexed for Sheets
        break;
      }
    }

    if (targetRowIndex === -1) return false;

    // Convert column number to letter
    const colToLetter = (idx: number) => String.fromCharCode(65 + idx);

    // If sent or date columns exist, update them
    if (sentIdx !== -1) {
      const cellRange = `${sheetTitle}!${colToLetter(sentIdx)}${targetRowIndex}`;
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(cellRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [[totalSent]] }),
        }
      );
    }

    if (dateIdx !== -1) {
      const cellRange = `${sheetTitle}!${colToLetter(dateIdx)}${targetRowIndex}`;
      const formattedDate = new Date(lastEmailedAt).toLocaleDateString();
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(cellRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [[formattedDate]] }),
        }
      );
    }

    return true;
  } catch (err) {
    console.warn('Could not update row in Google Sheet:', err);
    return false;
  }
}

/**
 * Syncs the entire clients directory back to a Google Sheet.
 */
export async function syncAllClientsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  clients: ClientContact[]
): Promise<void> {
  const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaResponse.ok) {
    throw new Error('Failed to access Google Sheet for sync.');
  }
  const metadata = await metaResponse.json();
  const sheetTitle = metadata.sheets?.[0]?.properties?.title || 'Sheet1';

  const headers = [
    'Full Name',
    'Email Address',
    'Phone Number',
    'Company / Family Office',
    'Budget Range',
    'Property Preference',
    'Preferred Location',
    'Investor Notes',
    'Status Tier',
    'Campaigns Sent',
    'Last Emailed Date',
  ];

  const rows = clients.map((c) => [
    c.name,
    c.email,
    c.phone || '',
    c.company || '',
    c.budgetFormatted || '',
    c.preferredType === 'off-plan' ? 'Off-Plan' : c.preferredType === 'secondary' ? 'Secondary Resale' : 'All Real Estate',
    c.preferredLocation || '',
    c.notes || '',
    c.status.toUpperCase(),
    c.totalEmailsSent || 0,
    c.lastEmailedAt ? new Date(c.lastEmailedAt).toLocaleDateString() : 'Never',
  ]);

  const allValues = [headers, ...rows];

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:K${allValues.length}?valueInputOption=USER_ENTERED`;
  const updateRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: allValues }),
  });

  if (!updateRes.ok) {
    const errorBody = await updateRes.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || 'Failed to update Google Sheet.');
  }
}
