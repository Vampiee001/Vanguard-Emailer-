import { ClientContact } from '../types';

export const INITIAL_CLIENTS: ClientContact[] = [
  {
    id: 'client_1',
    name: 'Mark Stephen Yucada',
    email: 'markstephenyucada@gmail.com',
    phone: '+971 58 553 8382',
    company: 'Yucada Capital & Advisory',
    budgetMin: 5000000,
    budgetMax: 25000000,
    budgetFormatted: 'AED 5.0M - AED 25.0M',
    preferredType: 'all',
    preferredLocation: 'Palm Jumeirah, Downtown Dubai & DIFC',
    notes: 'Interested in high-appreciation Dubai off-plan launches with 60/40 milestone payment plans and turnkey luxury secondary market penthouses with 10-Year Golden Visa eligibility.',
    status: 'vip',
    totalEmailsSent: 0
  },
  {
    id: 'client_2',
    name: 'Arthur Pendelton',
    email: 'a.pendelton.invest@example.com',
    phone: '+44 20 7946 0912',
    company: 'Pendelton Family Office',
    budgetMin: 15000000,
    budgetMax: 45000000,
    budgetFormatted: 'AED 15.0M - AED 45.0M',
    preferredType: 'secondary',
    preferredLocation: 'Emirates Hills & Palm Jumeirah Trophy Villas',
    notes: 'Prefers turnkey secondary market luxury residences with immediate Dubai Land Department (DLD) title deed transfer and proven in-place yields.',
    status: 'active',
    totalEmailsSent: 0
  },
  {
    id: 'client_3',
    name: 'Elena Rostova',
    email: 'elena.rostova@globalwealth.ch',
    phone: '+41 22 819 4400',
    company: 'Geneva Asset Partners',
    budgetMin: 3000000,
    budgetMax: 10000000,
    budgetFormatted: 'AED 3.0M - AED 10.0M',
    preferredType: 'off-plan',
    preferredLocation: 'Dubai Creek Harbour & Dubai Canal Waterfront',
    notes: 'Focused on off-plan waterfront developments with flexible 70/30 or 60/40 developer payment plans and double-digit projected ROI.',
    status: 'vip',
    totalEmailsSent: 0
  },
  {
    id: 'client_4',
    name: 'Marcus & Sophia Vance',
    email: 'vance.acquisitions@primeinvest.net',
    phone: '+971 50 441 9821',
    company: 'Vance Hospitality & Living',
    budgetMin: 8000000,
    budgetMax: 22000000,
    budgetFormatted: 'AED 8.0M - AED 22.0M',
    preferredType: 'all',
    preferredLocation: 'Palm Jumeirah & Jumeirah Bay Island',
    notes: 'Seeking waterfront villas and branded residences for seasonal rental and family holiday home usage in Dubai.',
    status: 'lead',
    totalEmailsSent: 0
  }
];

export function parseCsvClients(csvText: string): Partial<ClientContact>[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    if (lines.length === 1 && lines[0].includes('@')) {
      const email = lines[0].trim().replace(/['"]/g, '');
      return [{
        name: email.split('@')[0].replace(/[._]/g, ' '),
        email,
        preferredType: 'all',
        status: 'active'
      }];
    }
    return [];
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map(h => h.trim().replace(/['"]/g, ''));
  
  const nameIdx = headers.findIndex(h => h.includes('name'));
  const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
  const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('tel'));
  const budgetIdx = headers.findIndex(h => h.includes('budget') || h.includes('price'));
  const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('category') || h.includes('pref'));
  const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('interest') || h.includes('comment'));

  const parsed: Partial<ClientContact>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;

    const cols: string[] = [];
    let insideQuote = false;
    let currentCol = '';

    for (let charIdx = 0; charIdx < row.length; charIdx++) {
      const char = row[charIdx];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        cols.push(currentCol.trim().replace(/^["']|["']$/g, ''));
        currentCol = '';
      } else {
        currentCol += char;
      }
    }
    cols.push(currentCol.trim().replace(/^["']|["']$/g, ''));

    const rawEmail = (emailIdx !== -1 && cols[emailIdx]) ? cols[emailIdx] : cols.find(c => c.includes('@'));
    if (!rawEmail || !rawEmail.includes('@')) continue;

    const email = rawEmail.trim();
    const rawName = (nameIdx !== -1 && cols[nameIdx]) ? cols[nameIdx] : '';
    const name = rawName || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const phone = (phoneIdx !== -1 && cols[phoneIdx]) ? cols[phoneIdx] : undefined;
    const budgetFormatted = (budgetIdx !== -1 && cols[budgetIdx]) ? cols[budgetIdx] : 'AED 3,000,000+';
    
    let preferredType: 'all' | 'off-plan' | 'secondary' = 'all';
    if (typeIdx !== -1 && cols[typeIdx]) {
      const t = cols[typeIdx].toLowerCase();
      if (t.includes('off') || t.includes('plan') || t.includes('under') || t.includes('pre')) {
        preferredType = 'off-plan';
      } else if (t.includes('sec') || t.includes('resale') || t.includes('ready')) {
        preferredType = 'secondary';
      }
    }

    const notes = (notesIdx !== -1 && cols[notesIdx]) ? cols[notesIdx] : undefined;

    parsed.push({
      name,
      email,
      phone,
      budgetFormatted,
      preferredType,
      notes,
      status: 'active'
    });
  }

  return parsed;
}

export function generateSampleCsv(): string {
  return `Full Name,Email Address,Phone,Budget Range (AED),Preferred Property Type,Investment Notes
David Sterling,d.sterling@sterlingholdings.com,+971 50 555 0192,"AED 6.0M - AED 12.0M",off-plan,"Interested in luxury waterfront off-plan developments with 60/40 payment plans"
Claire Beaumont,c.beaumont@chateauparis.fr,+33 1 42 68 55 00,"AED 12.0M - AED 25.0M",secondary,"Looking for prime turnkey secondary market penthouses in Downtown Dubai"
Tariq Mansoor,tariq@gulfcapitalinvest.ae,+971 58 553 8382,"AED 5.0M - AED 18.0M",all,"Seeks high ROI portfolio additions across both off-plan launches and secondary market resales"
Julian & Marie Becker,becker.family@munich-wealth.de,+49 89 2030 4050,"AED 8.0M - AED 20.0M",off-plan,"Focus on Palm Jumeirah beachfront villas and Emaar master-planned communities"`;
}
