import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  ClientContact, 
  RealEstateProject, 
  EmailTone, 
  GeneratedEmailDraft, 
  SentEmailRecord 
} from '../types';
import { sendGmailEmail, generateMailtoUrl, generateGmailWebComposeUrl, downloadEmlFile } from '../services/gmail';
import { ConfirmationModal } from './ConfirmationModal';
import { 
  Sparkles, 
  Send, 
  Mail, 
  Smartphone, 
  Monitor, 
  Code, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Building2, 
  Home, 
  RefreshCw, 
  X, 
  Edit3,
  Layers,
  CheckCircle2,
  AlertCircle,
  Phone
} from 'lucide-react';

interface CampaignComposerProps {
  clients: ClientContact[];
  projects: RealEstateProject[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  selectedProjectIds: string[];
  onToggleProject: (id: string) => void;
  user: User | null;
  accessToken: string | null;
  onSignInRequired: () => void;
  onEmailDispatched: (record: SentEmailRecord) => void;
  connectedSheet?: { id: string; name: string } | null;
}

export const CampaignComposer: React.FC<CampaignComposerProps> = ({
  clients,
  projects,
  selectedClientId,
  onSelectClient,
  selectedProjectIds,
  onToggleProject,
  user,
  accessToken,
  onSignInRequired,
  onEmailDispatched,
  connectedSheet,
}) => {
  const [tone, setTone] = useState<EmailTone>('luxury_vip');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<GeneratedEmailDraft | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'code' | 'text'>('desktop');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Editable fields in draft
  const [editableSubject, setEditableSubject] = useState('');
  const [editableHtml, setEditableHtml] = useState('');
  const [isEditingSubject, setIsEditingSubject] = useState(false);

  // Agent profile settings (persisted in localStorage)
  const [agentName, setAgentName] = useState(() => {
    return localStorage.getItem('vanguard_agent_name') || user?.displayName || 'Mark Stephen Yucada';
  });
  const [agentBrokerage, setAgentBrokerage] = useState(() => {
    return localStorage.getItem('vanguard_agent_brokerage') || 'Vanguard Private Estates & Advisory';
  });
  const [agentPhone, setAgentPhone] = useState(() => {
    return localStorage.getItem('vanguard_agent_phone') || '+971 58 553 8382';
  });
  const [agentEmail, setAgentEmail] = useState(() => {
    return localStorage.getItem('vanguard_agent_email') || user?.email || 'markstephenyucada@gmail.com';
  });
  const [isEditingAgentProfile, setIsEditingAgentProfile] = useState(false);

  // Sync agent email/name if logged in user changes and none was persisted
  useEffect(() => {
    if (user?.email && !localStorage.getItem('vanguard_agent_email')) {
      setAgentEmail(user.email);
    }
    if (user?.displayName && !localStorage.getItem('vanguard_agent_name')) {
      setAgentName(user.displayName);
    }
  }, [user]);

  // Persist agent profile updates
  useEffect(() => {
    localStorage.setItem('vanguard_agent_name', agentName);
  }, [agentName]);
  useEffect(() => {
    localStorage.setItem('vanguard_agent_brokerage', agentBrokerage);
  }, [agentBrokerage]);
  useEffect(() => {
    localStorage.setItem('vanguard_agent_phone', agentPhone);
  }, [agentPhone]);
  useEffect(() => {
    localStorage.setItem('vanguard_agent_email', agentEmail);
  }, [agentEmail]);

  // Confirmation modal state for Workspace Gmail sending
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSendingViaGmail, setIsSendingViaGmail] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const selectedProjects = projects.filter((p) => selectedProjectIds.includes(p.id));

