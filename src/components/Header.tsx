import React from 'react';
import { User } from 'firebase/auth';
import { Mail, CheckCircle, LogOut } from 'lucide-react';

interface HeaderProps {
  activeTab: 'composer' | 'projects' | 'clients' | 'history';
  setActiveTab: (tab: 'composer' | 'projects' | 'clients' | 'history') => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isLoggingIn: boolean;
  selectedProjectsCount: number;
  connectedSheet?: { id: string; name: string } | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  onSignIn,
  onSignOut,
  isLoggingIn,
  selectedProjectsCount,
  connectedSheet,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('composer')}
              className="text-left group cursor-pointer focus:outline-none"
            >
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-amber-700 transition-colors whitespace-nowrap shrink-0 font-display">
                Vanguard Estates
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-500 ml-2">
                · Dubai &amp; UAE Luxury Advisory
              </span>
            </button>
          </div>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('composer')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'composer'
                  ? 'text-slate-900 font-semibold border-b-2 border-amber-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Email Studio
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'projects'
                  ? 'text-slate-900 font-semibold border-b-2 border-amber-600'
                  : 'hover:text-slate-900'
              }`}
            >
              <span>Projects Portfolio (AED)</span>
              {selectedProjectsCount > 0 && (
                <span className="text-xs font-semibold px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded">
                  {selectedProjectsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'clients'
                  ? 'text-slate-900 font-semibold border-b-2 border-amber-600'
                  : 'hover:text-slate-900'
              }`}
            >
              <span>Client Contacts</span>
              {connectedSheet && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                  Sheets Synced
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'history'
                  ? 'text-slate-900 font-semibold border-b-2 border-amber-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Dispatch History
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-medium text-slate-900 truncate max-w-[150px]">
                    {user.displayName || user.email}
                  </span>
                  <span className="text-[11px] text-emerald-600 flex items-center justify-end gap-1">
                    <CheckCircle className="w-3 h-3 inline" />
                    Google Apps Connected
                  </span>
                </div>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={onSignOut}
                  title="Disconnect Google Account"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                disabled={isLoggingIn}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Connect Google Workspace'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile secondary tab row */}
        <div className="flex md:hidden items-center justify-around border-t border-slate-100 py-2 text-xs font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('composer')}
            className={`px-2 py-1 ${activeTab === 'composer' ? 'text-amber-700 font-semibold' : ''}`}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-2 py-1 ${activeTab === 'projects' ? 'text-amber-700 font-semibold' : ''}`}
          >
            Projects {selectedProjectsCount > 0 ? `(${selectedProjectsCount})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-2 py-1 ${activeTab === 'clients' ? 'text-amber-700 font-semibold' : ''}`}
          >
            Clients
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-2 py-1 ${activeTab === 'history' ? 'text-amber-700 font-semibold' : ''}`}
          >
            History
          </button>
        </div>
      </div>
    </header>
  );
};
