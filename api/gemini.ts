import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ExtractPdfRequest {
  fileBase64?: string;
  extractedText?: string;
  pageImageBase64?: string;
  mimeType?: string;
  fileName?: string;
}

export async function extractPropertyFromPdf(data: ExtractPdfRequest) {
  const ai = getAiClient();
  const rawText = data.extractedText?.trim() || '';
  const imageBase64 = data.pageImageBase64 || data.fileBase64 || '';
  const cleanBase64 = imageBase64 ? imageBase64.replace(/^data:[^;]+;base64,/, '') : '';
  const mime = data.mimeType || (data.pageImageBase64 ? 'image/jpeg' : 'application/pdf');

  // Helper heuristic to pull data from text if Gemini is offline or during fallback
  const parseFromTextHeuristic = (text: string, fileName?: string) => {
    const titleMatch = text.match(/(?:Project|Residence|Tower|Villas?|Mansion|Heights|Estate|Bay|Palms|Waterfront)\s+([A-Za-z0-9\s'-]{3,30})/i);
    const priceMatch = text.match(/(?:\$|USD|AED|EUR|GBP)\s*([\d,]+(?:\.\d+)?(?:\s*(?:M|Million|K))?)/i);
    const bedsMatch = text.match(/(\d+(?:\s*-\s*\d+)?)\s*(?:beds?|bedrooms?|br)/i);
    const sqftMatch = text.match(/([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|sq\s*feet|sqm)/i);
    const developerMatch = text.match(/(?:Developer|Developed by|Builder):\s*([A-Za-z0-9\s&'-]{3,40})/i);
    const isOffPlan = /off-?plan|under\s*construction|handover|completion|milestone|payment\s*plan/i.test(text);

    const priceNum = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) * (priceMatch[0].toLowerCase().includes('m') ? 1000000 : 1) : 4500000;
    const cleanTitle = titleMatch ? titleMatch[0] : (fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Dubai Luxury Architectural Residence');

    return {
      title: cleanTitle.length > 3 ? cleanTitle : 'Dubai Prime Luxury Residence',
      type: isOffPlan ? 'off-plan' as const : 'secondary' as const,
      category: 'residence',
      developer: developerMatch ? developerMatch[1].trim() : 'Prestige Dubai Developments',
      location: 'Downtown & Dubai Water Canal',
      city: 'Dubai, UAE',
      price: isNaN(priceNum) || priceNum <= 0 ? 4500000 : priceNum,
      priceFormatted: `AED ${(isNaN(priceNum) || priceNum <= 0 ? 4500000 : priceNum).toLocaleString()}`,
      currency: 'AED',
      beds: bedsMatch ? `${bedsMatch[1]} Bedrooms` : '3 Bedrooms Luxury Suite',
      baths: 3,
      areaSqFt: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, ''), 10) : 2300,
      handoverOrStatus: isOffPlan ? 'Q4 2028 Scheduled Handover' : 'Ready / Immediate DLD Title Transfer',
      paymentPlan: isOffPlan ? '60/40 Construction Linked Payment Plan' : 'Cash or UAE Mortgage Available',
      projectedRoi: '9.4% Estimated Net Yield',
      description: text.length > 50 
        ? text.slice(0, 320).replace(/\s+/g, ' ').trim() + '...' 
        : 'An exceptional high-specification residential property offering sweeping vistas, expansive living areas, and resort-grade amenities in Dubai.',
      highlights: [
        '10-Year UAE Golden Visa qualification eligible (AED 2M+ threshold)',
        'Zero local property tax and strong capital growth trajectory',
        'High-specification private amenities, concierge, and valet parking'
      ],
      amenities: ['Infinity Pool', 'Executive Fitness Suite', 'Valet & Secure Parking', 'Private Concierge'],
      imageUrl: data.pageImageBase64 || (isOffPlan ? '/src/assets/images/project_offplan_tower_1792245021106.jpg' : '/src/assets/images/project_secondary_penthouse_1792245022082.jpg')
    };
  };

  if (!ai) {
    return parseFromTextHeuristic(rawText, data.fileName);
  }

  try {
    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

    if (cleanBase64) {
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mime,
        },
      });
    }

    let prompt = `Analyze this real estate property brochure, factsheet, floorplan, or architectural document.
Extract all key real estate property information and return as JSON conforming to the schema.
Classify whether it is 'off-plan' (pre-construction development) or 'secondary' (resale, ready home).
Extract the project title, developer/seller, location, city, price, beds, baths, area in sq ft, handover date or status, payment plan or rental yield, description, highlights, and amenities.`;

    if (rawText) {
      prompt += `\n\nExtracted Brochure Text Content:\n"""\n${rawText.slice(0, 15000)}\n"""`;
    }

    if (data.fileName) {
      prompt += `\n\nOriginal File Name: ${data.fileName}`;
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts,
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, description: 'Must be off-plan or secondary' },
            category: { type: Type.STRING },
            developer: { type: Type.STRING },
            location: { type: Type.STRING },
            city: { type: Type.STRING },
            price: { type: Type.NUMBER },
            priceFormatted: { type: Type.STRING },
            currency: { type: Type.STRING },
            beds: { type: Type.STRING },
            baths: { type: Type.NUMBER },
            areaSqFt: { type: Type.NUMBER },
            handoverOrStatus: { type: Type.STRING },
            paymentPlan: { type: Type.STRING },
            projectedRoi: { type: Type.STRING },
            rentalYield: { type: Type.STRING },
            capitalGrowth: { type: Type.STRING },
            description: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['title', 'type', 'location', 'price', 'description', 'highlights'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const isOff = !(parsed.type && parsed.type.toLowerCase().includes('sec'));
    parsed.type = isOff ? 'off-plan' : 'secondary';
    parsed.category = parsed.category || 'residence';
    parsed.price = Number(parsed.price) || 3500000;
    parsed.priceFormatted = parsed.priceFormatted || `AED ${parsed.price.toLocaleString()}`;
    parsed.currency = parsed.currency || 'AED';
    parsed.beds = parsed.beds || '3 Bedrooms';
    parsed.baths = Number(parsed.baths) || 2;
    parsed.areaSqFt = Number(parsed.areaSqFt) || 2100;
    parsed.handoverOrStatus = parsed.handoverOrStatus || (isOff ? 'Q4 2028 Handover' : 'Ready / Vacant on Transfer');
    parsed.highlights = Array.isArray(parsed.highlights) && parsed.highlights.length > 0
      ? parsed.highlights
      : ['Prime architectural design', 'Strong investment fundamentals'];
    parsed.amenities = Array.isArray(parsed.amenities) && parsed.amenities.length > 0
      ? parsed.amenities
      : ['Private Parking', 'Concierge', 'Fitness Center'];
    parsed.imageUrl = data.pageImageBase64 || (isOff
      ? '/src/assets/images/project_offplan_tower_1792245021106.jpg'
      : '/src/assets/images/project_secondary_penthouse_1792245022082.jpg');
    return parsed;
  } catch (error) {
    console.error('Error extracting PDF details with Gemini:', error);
    return parseFromTextHeuristic(rawText, data.fileName);
  }
}

export interface GenerateEmailRequest {
  client: {
    id: string;
    name: string;
    email: string;
    budgetFormatted?: string;
    preferredType?: string;
    preferredLocation?: string;
    notes?: string;
  };
  projects: Array<{
    id: string;
    title: string;
    type: 'off-plan' | 'secondary';
    developer?: string;
    location: string;
    city: string;
    priceFormatted: string;
    beds: string;
    areaSqFt: number;
    handoverOrStatus: string;
    paymentPlan?: string;
    projectedRoi?: string;
    rentalYield?: string;
    capitalGrowth?: string;
    description: string;
    highlights: string[];
    imageUrl: string;
  }>;
  tone: string;
  customInstructions?: string;
  agent?: {
    name: string;
    brokerage: string;
    phone: string;
    email: string;
  };
}

export async function generateRealEstateEmail(data: GenerateEmailRequest) {
  const ai = getAiClient();
  const agent = data.agent || {
    name: 'Mark Stephen Yucada',
    brokerage: 'Vanguard Private Estates & Advisory',
    phone: '+971 58 553 8382',
    email: 'markstephenyucada@gmail.com',
  };

  const projectSummaries = data.projects.map((p, idx) => `
Project #${idx + 1}:
- Title: ${p.title}
- Type: ${p.type === 'off-plan' ? 'Off-Plan Pre-Construction Development' : 'Secondary Market Resale (Ready)'}
- Developer: ${p.developer || 'N/A'}
- Location: ${p.location}, ${p.city}
- Price: ${p.priceFormatted}
- Layout: ${p.beds} (${p.areaSqFt} sq ft)
- Status / Handover: ${p.handoverOrStatus}
- Financials: ${p.paymentPlan ? `Payment Plan: ${p.paymentPlan}` : ''} ${p.projectedRoi ? `Projected ROI: ${p.projectedRoi}` : ''} ${p.rentalYield ? `Current Yield: ${p.rentalYield}` : ''} ${p.capitalGrowth ? `Capital Growth: ${p.capitalGrowth}` : ''}
- Description: ${p.description}
- Key Highlights: ${p.highlights.join('; ')}
`).join('\n---\n');

  const systemInstruction = `
You are the Head of Private Client Advisory at an ultra-luxury UAE & international real estate brokerage.
Your role is to write tailored, highly persuasive, and dignified investment emails to clients presenting specific properties.
All prices and financials should be presented clearly in AED (United Arab Emirates Dirham), with proper formatting (e.g., 'AED 4,950,000').
The properties may include:
- Off-Plan / Pre-Construction projects: Highlight developer prestige (e.g. Emaar, Omniyat), capital growth during construction, milestone payment plans (e.g., 60/40 or 70/30), 10-Year UAE Golden Visa qualification (AED 2M+), 0% property tax, and pre-launch pricing advantages.
- Secondary Market / Resale projects: Highlight prime location permanence (Palm Jumeirah, Downtown Dubai, DIFC, Emirates Hills), immediate rental income / cashflow, turnkey luxury furnishings, vacant-on-transfer readiness, DLD title deed certainty, and scarcity value.

Campaign Tone: ${data.tone}
Agent Details: ${agent.name}, ${agent.brokerage}, Direct / WhatsApp: ${agent.phone}, Email: ${agent.email}
Client Details: Name: ${data.client.name}, Email: ${data.client.email}, Budget: ${data.client.budgetFormatted || 'Flexible'}, Interest: ${data.client.notes || 'Curated luxury investment'}
${data.customInstructions ? `Additional Agent Notes: ${data.customInstructions}` : ''}

Generate a comprehensive response in JSON adhering strictly to the schema.
The 'htmlContent' field must be an inline-styled, modern luxury HTML email template using tables and clean typography (#0f172a text, #f8fafc card backgrounds, gold/amber accent highlights, crisp property breakdown cards, structured financial bullets, direct WhatsApp button to ${agent.phone}, and a prominent RSVP/Contact CTA button).
The 'plainTextContent' field must be an elegant formatted text version for non-HTML mail clients.
`;

  if (!ai) {
    // Generate high-grade contextual fallback template
    return generateFallbackEmail(data, agent);
  }

  try {
    const prompt = `Please compose a real estate pitch email for client ${data.client.name} showcasing the following selected properties:\n\n${projectSummaries}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: 'Subject line optimized for high open rates' },
            previewText: { type: Type.STRING, description: 'One-line inbox preview text snippet' },
            salutation: { type: Type.STRING, description: 'Personalized greeting' },
            openingHook: { type: Type.STRING, description: 'Opening contextual hook' },
            projectBreakdowns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  projectId: { type: Type.STRING },
                  projectTitle: { type: Type.STRING },
                  pitch: { type: Type.STRING },
                  keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['projectTitle', 'pitch', 'keyPoints'],
              },
            },
            financialSummary: { type: Type.STRING, description: 'Financial overview and investment structure' },
            callToAction: { type: Type.STRING, description: 'Next step or private invitation' },
            htmlContent: { type: Type.STRING, description: 'Complete styled HTML email content' },
            plainTextContent: { type: Type.STRING, description: 'Complete clean plain text email' },
          },
          required: [
            'subject',
            'previewText',
            'salutation',
            'openingHook',
            'projectBreakdowns',
            'financialSummary',
            'callToAction',
            'htmlContent',
            'plainTextContent',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return parsed;
  } catch (error) {
    console.error('Error generating email with Gemini:', error);
    return generateFallbackEmail(data, agent);
  }
}

function generateFallbackEmail(data: GenerateEmailRequest, agent: any) {
  const primaryProject = data.projects[0];
  const isOffPlan = primaryProject?.type === 'off-plan';
  const projectCount = data.projects.length;

  const subject = projectCount === 1
    ? `Private Presentation: ${primaryProject.title} | ${isOffPlan ? 'Exclusive Allocation' : 'Turnkey Acquisition'}`
    : `Curated Real Estate Portfolio: ${data.projects.map(p => p.title).join(' & ')} for ${data.client.name}`;

  const previewText = isOffPlan 
    ? `Pre-construction launch pricing & payment plan breakdown for ${primaryProject.title}`
    : `Turnkey luxury acquisition with immediate title deed readiness & strong yields`;

  const salutation = `Dear ${data.client.name},`;

  const openingHook = `I hope this finds you well. Bearing in mind your investment criteria${data.client.preferredLocation ? ` in ${data.client.preferredLocation}` : ''}, I have curated a private selection of standout opportunities that align with your capital allocation strategy. Whether evaluating high-upside off-plan developments with milestone financing or turnkey secondary market trophy residences, these properties represent exceptional fundamentals.`;

  const breakdowns = data.projects.map(p => ({
    projectId: p.id,
    projectTitle: p.title,
    pitch: p.description,
    keyPoints: [
      `Price: ${p.priceFormatted} (${p.beds}, ${p.areaSqFt.toLocaleString()} sq ft)`,
      `Status: ${p.handoverOrStatus}`,
      p.paymentPlan ? `Financial Terms: ${p.paymentPlan}` : `Yield: ${p.rentalYield || p.projectedRoi || 'Trophy Capital Preservation'}`,
      ...p.highlights.slice(0, 2)
    ]
  }));

  const financialSummary = `Key Investment Highlights:\n` + data.projects.map(p => 
    `• ${p.title} (${p.type.toUpperCase()}): ${p.priceFormatted} · ${p.handoverOrStatus} · ${p.paymentPlan || p.projectedRoi || p.rentalYield || 'Prime Title'}`
  ).join('\n');

  const callToAction = `I have compiled the comprehensive developer prospectus, architectural floorplans, and private video walkthroughs for your review. Would you be available for a brief 10-minute briefing or a private consultation this week to review allocations?`;

  const cleanPhoneDigits = agent.phone ? agent.phone.replace(/[^0-9]/g, '') : '';
  const whatsappUrl = cleanPhoneDigits ? `https://wa.me/${cleanPhoneDigits}` : '';

  const plainTextContent = `${salutation}\n\n${openingHook}\n\n` + 
    data.projects.map(p => `----------------------------------------\n${p.title.toUpperCase()} (${p.type === 'off-plan' ? 'Off-Plan Development' : 'Secondary Market Resale'})\nLocation: ${p.location}, ${p.city}\nPrice: ${p.priceFormatted}\nStatus: ${p.handoverOrStatus}\n\n${p.description}\n\nKey Highlights:\n${p.highlights.map(h => `• ${h}`).join('\n')}\n`).join('\n') +
    `\n${financialSummary}\n\n${callToAction}\n\nWarm regards,\n\n${agent.name}\n${agent.brokerage}\nDirect / WhatsApp: ${agent.phone}\nEmail: ${agent.email}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 36px; text-align: left;">
              <div style="color: #d97706; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">PRIVATE PORTFOLIO ADVISORY</div>
              <div style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">${agent.brokerage}</div>
            </td>
          </tr>

          <!-- Intro Content -->
          <tr>
            <td style="padding: 36px 36px 24px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">${salutation}</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 1.65;">
                ${openingHook}
              </p>
            </td>
          </tr>

          <!-- Project Showcases -->
          ${data.projects.map((p, idx) => `
          <tr>
            <td style="padding: 0 36px 28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px; ${p.type === 'off-plan' ? 'background-color: #eff6ff; color: #1d4ed8;' : 'background-color: #f0fdf4; color: #15803d;'}">
                            ${p.type === 'off-plan' ? 'Off-Plan Development' : 'Secondary Market Ready'}
                          </span>
                        </td>
                        <td align="right">
                          <span style="font-size: 18px; font-weight: 700; color: #0f172a;">${p.priceFormatted}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 12px;">
                          <h3 style="margin: 0; font-size: 19px; font-weight: 700; color: #0f172a; line-height: 1.3;">${p.title}</h3>
                          <p style="margin: 4px 0 12px 0; font-size: 13px; color: #64748b;">${p.location}, ${p.city} · ${p.beds} · ${p.areaSqFt.toLocaleString()} sq ft</p>
                          <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.6;">${p.description}</p>
                          
                          <!-- Key Specs Box -->
                          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 12px;">
                            <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">Investment Highlights:</div>
                            <div style="font-size: 13px; color: #475569; line-height: 1.5;">
                              • <strong>Status:</strong> ${p.handoverOrStatus}<br>
                              ${p.paymentPlan ? `• <strong>Payment Plan:</strong> ${p.paymentPlan}<br>` : ''}
                              ${p.rentalYield ? `• <strong>Rental Yield:</strong> ${p.rentalYield}<br>` : ''}
                              ${p.projectedRoi ? `• <strong>Projected Growth:</strong> ${p.projectedRoi}<br>` : ''}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `).join('')}

          <!-- Call to Action Box -->
          <tr>
            <td style="padding: 8px 36px 36px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a; border-radius: 8px; text-align: center; padding: 24px;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 8px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Schedule Private Consultation & Floorplans</h4>
                    <p style="margin: 0 0 18px 0; color: #94a3b8; font-size: 13px;">${callToAction}</p>
                    <table align="center" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 4px;">
                          <a href="mailto:${agent.email}?subject=Inquiry:%20${encodeURIComponent(primaryProject?.title || 'Property Portfolio')}" style="display: inline-block; background-color: #d97706; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 6px;">Request Private Brochure</a>
                        </td>
                        ${whatsappUrl ? `
                        <td style="padding: 4px;">
                          <a href="${whatsappUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 6px;">WhatsApp: ${agent.phone}</a>
                        </td>
                        ` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Signature Footer -->
          <tr>
            <td style="border-top: 1px solid #e2e8f0; padding: 24px 36px; background-color: #f8fafc;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${agent.name}</div>
                    <div style="font-size: 12px; color: #64748b;">${agent.brokerage}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
                      Direct: <a href="tel:${agent.phone.replace(/\s+/g, '')}" style="color: #0f172a; font-weight: 600; text-decoration: none;">${agent.phone}</a>
                      ${whatsappUrl ? ` · <a href="${whatsappUrl}" style="color: #16a34a; font-weight: 600; text-decoration: none;">WhatsApp Available</a>` : ''}
                      · <a href="mailto:${agent.email}" style="color: #2563eb; text-decoration: none;">${agent.email}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
</body>
</html>
`;

  return {
    subject,
    previewText,
    salutation,
    openingHook,
    projectBreakdowns: breakdowns,
    financialSummary,
    callToAction,
    htmlContent: htmlContent.trim(),
    plainTextContent: plainTextContent.trim(),
  };
}