  // Initial trigger or re-generation
  const handleGenerateEmail = async () => {
    if (!selectedClient) return;
    if (selectedProjects.length === 0) {
      alert('Please select at least one property (off-plan or secondary) to feature in the email.');
      return;
    }

    setIsGenerating(true);
    setSendSuccessMessage(null);
    setSendErrorMessage(null);

    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: {
            id: selectedClient.id,
            name: selectedClient.name,
            email: selectedClient.email,
            budgetFormatted: selectedClient.budgetFormatted,
            preferredType: selectedClient.preferredType,
            preferredLocation: selectedClient.preferredLocation,
            notes: selectedClient.notes,
          },
          projects: selectedProjects.map((p) => ({
            id: p.id,
            title: p.title,
            type: p.type,
            developer: p.developer,
            location: p.location,
            city: p.city,
            priceFormatted: p.priceFormatted,
            beds: p.beds,
            areaSqFt: p.areaSqFt,
            handoverOrStatus: p.handoverOrStatus,
            paymentPlan: p.paymentPlan,
            projectedRoi: p.projectedRoi,
            rentalYield: p.rentalYield,
            capitalGrowth: p.capitalGrowth,
            description: p.description,
            highlights: p.highlights,
            imageUrl: p.imageUrl,
          })),
          tone,
          customInstructions,
          agent: {
            name: agentName,
            brokerage: agentBrokerage,
            phone: agentPhone,
            email: agentEmail,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed with status ${response.status}`);
      }

      const generated = await response.json();
      const newDraft: GeneratedEmailDraft = {
        id: `draft_${Date.now()}`,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        selectedProjects,
        tone,
        subject: generated.subject,
        previewText: generated.previewText,
        salutation: generated.salutation,
        openingHook: generated.openingHook,
        projectBreakdowns: generated.projectBreakdowns || [],
        financialSummary: generated.financialSummary || '',
        callToAction: generated.callToAction,
        htmlContent: generated.htmlContent,
        plainTextContent: generated.plainTextContent,
        agentName,
        agentBrokerage,
        agentPhone,
        agentEmail,
        generatedAt: new Date().toISOString(),
      };

      setDraft(newDraft);
      setEditableSubject(newDraft.subject);
      setEditableHtml(newDraft.htmlContent);
    } catch (err: unknown) {
      console.error('Error generating email draft:', err);
      setSendErrorMessage('Could not complete AI email generation. Please check connectivity or try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate on first mount if we have a client and project
  useEffect(() => {
    if (!draft && selectedClient && selectedProjects.length > 0) {
      handleGenerateEmail();
    }
  }, [selectedClientId, selectedProjectIds.length]);

  const handleCopy = (text: string, type: 'html' | 'text') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleInitiateSend = () => {
    if (!user || !accessToken) {
      onSignInRequired();
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // Dispatches via Gmail API after user confirms in the modal
  const handleConfirmSendGmail = async () => {
    if (!draft || !accessToken || !selectedClient) return;

    setIsSendingViaGmail(true);
    setSendErrorMessage(null);

    try {
      const result = await sendGmailEmail(accessToken, {
        to: selectedClient.email,
        subject: editableSubject || draft.subject,
        html: editableHtml || draft.htmlContent,
        text: draft.plainTextContent,
        fromName: agentName,
      });

      const record: SentEmailRecord = {
        id: `sent_${Date.now()}`,
        recipientEmail: selectedClient.email,
        recipientName: selectedClient.name,
        subject: editableSubject || draft.subject,
        projectTitles: selectedProjects.map((p) => p.title),
        sentAt: new Date().toISOString(),
        status: 'sent',
        method: 'gmail_api',
        messageId: result.id,
        htmlContent: editableHtml || draft.htmlContent,
      };

      onEmailDispatched(record);
      setIsConfirmModalOpen(false);
      setSendSuccessMessage(`Email successfully dispatched to ${selectedClient.email} via Gmail!`);
    } catch (err: unknown) {
      console.error('Gmail send error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to send message via Gmail API';
      setSendErrorMessage(msg);
      setIsConfirmModalOpen(false);
    } finally {
      setIsSendingViaGmail(false);
    }
  };

  const handleSendViaMailto = () => {
    if (!draft || !selectedClient) return;
    const mailtoUrl = generateMailtoUrl(
      selectedClient.email,
      editableSubject || draft.subject,
      draft.plainTextContent
    );
    window.location.href = mailtoUrl;

    const record: SentEmailRecord = {
      id: `sent_${Date.now()}`,
      recipientEmail: selectedClient.email,
      recipientName: selectedClient.name,
      subject: editableSubject || draft.subject,
      projectTitles: selectedProjects.map((p) => p.title),
      sentAt: new Date().toISOString(),
      status: 'sent',
      method: 'mailto',
      htmlContent: editableHtml || draft.htmlContent,
    };
    onEmailDispatched(record);
  };

  const handleOpenGmailWeb = () => {
    if (!draft || !selectedClient) return;
    const url = generateGmailWebComposeUrl(
      selectedClient.email,
      editableSubject || draft.subject,
      draft.plainTextContent
    );
    window.open(url, '_blank');
  };

  const handleDownloadEml = () => {
    if (!draft || !selectedClient) return;
    downloadEmlFile({
      to: selectedClient.email,
      subject: editableSubject || draft.subject,
      html: editableHtml || draft.htmlContent,
      text: draft.plainTextContent,
      fromName: agentName,
    });
  };

  const handleShareWhatsApp = () => {
    if (!draft || !selectedClient) return;
    const clientPhoneDigits = selectedClient.phone ? selectedClient.phone.replace(/[^0-9]/g, '') : '';
    const pitchText =
      `*${editableSubject || draft.subject}*\n\n` +
      `Dear ${selectedClient.name},\n\n` +
      `${draft.openingHook}\n\n` +
      selectedProjects
        .map(
          (p) =>
            `• *${p.title}* (${p.priceFormatted})\n  Location: ${p.location}, ${p.city}\n  Status: ${p.handoverOrStatus}`
        )
        .join('\n\n') +
      `\n\n${draft.callToAction}\n\n` +
      `Best regards,\n*${agentName}*\n${agentBrokerage}\nDirect / WhatsApp: ${agentPhone}\nEmail: ${agentEmail}`;

    const targetUrl = clientPhoneDigits
      ? `https://wa.me/${clientPhoneDigits}?text=${encodeURIComponent(pitchText)}`
      : `https://wa.me/?text=${encodeURIComponent(pitchText)}`;
    window.open(targetUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display">
            AI Real Estate Email Campaign Studio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Craft tailored investor pitches for off-plan pre-construction or secondary market properties, then dispatch directly via Gmail.
          </p>
        </div>

        {/* Global Dispatch Status Messages */}
        {sendSuccessMessage && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{sendSuccessMessage}</span>
          </div>
        )}
        {sendErrorMessage && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{sendErrorMessage}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Controls on Left, Live Canvas on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Client, Projects & Campaign Parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Recipient Client Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Select Client Contact
              </span>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {clients.length} in database
              </span>
            </div>

            <select
              value={selectedClientId}
              onChange={(e) => onSelectClient(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.email} ({c.preferredType.toUpperCase()})
                </option>
              ))}
            </select>

            {selectedClient && (
              <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-200/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Target Budget:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {selectedClient.budgetFormatted || 'Flexible'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Category Preference:</span>
                  <span className="font-medium text-slate-800">
                    {selectedClient.preferredType === 'off-plan'
                      ? 'Off-Plan Pre-Construction'
                      : selectedClient.preferredType === 'secondary'
                      ? 'Secondary Market Resale'
                      : 'All Real Estate'}
                  </span>
                </div>
                {selectedClient.notes && (
                  <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/50 mt-1">
                    &quot;{selectedClient.notes}&quot;
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 2. Featured Projects Selection */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Featured Properties ({selectedProjects.length})
              </span>
              <span className="text-xs text-slate-400">
                Toggle properties to include
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {projects.map((proj) => {
                const isSelected = selectedProjectIds.includes(proj.id);
                return (
                  <div
                    key={proj.id}
                    onClick={() => onToggleProject(proj.id)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/60 border-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="overflow-hidden">
                        <div className="font-semibold text-slate-900 truncate">
                          {proj.title}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span>{proj.type === 'off-plan' ? 'Off-Plan' : 'Secondary'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{proj.priceFormatted}</span>
                          <span aria-hidden="true">·</span>
                          <span>{proj.handoverOrStatus}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {proj.type === 'off-plan' ? (
                        <Building2 className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Home className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent Profile & Contact Signature */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Agent Contact &amp; Sign-off
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAgentProfile(!isEditingAgentProfile)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                {isEditingAgentProfile ? 'Done' : 'Edit Contact'}
              </button>
            </div>

            {isEditingAgentProfile ? (
              <div className="space-y-2 pt-1 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Agent Full Name</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Direct Phone / WhatsApp</label>
                  <input
                    type="tel"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    placeholder="+971 58 553 8382"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Brokerage / Advisory Title</label>
                  <input
                    type="text"
                    value={agentBrokerage}
                    onChange={(e) => setAgentBrokerage(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Contact Email</label>
                  <input
                    type="email"
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs flex items-center justify-between">
                <div className="overflow-hidden">
                  <div className="font-semibold text-slate-900 truncate">{agentName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{agentBrokerage}</div>
                  <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-2">
                    <span className="font-mono text-emerald-700 font-semibold">{agentPhone}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500 truncate">{agentEmail}</span>
                  </div>
                </div>
                <div className="shrink-0 ml-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Active</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Campaign Angle & Pitch Tone */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Campaign Strategy &amp; Tone
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'luxury_vip', label: 'Ultra-Luxury VIP', desc: 'Bespoke prestige & exclusivity' },
                { id: 'high_roi', label: 'High ROI & Growth', desc: 'Yields & capital appreciation' },
                { id: 'urgent_launch', label: 'Hot Launch Urgency', desc: 'Pre-construction launch terms' },
                { id: 'distress_deal', label: 'Motivated Resale', desc: 'Below market turnkey buy' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id as EmailTone)}
                  className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    tone === t.id
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold text-[11px]">{t.label}</div>
                  <div className={`text-[10px] ${tone === t.id ? 'text-slate-300' : 'text-slate-400'}`}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Custom Instructions for Gemini AI:
              </label>
              <textarea
                rows={2}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Mention 10% booking bonus, 0% tax benefit, or private airport chauffeur invitation..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerateEmail}
              disabled={isGenerating || selectedProjects.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Synthesizing Pitch with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Generate AI Email Pitch</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Interactive Email Canvas & Dispatch Suite (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Header Controls for Canvas */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Segmented Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode('desktop')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'desktop'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop View</span>
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'mobile'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Preview</span>
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'text'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Plain Text</span>
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'code'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>HTML Code</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(editableHtml || draft?.htmlContent || '', 'html')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                {copiedType === 'html' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Copy HTML</span>
              </button>

              <button
                onClick={handleDownloadEml}
                title="Download .EML file for Outlook/Apple Mail"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download .EML</span>
              </button>
            </div>
          </div>

          {/* Email Subject Line Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider shrink-0 text-[10px]">
                Subject:
              </span>
              {isEditingSubject ? (
                <input
                  type="text"
                  value={editableSubject}
                  onChange={(e) => setEditableSubject(e.target.value)}
                  onBlur={() => setIsEditingSubject(false)}
                  autoFocus
                  className="w-full px-2 py-1 font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded focus:outline-none"
                />
              ) : (
                <span className="font-semibold text-slate-900 truncate">
                  {editableSubject || draft?.subject || 'Crafting bespoke subject...'}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsEditingSubject(!isEditingSubject)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors cursor-pointer shrink-0"
              title="Edit Subject Line"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Email Preview Container */}
          <div className="bg-slate-100/70 border border-slate-200 rounded-xl overflow-hidden min-h-[500px] flex items-center justify-center p-3 sm:p-5">
            {isGenerating ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-600" />
                <p className="font-semibold text-slate-800 text-sm font-display">
                  Composing Private Investor Email...
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Gemini 3.8 Flash is calculating investment yield projections, formatting luxury layout tables, and tailoring highlights for {selectedClient.name}.
                </p>
              </div>
            ) : draft ? (
              <>
                {/* Desktop View */}
                {viewMode === 'desktop' && (
                  <div className="w-full max-w-2xl bg-white shadow-lg rounded-xl overflow-hidden border border-slate-200">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
                      <div className="truncate">
                        <strong>To:</strong> {selectedClient.name} &lt;{selectedClient.email}&gt;
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Responsive HTML Table
                      </div>
                    </div>
                    <div
                      className="p-2 sm:p-4 max-h-[600px] overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: editableHtml || draft.htmlContent }}
                    />
                  </div>
                )}

                {/* Mobile View */}
                {viewMode === 'mobile' && (
                  <div className="w-full max-w-xs bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800">
                    <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2" />
                    <div className="bg-white rounded-[26px] overflow-hidden max-h-[520px] overflow-y-auto p-2 text-xs">
                      {/* Mobile Notification Header */}
                      <div className="bg-slate-50 border-b border-slate-100 p-2.5 mb-2 rounded-lg">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-slate-900">{agentName}</span>
                          <span>Just now</span>
                        </div>
                        <div className="font-semibold text-slate-800 text-[11px] truncate">
                          {editableSubject || draft.subject}
                        </div>
                      </div>
                      <div
                        dangerouslySetInnerHTML={{ __html: editableHtml || draft.htmlContent }}
                      />
                    </div>
                  </div>
                )}

                {/* Plain Text View */}
                {viewMode === 'text' && (
                  <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-sm max-h-[560px] overflow-y-auto">
                    <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {draft.plainTextContent}
                    </pre>
                  </div>
                )}

                {/* Raw HTML Code View */}
                {viewMode === 'code' && (
                  <div className="w-full bg-slate-950 rounded-xl p-4 shadow-sm max-h-[560px] overflow-y-auto">
                    <pre className="text-xs font-mono text-amber-200/90 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                      {editableHtml || draft.htmlContent}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-slate-700">No Draft Generated Yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click &apos;Generate AI Email Pitch&apos; on the left panel to begin.
                </p>
              </div>
            )}
          </div>

          {/* Action Dispatch Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleShareWhatsApp}
                title="Send customized investor pitch via WhatsApp directly to client"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Pitch</span>
              </button>

              <button
                onClick={handleSendViaMailto}
                title="Open system default email client"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Mail App</span>
              </button>

              <button
                onClick={handleOpenGmailWeb}
                title="Compose directly in Gmail Web"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Open Gmail Web</span>
              </button>

              {connectedSheet && (
                <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Syncs to &quot;{connectedSheet.name}&quot;</span>
                </span>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {user ? (
                <button
                  onClick={handleInitiateSend}
                  disabled={!draft || isGenerating}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>Send via Connected Gmail API</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenGmailWeb}
                    disabled={!draft || isGenerating}
                    title="Send immediately using Gmail Web without linking account"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Send via Gmail Web (1-Click)</span>
                  </button>

                  <button
                    onClick={onSignInRequired}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-slate-400" />
                    <span>Connect Google Account</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory User Confirmation Modal for Workspace Gmail Action */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSendGmail}
        isSending={isSendingViaGmail}
        recipientEmail={selectedClient?.email || ''}
        recipientName={selectedClient?.name || ''}
        subject={editableSubject || draft?.subject || ''}
        projectTitles={selectedProjects.map((p) => p.title)}
        senderEmail={user?.email || undefined}
        batchCount={1}
      />
    </div>
  );
};
