import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout } from './services/auth';
import { Header } from './components/Header';
import { CampaignComposer } from './components/CampaignComposer';
import { ProjectsManager } from './components/ProjectsManager';
import { ClientsManager } from './components/ClientsManager';
import { SentHistory } from './components/SentHistory';
import { INITIAL_PROJECTS } from './data/mockProjects';
import { INITIAL_CLIENTS } from './data/sampleClients';
import { ClientContact, RealEstateProject, SentEmailRecord } from './types';

import { updateClientInGoogleSheet } from './services/driveSheets';

export default function App() {
  const [activeTab, setActiveTab] = useState<'composer' | 'projects' | 'clients' | 'history'>('composer');

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data State with Local Storage persistence & AED currency migration
  const [clients, setClients] = useState<ClientContact[]>(() => {
    try {
      const saved = localStorage.getItem('vanguard_clients');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.some(
            (c: ClientContact) =>
              c.budgetFormatted?.includes('$') ||
              (c.email === 'markstephenyucada@gmail.com' && !c.phone?.includes('+971'))
          )
        ) {
          return INITIAL_CLIENTS;
        }
        return parsed;
      }
      return INITIAL_CLIENTS;
    } catch {
      return INITIAL_CLIENTS;
    }
  });

  const [connectedSheet, setConnectedSheet] = useState<{ id: string; name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('vanguard_connected_sheet');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [projects, setProjects] = useState<RealEstateProject[]>(() => {
    try {
      const saved = localStorage.getItem('vanguard_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.some(
            (p: RealEstateProject) => p.currency === 'USD' || p.priceFormatted?.includes('$')
          )
        ) {
          return INITIAL_PROJECTS;
        }
        return parsed;
      }
      return INITIAL_PROJECTS;
    } catch {
      return INITIAL_PROJECTS;
    }
  });

  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    return INITIAL_CLIENTS[0]?.id || '';
  });

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => {
    return [INITIAL_PROJECTS[0]?.id, INITIAL_PROJECTS[2]?.id].filter(Boolean);
  });

  const [sentRecords, setSentRecords] = useState<SentEmailRecord[]>(() => {
    try {
      const saved = localStorage.getItem('vanguard_sent_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('vanguard_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    if (connectedSheet) {
      localStorage.setItem('vanguard_connected_sheet', JSON.stringify(connectedSheet));
    } else {
      localStorage.removeItem('vanguard_connected_sheet');
    }
  }, [connectedSheet]);

  useEffect(() => {
    localStorage.setItem('vanguard_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('vanguard_sent_history', JSON.stringify(sentRecords));
  }, [sentRecords]);

  // Initialize Firebase Auth listener on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (err: unknown) {
      console.warn('Google sign-in attempt was not completed:', err instanceof Error ? err.message : err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setConnectedSheet(null);
    } catch (err: unknown) {
      console.warn('Sign out attempt notice:', err instanceof Error ? err.message : err);
    }
  };

  const handleAddClient = (client: ClientContact) => {
    setClients((prev) => [client, ...prev]);
    setSelectedClientId(client.id);
  };

  const handleAddBatchClients = (batch: ClientContact[]) => {
    setClients((prev) => [...batch, ...prev]);
    if (batch.length > 0) {
      setSelectedClientId(batch[0].id);
    }
  };

  const handleDeleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    if (selectedClientId === id) {
      const remaining = clients.filter((c) => c.id !== id);
      if (remaining.length > 0) setSelectedClientId(remaining[0].id);
    }
  };

  const handleAddNewProject = (project: RealEstateProject) => {
    setProjects((prev) => [project, ...prev]);
    setSelectedProjectIds((prev) => [...prev, project.id]);
  };

  const handleToggleProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectClientForEmail = (client: ClientContact) => {
    setSelectedClientId(client.id);
    setActiveTab('composer');
  };

  const handleEmailDispatched = (record: SentEmailRecord) => {
    setSentRecords((prev) => [record, ...prev]);
    
    let updatedSentCount = 1;
    setClients((prev) =>
      prev.map((c) => {
        if (c.email.toLowerCase() === record.recipientEmail.toLowerCase()) {
          updatedSentCount = (c.totalEmailsSent || 0) + 1;
          return {
            ...c,
            totalEmailsSent: updatedSentCount,
            lastEmailedAt: record.sentAt,
            status: 'contacted',
          };
        }
        return c;
      })
    );

    // If a Google Sheet is actively connected, update it automatically in real time!
    if (connectedSheet && accessToken) {
      updateClientInGoogleSheet(
        accessToken,
        connectedSheet.id,
        record.recipientEmail,
        updatedSentCount,
        record.sentAt
      ).catch((err) => {
        console.warn('Google Sheet background update notice:', err);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isLoggingIn={isLoggingIn}
        selectedProjectsCount={selectedProjectIds.length}
        connectedSheet={connectedSheet}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'composer' && (
          <CampaignComposer
            clients={clients}
            projects={projects}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            selectedProjectIds={selectedProjectIds}
            onToggleProject={handleToggleProject}
            user={user}
            accessToken={accessToken}
            onSignInRequired={handleSignIn}
            onEmailDispatched={handleEmailDispatched}
            connectedSheet={connectedSheet}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsManager
            projects={projects}
            selectedProjectIds={selectedProjectIds}
            onToggleProjectSelection={handleToggleProject}
            onAddNewProject={handleAddNewProject}
            onProceedToComposer={() => setActiveTab('composer')}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsManager
            clients={clients}
            onAddClient={handleAddClient}
            onAddBatchClients={handleAddBatchClients}
            onDeleteClient={handleDeleteClient}
            onSelectClientForEmail={handleSelectClientForEmail}
            selectedClientId={selectedClientId}
            user={user}
            accessToken={accessToken}
            connectedSheet={connectedSheet}
            onConnectSheet={setConnectedSheet}
            onSignInRequired={handleSignIn}
          />
        )}

        {activeTab === 'history' && (
          <SentHistory
            records={sentRecords}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-800">Vanguard Estates</span> · AI Real Estate Client Mailer &amp; Portfolio Engine
          </div>
          <div>
            Connected to Google Workspace Gmail API &amp; Gemini 3.8 Flash
          </div>
        </div>
      </footer>
    </div>
  );
}
