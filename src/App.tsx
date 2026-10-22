import React, { useState, useEffect, useRef } from 'react';
import { AppState, Language, Farmer, Chamber, InwardEntry, OutwardEntry, UserAccount } from './types';
import { loadAppState, saveAppState, getAuthUser, setAuthUser } from './utils/storage';
import {
  testConnection,
  seedInitialChambers,
  subscribeToChambers,
  subscribeToFarmers,
  subscribeToInwards,
  subscribeToOutwards,
  subscribeToUsers,
  saveFarmerToFirestore,
  saveInwardBatchToFirestore,
  saveOutwardToFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  syncAllToFirestore,
  logoutFirebase,
} from './firebase';
import { LoginModal } from './components/LoginModal';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { FarmerManager } from './components/FarmerManager';
import { PotatoInView } from './components/PotatoInView';
import { PotatoOutView } from './components/PotatoOutView';
import { ChamberView } from './components/ChamberView';
import { ReportsView } from './components/ReportsView';
import { FriendsAccessView } from './components/FriendsAccessView';
import { InvoiceModal } from './components/InvoiceModal';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [currentUser, setCurrentUser] = useState<string | null>(() => getAuthUser());
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [language, setLanguage] = useState<Language>('hi'); // Default to Hindi, toggles to English with 1 click
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const appStateRef = useRef<AppState>(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // Pre-selected farmer when jumping from farmer list to Inward or Outward
  const [contextFarmer, setContextFarmer] = useState<Farmer | null>(null);

  // Active printable invoice/gate pass modal
  const [activeInwardInvoice, setActiveInwardInvoice] = useState<InwardEntry | null>(null);
  const [activeInwardBatch, setActiveInwardBatch] = useState<InwardEntry[]>([]);
  const [activeOutwardGatePass, setActiveOutwardGatePass] = useState<OutwardEntry | null>(null);

  // Sync state changes to local storage cache
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setSyncToast({ text, type });
    setTimeout(() => {
      setSyncToast((cur) => (cur?.text === text ? null : cur));
    }, 4500);
  };

  // Manual Trigger to upload all records from this device to Firestore
  const handleManualSync = async () => {
    setIsSyncing(true);
    showToast(language === 'hi' ? 'क्लाउड पर डेटा अपलोड हो रहा है...' : 'Syncing data to Cloud...', 'info');

    const result = await syncAllToFirestore(appStateRef.current);
    setIsSyncing(false);

    if (result.success) {
      setFirebaseConnected(true);
      setFirebaseError(null);
      showToast(
        language === 'hi'
          ? `✔ सफलता! ${result.count} रिकॉर्ड्स फायरबेस क्लाउड पर सिंक हो गए हैं।`
          : `✔ Success! ${result.count} records synced to Firestore.`,
        'success'
      );
    } else {
      setFirebaseError(result.error || 'Sync failed');
      showToast(
        language === 'hi'
          ? `⚠ सिंक नहीं हो सका: ${result.error || 'नेटवर्क या रूल्स समस्या'}`
          : `⚠ Sync failed: ${result.error}`,
        'error'
      );
    }
  };

  // Connect to Firebase Cloud Firestore and subscribe to real-time collections
  useEffect(() => {
    testConnection().then((res) => {
      if (res.ok) {
        setFirebaseConnected(true);
        setFirebaseError(null);
        seedInitialChambers();
      } else {
        setFirebaseConnected(false);
        setFirebaseError(res.error || 'Connection limited');
      }
    });

    const handleError = (err: Error) => {
      console.warn('Firestore subscription error:', err);
      if (err.message.includes('permission') || err.message.includes('PERMISSION_DENIED')) {
        setFirebaseError(
          language === 'hi'
            ? 'फायरबेस रूल्स में अनुमति नहीं है। कृपया Firebase Console में Firestore Rules को allow read, write: if true; करें।'
            : 'Permission Denied: Please check Firestore Rules in Firebase Console.'
        );
      }
    };

    // Real-time Firestore subscriptions with two-way sync
    const unsubChambers = subscribeToChambers((chambers) => {
      if (chambers && chambers.length > 0) {
        setAppState((prev) => ({ ...prev, chambers }));
      }
      setFirebaseConnected(true);
      setFirebaseError(null);
    }, handleError);

    const unsubFarmers = subscribeToFarmers((farmers) => {
      if (farmers && farmers.length > 0) {
        setAppState((prev) => ({ ...prev, farmers }));
      } else if (appStateRef.current.farmers.length > 0) {
        // If Firestore is empty but this device has local farmers, auto-sync them to Firestore!
        syncAllToFirestore(appStateRef.current);
      }
      setFirebaseConnected(true);
      setFirebaseError(null);
    }, handleError);

    const unsubInwards = subscribeToInwards((inwards) => {
      if (inwards && inwards.length > 0) {
        setAppState((prev) => ({ ...prev, inwards }));
      }
      setFirebaseConnected(true);
      setFirebaseError(null);
    }, handleError);

    const unsubOutwards = subscribeToOutwards((outwards) => {
      if (outwards && outwards.length > 0) {
        setAppState((prev) => ({ ...prev, outwards }));
      }
      setFirebaseConnected(true);
      setFirebaseError(null);
    }, handleError);

    const unsubUsers = subscribeToUsers((users) => {
      if (users && users.length > 0) {
        setAppState((prev) => ({ ...prev, users }));
      }
      setFirebaseConnected(true);
      setFirebaseError(null);
    }, handleError);

    return () => {
      unsubChambers();
      unsubFarmers();
      unsubInwards();
      unsubOutwards();
      unsubUsers();
    };
  }, []);

  const handleLoginSuccess = (email: string) => {
    setCurrentUser(email);
    setAuthUser(email);
  };

  const handleLogout = () => {
    logoutFirebase();
    setCurrentUser(null);
    setAuthUser(null);
  };

  const handleResetPassword = (email: string, newPassword: string) => {
    if (email.toLowerCase() === appState.adminEmail.toLowerCase()) {
      setAppState((prev) => ({
        ...prev,
        adminPasswordHash: newPassword,
      }));
    } else {
      setAppState((prev) => ({
        ...prev,
        users: (prev.users || []).map((u) =>
          u.email.toLowerCase() === email.toLowerCase() ? { ...u, password: newPassword } : u
        ),
      }));
    }
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'hi' ? 'en' : 'hi'));
  };

  // Add new friend / staff user access (synced to Firestore!)
  const handleAddUser = (userData: Omit<UserAccount, 'id' | 'createdAt'>) => {
    const newUser: UserAccount = {
      ...userData,
      id: `USR-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setAppState((prev) => ({
      ...prev,
      users: [newUser, ...(prev.users || [])],
    }));
    saveUserToFirestore(newUser);
    showToast(
      language === 'hi'
        ? `उपयोगकर्ता ${newUser.name} को क्लाउड पर जोड़ दिया गया है`
        : `User ${newUser.name} synced to Cloud`,
      'success'
    );
  };

  // Remove friend access (deleted from Firestore!)
  const handleRemoveUser = (userId: string) => {
    setAppState((prev) => ({
      ...prev,
      users: (prev.users || []).filter((u) => u.id !== userId),
    }));
    deleteUserFromFirestore(userId);
  };

  // Import full AppState
  const handleImportAppState = (newState: AppState) => {
    setAppState(newState);
  };

  // Add new farmer (saves to state and Cloud Firestore)
  const handleAddFarmer = async (farmerData: Omit<Farmer, 'id' | 'createdAt'>) => {
    const newFarmer: Farmer = {
      ...farmerData,
      id: `FRM-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAppState((prev) => ({
      ...prev,
      farmers: [newFarmer, ...prev.farmers],
    }));

    // Persist to Cloud Firestore
    const res = await saveFarmerToFirestore(newFarmer);
    if (!res.success) {
      setFirebaseError(
        language === 'hi'
          ? `फ़ायरबेस पर सिंक नहीं हुआ: ${res.error}`
          : `Firestore write failed: ${res.error}`
      );
      showToast(
        language === 'hi'
          ? '⚠ क्लाउड सिंक नहीं हुआ! Firebase Console में Rules चेक करें।'
          : '⚠ Cloud sync failed! Check Firestore Rules.',
        'error'
      );
    } else {
      setFirebaseError(null);
      showToast(
        language === 'hi'
          ? '✔ किसान सफलतापूर्वक क्लाउड पर सेव हो गया (सभी डिवाइसों पर लाइव)'
          : '✔ Farmer saved to Cloud (Live on all devices)',
        'success'
      );
    }
  };

  // Save Potato Inward Batch (saves to state and Cloud Firestore)
  const handleSaveInwardBatch = (entriesData: Omit<InwardEntry, 'id' | 'createdAt'>[]): InwardEntry[] => {
    const timestamp = Date.now();
    const newEntries: InwardEntry[] = entriesData.map((ed, idx) => ({
      ...ed,
      id: `INW-${timestamp}-${idx + 1}`,
      createdAt: new Date().toISOString(),
    }));

    // Calculate bag addition per chamber
    const additions: Record<string, number> = {};
    newEntries.forEach((e) => {
      additions[e.chamberId] = (additions[e.chamberId] || 0) + e.bagCount;
    });

    const updatedChambers = appState.chambers.map((ch) => {
      if (additions[ch.id]) {
        return {
          ...ch,
          currentBags: Math.min(ch.totalCapacity, ch.currentBags + additions[ch.id]),
        };
      }
      return ch;
    });

    setAppState((prev) => ({
      ...prev,
      inwards: [...newEntries, ...prev.inwards],
      chambers: updatedChambers,
    }));

    // Persist batch to Cloud Firestore
    saveInwardBatchToFirestore(newEntries, updatedChambers).then((res) => {
      if (!res.success) {
        setFirebaseError(`Inward sync error: ${res.error}`);
        showToast(
          language === 'hi'
            ? '⚠ आवक क्लाउड पर सिंक नहीं हुई!'
            : '⚠ Inward batch not synced to cloud!',
          'error'
        );
      } else {
        setFirebaseError(null);
        showToast(
          language === 'hi'
            ? '✔ आवक लॉट क्लाउड पर सेव हुई (सभी डिवाइसों पर अपडेट)'
            : '✔ Inward batch synced to Cloud',
          'success'
        );
      }
    });

    return newEntries;
  };

  // Save Potato Inward (single)
  const handleSaveInward = (entryData: Omit<InwardEntry, 'id' | 'createdAt'>): InwardEntry => {
    return handleSaveInwardBatch([entryData])[0];
  };

  // Save Potato Outward (saves to state and Cloud Firestore)
  const handleSaveOutward = (entryData: Omit<OutwardEntry, 'id' | 'createdAt'>): OutwardEntry => {
    const newOutward: OutwardEntry = {
      ...entryData,
      id: `OUT-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    let updatedInward: InwardEntry | undefined;
    const updatedInwards = appState.inwards.map((inw) => {
      if (inw.id === newOutward.inwardEntryId) {
        const newRemaining = Math.max(0, inw.remainingBags - newOutward.bagsOut);
        updatedInward = {
          ...inw,
          remainingBags: newRemaining,
        };
        return updatedInward;
      }
      return inw;
    });

    let updatedChamber: Chamber | undefined;
    const updatedChambers = appState.chambers.map((ch) => {
      if (ch.id === newOutward.chamberId) {
        updatedChamber = {
          ...ch,
          currentBags: Math.max(0, ch.currentBags - newOutward.bagsOut),
        };
        return updatedChamber;
      }
      return ch;
    });

    setAppState((prev) => ({
      ...prev,
      outwards: [newOutward, ...prev.outwards],
      inwards: updatedInwards,
      chambers: updatedChambers,
    }));

    // Persist to Cloud Firestore
    saveOutwardToFirestore(newOutward, updatedInward, updatedChamber).then((res) => {
      if (!res.success) {
        setFirebaseError(`Outward sync error: ${res.error}`);
        showToast(
          language === 'hi'
            ? '⚠ जावक क्लाउड पर सिंक नहीं हुई!'
            : '⚠ Outward not synced to cloud!',
          'error'
        );
      } else {
        setFirebaseError(null);
        showToast(
          language === 'hi'
            ? '✔ जावक / गेट पास क्लाउड पर सेव हुआ'
            : '✔ Outward gate pass synced to Cloud',
          'success'
        );
      }
    });

    return newOutward;
  };

  // Quick navigation handlers from Farmers table
  const handleSelectFarmerForInward = (farmer: Farmer) => {
    setContextFarmer(farmer);
    setActiveTab('potatoIn');
  };

  const handleSelectFarmerForOutward = (farmer: Farmer) => {
    setContextFarmer(farmer);
    setActiveTab('potatoOut');
  };

  // If user is not logged in, show Login Screen
  if (!currentUser) {
    return (
      <LoginModal
        language={language}
        onLoginSuccess={handleLoginSuccess}
        adminEmail={appState.adminEmail}
        adminPasswordHash={appState.adminPasswordHash}
        users={appState.users || []}
        onResetPassword={handleResetPassword}
        onToggleLanguage={handleToggleLanguage}
      />
    );
  }

  const totalCapacity = appState.chambers.reduce((acc, c) => acc + c.totalCapacity, 0);
  const currentBags = appState.chambers.reduce((acc, c) => acc + c.currentBags, 0);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-amber-200">
      {/* Top Navbar with Firebase Live Status */}
      <Navbar
        language={language}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'potatoIn' && tab !== 'potatoOut') {
            setContextFarmer(null);
          }
        }}
        onToggleLanguage={handleToggleLanguage}
        onLogout={handleLogout}
        totalCapacity={totalCapacity}
        currentBags={currentBags}
        currentUserEmail={currentUser}
        firebaseConnected={firebaseConnected}
        onSyncAll={handleManualSync}
        isSyncing={isSyncing}
      />

      {/* Sync Status Banner / Alert */}
      {firebaseError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>⚠</span>
            <span className="font-semibold">{firebaseError}</span>
          </div>
          <button
            onClick={handleManualSync}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1 rounded"
          >
            {language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
          </button>
        </div>
      )}

      {/* Real-time Toast Notification */}
      {syncToast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-2 border ${
              syncToast.type === 'success'
                ? 'bg-emerald-800 text-white border-emerald-600'
                : syncToast.type === 'error'
                ? 'bg-rose-800 text-white border-rose-600'
                : 'bg-slate-800 text-white border-slate-600'
            }`}
          >
            <span>{syncToast.type === 'success' ? '✔' : syncToast.type === 'error' ? '❌' : 'ℹ'}</span>
            <span>{syncToast.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            language={language}
            chambers={appState.chambers}
            farmers={appState.farmers}
            inwards={appState.inwards}
            outwards={appState.outwards}
            setActiveTab={setActiveTab}
            onOpenInwardInvoice={(inw) => setActiveInwardInvoice(inw)}
            onOpenOutwardGatePass={(out) => setActiveOutwardGatePass(out)}
          />
        )}

        {activeTab === 'farmers' && (
          <FarmerManager
            language={language}
            farmers={appState.farmers}
            inwards={appState.inwards}
            outwards={appState.outwards}
            onAddFarmer={handleAddFarmer}
            onSelectFarmerForInward={handleSelectFarmerForInward}
            onSelectFarmerForOutward={handleSelectFarmerForOutward}
          />
        )}

        {activeTab === 'potatoIn' && (
          <PotatoInView
            language={language}
            farmers={appState.farmers}
            chambers={appState.chambers}
            inwards={appState.inwards}
            initialFarmer={contextFarmer}
            onSaveInward={handleSaveInward}
            onSaveInwardBatch={handleSaveInwardBatch}
            onOpenInvoiceModal={(inw, batch) => {
              setActiveInwardInvoice(inw);
              setActiveInwardBatch(batch && batch.length > 0 ? batch : [inw]);
            }}
          />
        )}

        {activeTab === 'potatoOut' && (
          <PotatoOutView
            language={language}
            farmers={appState.farmers}
            chambers={appState.chambers}
            inwards={appState.inwards}
            initialFarmer={contextFarmer}
            onSaveOutward={handleSaveOutward}
            onOpenGatePassModal={(out) => setActiveOutwardGatePass(out)}
          />
        )}

        {activeTab === 'chambers' && (
          <ChamberView
            language={language}
            chambers={appState.chambers}
            inwards={appState.inwards}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            language={language}
            inwards={appState.inwards}
            outwards={appState.outwards}
            farmers={appState.farmers}
            chambers={appState.chambers}
            onOpenInwardInvoice={(inw) => setActiveInwardInvoice(inw)}
            onOpenOutwardGatePass={(out) => setActiveOutwardGatePass(out)}
          />
        )}

        {activeTab === 'friends' && (
          <FriendsAccessView
            language={language}
            users={appState.users || []}
            adminEmail={appState.adminEmail}
            adminPasswordHash={appState.adminPasswordHash}
            onAddUser={handleAddUser}
            onRemoveUser={handleRemoveUser}
            appState={appState}
            onImportAppState={handleImportAppState}
          />
        )}
      </main>

      {/* Printable Invoice / Gate Pass Modal */}
      {(activeInwardInvoice || activeOutwardGatePass) && (
        <InvoiceModal
          language={language}
          inwardEntry={activeInwardInvoice}
          inwardEntries={activeInwardBatch}
          outwardEntry={activeOutwardGatePass}
          onClose={() => {
            setActiveInwardInvoice(null);
            setActiveInwardBatch([]);
            setActiveOutwardGatePass(null);
          }}
        />
      )}
    </div>
  );
}
