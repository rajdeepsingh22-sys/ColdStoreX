import React from 'react';
import {
  LayoutDashboard,
  Users,
  ArrowDownToDot,
  ArrowUpFromDot,
  Boxes,
  FileBarChart2,
  LogOut,
  Languages,
  ShieldCheck,
} from 'lucide-react';
import { translations } from '../translations';
import { Language } from '../types';

export type ActiveTab = 'dashboard' | 'farmers' | 'potatoIn' | 'potatoOut' | 'chambers' | 'reports' | 'friends';

interface NavbarProps {
  language: Language;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onToggleLanguage: () => void;
  onLogout: () => void;
  totalCapacity: number;
  currentBags: number;
  currentUserEmail?: string | null;
  firebaseConnected?: boolean;
  onSyncAll?: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  activeTab,
  setActiveTab,
  onToggleLanguage,
  onLogout,
  totalCapacity,
  currentBags,
  currentUserEmail,
  firebaseConnected = true,
  onSyncAll,
  isSyncing = false,
}) => {
  const t = translations[language];
  const percentFilled = Math.min(100, Math.round((currentBags / (totalCapacity || 1)) * 100));

  // Standard navigation items
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: t.navDashboard, icon: LayoutDashboard },
    { id: 'farmers' as ActiveTab, label: t.navFarmers, icon: Users },
    { id: 'potatoIn' as ActiveTab, label: t.navPotatoIn, icon: ArrowDownToDot, badge: '₹160' },
    { id: 'potatoOut' as ActiveTab, label: t.navPotatoOut, icon: ArrowUpFromDot },
    { id: 'chambers' as ActiveTab, label: t.navChambers, icon: Boxes },
    { id: 'reports' as ActiveTab, label: t.navReports, icon: FileBarChart2 },
    { id: 'friends' as ActiveTab, label: t.navFriendsAccess, icon: ShieldCheck, badge: language === 'hi' ? 'पूर्ण एक्सेस' : 'Full Access' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
      {/* Top Banner */}
      <div className="bg-amber-900 text-amber-50 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🥔</span>
          <div>
            <span className="font-black tracking-wide text-white text-base sm:text-lg">
              {t.appName}
            </span>
            <span className="hidden md:inline ml-2 text-amber-200 border-l border-amber-700 pl-2">
              {t.appTagline}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Firebase Connection Status Badge */}
          <div className="flex items-center gap-1.5 bg-amber-950/70 px-2.5 py-1 rounded-full border border-amber-700/60 text-xs">
            <span className={`w-2 h-2 rounded-full ${firebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-semibold text-amber-200 text-[11px]">
              {firebaseConnected
                ? (language === 'hi' ? '🔥 लाइव सिंक (coldstorex-3b)' : '🔥 Cloud: coldstorex-3b')
                : (language === 'hi' ? '🔥 कनेक्टिंग...' : '🔥 Connecting...')}
            </span>
          </div>

          {/* Sync All to Cloud Button */}
          {onSyncAll && (
            <button
              onClick={onSyncAll}
              disabled={isSyncing}
              title={language === 'hi' ? 'सभी डेटा को तुरंत क्लाउड फायरबेस पर सिंक करें' : 'Sync all data to Firestore now'}
              className="flex items-center gap-1 bg-amber-700/80 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs px-2.5 py-1 rounded-full border border-amber-500/50 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
              <span>
                {isSyncing
                  ? (language === 'hi' ? 'सिंक हो रहा है...' : 'Syncing...')
                  : (language === 'hi' ? 'क्लाउड सिंक' : 'Sync to Cloud')}
              </span>
            </button>
          )}

          {/* Live Capacity Snapshot */}
          <div className="hidden sm:flex items-center gap-2 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-700/50">
            <span className="text-amber-300 font-semibold">
              {language === 'hi' ? 'भंडारण स्थिति:' : 'Storage:'}
            </span>
            <span className="font-bold text-white font-mono">
              {currentBags.toLocaleString('en-IN')} / {totalCapacity.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${percentFilled > 85 ? 'bg-rose-500 text-white' : percentFilled > 60 ? 'bg-amber-500 text-slate-900' : 'bg-emerald-500 text-white'}`}>
              {percentFilled}%
            </span>
          </div>

          {/* User Badge */}
          {currentUserEmail && (
            <div className="hidden lg:flex items-center gap-1.5 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-700/60 text-xs">
              <span className="text-amber-300 font-bold">👤</span>
              <span className="font-mono text-white text-[11px] truncate max-w-[140px]" title={currentUserEmail}>
                {currentUserEmail}
              </span>
              <span className="bg-emerald-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded">
                {language === 'hi' ? 'पूर्ण अधिकार' : 'Full Access'}
              </span>
            </div>
          )}

          {/* Language Toggle Button */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 bg-amber-800 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg border border-amber-600 font-bold transition shadow-sm cursor-pointer"
            title={language === 'hi' ? 'Switch to English' : 'हिन्दी में बदलें'}
          >
            <Languages className="w-4 h-4 text-amber-300" />
            <span>{language === 'hi' ? 'English' : 'हिन्दी'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1 bg-rose-900 hover:bg-rose-800 text-rose-100 px-3 py-1.5 rounded-lg transition text-xs font-semibold cursor-pointer"
            title={t.logout}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.logout}</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <nav className="px-4 sm:px-6 flex space-x-1 sm:space-x-2 overflow-x-auto py-2 bg-slate-50 border-b border-slate-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-amber-800 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {'badge' in item && item.badge && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-amber-950 text-amber-200'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
