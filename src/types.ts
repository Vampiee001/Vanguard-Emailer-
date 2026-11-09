export type ProjectType = 'off-plan' | 'secondary';

export interface RealEstateProject {
  id: string;
  title: string;
  type: ProjectType;
  category: 'tower' | 'villa' | 'penthouse' | 'townhouse' | 'waterfront' | 'residence';
  developer?: string;
  location: string;
  city: string;
  price: number;
  priceFormatted: string;
  currency: string;
  beds: string;
  baths: number;
  areaSqFt: number;
  handoverOrStatus: string; // e.g. "Q4 2028 Handover" or "Ready / Vacant on Transfer"
  paymentPlan?: string;    // e.g. "10% Down · 50% During Construction · 40% on Completion"
  projectedRoi?: string;   // e.g. "9.8% Estimated Net ROI"
  rentalYield?: string;    // e.g. "8.2% Current Net Yield"
  capitalGrowth?: string;  // e.g. "+35% Forecasted by Handover"
  description: string;
  highlights: string[];
  amenities: string[];
  imageUrl: string;
  brochureUrl?: string;
  isFeatured?: boolean;
}

export interface ClientContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetFormatted?: string;
  preferredType: 'all' | 'off-plan' | 'secondary';
  preferredLocation?: string;
  notes?: string;
  status: 'active' | 'vip' | 'lead' | 'contacted';
  lastEmailedAt?: string;
  totalEmailsSent: number;
}

export type EmailTone = 
  | 'luxury_vip' 
  | 'high_roi' 
  | 'urgent_launch' 
  | 'distress_deal' 
  | 'consultative';

export interface GeneratedEmailDraft {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  selectedProjects: RealEstateProject[];
  tone: EmailTone;
  subject: string;
  previewText: string;
  salutation: string;
  openingHook: string;
  projectBreakdowns: {
    projectId: string;
    projectTitle: string;
    pitch: string;
    keyPoints: string[];
  }[];
  financialSummary: string;
  callToAction: string;
  htmlContent: string;
  plainTextContent: string;
  agentName: string;
  agentBrokerage: string;
  agentPhone: string;
  agentEmail: string;
  generatedAt: string;
}

export interface SentEmailRecord {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  projectTitles: string[];
  sentAt: string;
  status: 'sent' | 'queued' | 'failed';
  method: 'gmail_api' | 'mailto' | 'simulated';
  messageId?: string;
  error?: string;
  htmlContent: string;
}
