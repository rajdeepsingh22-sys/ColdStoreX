import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Copy,
  CheckCircle2,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Share2,
  Download,
  Upload,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Lock,
  Mail,
  Phone,
  User,
  AlertCircle,
} from 'lucide-react';
import { translations } from '../translations';
import { Language, UserAccount, AppState } from '../types';

interface FriendsAccessViewProps {
  language: Language;
  users: UserAccount[];
  adminEmail: string;
  adminPasswordHash: string;
  onAddUser: (user: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  onRemoveUser: (userId: string) => void;
  appState: AppState;
  onImportAppState: (newState: AppState) => void;
}

export const FriendsAccessView: React.FC<FriendsAccessViewProps> = ({
  language,
  users,
  adminEmail,
  adminPasswordHash,
  onAddUser,
  onRemoveUser,
  appState,
  onImportAppState,
}) => {
  const t = translations[language];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'FULL_ACCESS' | 'MANAGER'>('FULL_ACCESS');
  const [showPassword, setShowPassword] = useState(true);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Current app URL
  const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-72ofapa3qmp7kc3oceoetu-29148358877.asia-southeast1.run.app';

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError(language === 'hi' ? 'कृपया मित्र का नाम दर्ज करें।' : 'Please enter friend name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError(language === 'hi' ? 'कृपया सही ईमेल आईडी दर्ज करें।' : 'Please enter valid email.');
      return;
    }
    if (!password.trim() || password.length < 4) {
      setFormError(language === 'hi' ? 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।' : 'Password must be at least 4 characters.');
      return;
    }

    // Check duplicate email
    if (
      email.trim().toLowerCase() === adminEmail.toLowerCase() ||
      users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    ) {
      setFormError(language === 'hi' ? 'यह ईमेल पहले से पंजीकृत है।' : 'This email is already registered.');
      return;
    }

    onAddUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      password: password.trim(),
      role,
      isActive: true,
    });

    setToastMessage(language === 'hi' ? 'मित्र को सफलतापूर्वक पूरा एक्सेस दे दिया गया है!' : 'Access granted to friend successfully!');
    setIsAddModalOpen(false);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setTimeout(() => setToastMessage(''), 4000);
  };

  const generateInviteText = (uName: string, uEmail: string, uPass: string, uRole: string) => {
    const roleText = uRole === 'FULL_ACCESS' || uRole === 'OWNER'
      ? (language === 'hi' ? 'पूर्ण अधिकार (समस्त नियंत्रण)' : 'Full Access (Complete Control)')
      : (language === 'hi' ? 'मैनेजर (कार्य संचालन)' : 'Manager (Operations)');

    if (language === 'hi') {
      return (
        `🥔 ColdStorageX ऐप लॉगिन विवरण 🥔\n\n` +
        `नमस्ते ${uName},\n` +
        `आपको ColdStorageX कोल्ड स्टोरेज ऐप का पूरा एक्सेस दिया गया है।\n\n` +
        `🔗 ऐप लिंक: ${appUrl}\n` +
        `📧 ईमेल: ${uEmail}\n` +
        `🔑 पासवर्ड: ${uPass}\n` +
        `🛡️ अधिकार: ${roleText}\n\n` +
        `कृपया लिंक खोलकर ऊपर दिए गए ईमेल व पासवर्ड से लॉगिन करें।`
      );
    } else {
      return (
        `🥔 ColdStorageX App Login Details 🥔\n\n` +
        `Hello ${uName},\n` +
        `You have been granted access to ColdStorageX management app.\n\n` +
        `🔗 App Link: ${appUrl}\n` +
        `📧 Email: ${uEmail}\n` +
        `🔑 Password: ${uPass}\n` +
        `🛡️ Role: ${roleText}\n\n` +
        `Please open the link and sign in using the email and password above.`
      );
    }
  };

  const handleCopyInvite = (user: UserAccount) => {
    const text = generateInviteText(user.name, user.email, user.password, user.role);
    navigator.clipboard.writeText(text);
    setCopiedUserId(user.id);
    setToastMessage(t.inviteCopied);
    setTimeout(() => {
      setCopiedUserId(null);
      setToastMessage('');
    }, 4000);
  };

  const handleCopyAdminInvite = () => {
    const text = generateInviteText(
      language === 'hi' ? 'एडमिन / पार्टनर' : 'Admin / Partner',
      adminEmail,
      adminPasswordHash,
      'FULL_ACCESS'
    );
    navigator.clipboard.writeText(text);
    setCopiedUserId('admin');
    setToastMessage(t.inviteCopied);
    setTimeout(() => {
      setCopiedUserId(null);
      setToastMessage('');
    }, 4000);
  };

  // Export full JSON database
  const handleExportFullBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ColdStorageX_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setToastMessage(language === 'hi' ? 'बैकअप फाइल सफलतापूर्वक डाउनलोड हो गई!' : 'Backup file downloaded successfully!');
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Import full JSON database
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.farmers) && Array.isArray(parsed.chambers)) {
            onImportAppState(parsed);
            setToastMessage(t.syncSuccess);
            setTimeout(() => setToastMessage(''), 4000);
          } else {
            alert(language === 'hi' ? 'अमान्य बैकअप फाइल!' : 'Invalid backup file format!');
          }
        } catch {
          alert(language === 'hi' ? 'फाइल पढ़ने में त्रुटि हुई।' : 'Error parsing JSON file.');
        }
      };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-amber-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>{language === 'hi' ? 'बहु-उपयोगकर्ता व मित्र पहुंच' : 'Multi-User & Friend Access'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            {t.friendsAccessTitle}
          </h1>
          <p className="text-amber-200 text-xs sm:text-sm mt-1 max-w-2xl">
            {t.friendsAccessSubtitle}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-3 rounded-xl shadow-lg transition text-sm cursor-pointer whitespace-nowrap"
        >
          <UserPlus className="w-5 h-5 text-emerald-200" />
          <span>{t.addFriendBtn}</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-900 text-sm font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Users List */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-700" />
              <span>{language === 'hi' ? 'सक्रिय अधिकृत सदस्य व मित्र (Authorized Users)' : 'Active Authorized Users & Friends'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'hi'
                ? 'ये सभी सदस्य अपने ईमेल व पासवर्ड से सीधे ऐप में लॉगिन कर सकते हैं'
                : 'These users can directly log into the application with their credentials'}
            </p>
          </div>
          <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300 w-fit">
            {1 + users.length} {language === 'hi' ? 'सदस्यों के पास एक्सेस' : 'Users with Access'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Master Admin Card */}
          <div className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50/60 shadow-xs relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-sm">
                    👑
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>{language === 'hi' ? 'मुख्य व्यवस्थापक' : 'Master Admin'}</span>
                      <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded">
                        {language === 'hi' ? 'मालिक' : 'Owner'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">{adminEmail}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  {language === 'hi' ? 'सक्रिय' : 'Active'}
                </span>
              </div>

              <div className="mt-3 p-2.5 bg-white rounded-lg border border-amber-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{language === 'hi' ? 'पासवर्ड:' : 'Password:'}</span>
                  <span className="font-mono font-bold text-slate-800">
                    {visiblePasswords['admin'] ? adminPasswordHash : '••••••••'}
                  </span>
                  <button
                    onClick={() => togglePasswordVisibility('admin')}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    {visiblePasswords['admin'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500">{language === 'hi' ? 'अधिकार:' : 'Role:'}</span>
                  <strong className="text-emerald-700">{t.roleFullAccess}</strong>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 flex items-center gap-2">
              <button
                onClick={handleCopyAdminInvite}
                className="flex-1 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>
                  {copiedUserId === 'admin'
                    ? (language === 'hi' ? 'कॉपी हो गया!' : 'Copied!')
                    : (language === 'hi' ? 'लॉगिन विवरण कॉपी करें' : 'Copy Login Details')}
                </span>
              </button>
            </div>
          </div>

          {/* Friends Accounts Cards */}
          {users.map((user) => (
            <div
              key={user.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-amber-400 transition shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span>{user.name}</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded">
                          {user.role === 'FULL_ACCESS'
                            ? (language === 'hi' ? 'पूर्ण अधिकार' : 'Full Access')
                            : (language === 'hi' ? 'मैनेजर' : 'Manager')}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    {language === 'hi' ? 'सक्रिय' : 'Active'}
                  </span>
                </div>

                <div className="mt-3 p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                  {user.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{language === 'hi' ? 'मोबाइल:' : 'Mobile:'}</span>
                      <span className="font-mono text-slate-800">{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{language === 'hi' ? 'पासवर्ड:' : 'Password:'}</span>
                    <span className="font-mono font-bold text-slate-800">
                      {visiblePasswords[user.id] ? user.password : '••••••••'}
                    </span>
                    <button
                      onClick={() => togglePasswordVisibility(user.id)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      {visiblePasswords[user.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 flex items-center gap-2">
                <button
                  onClick={() => handleCopyInvite(user)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {copiedUserId === user.id
                      ? (language === 'hi' ? 'कॉपी हो गया!' : 'Copied!')
                      : (language === 'hi' ? 'WhatsApp विवरण कॉपी' : 'Copy WhatsApp Text')}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(t.removeAccessConfirm)) {
                      onRemoveUser(user.id);
                    }
                  }}
                  className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs transition cursor-pointer"
                  title={language === 'hi' ? 'एक्सेस हटाएं' : 'Remove Access'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-center text-xs text-amber-900">
            <p className="font-semibold">{t.noFriendsAdded}</p>
            <p className="text-[11px] text-amber-800 mt-1">
              {language === 'hi'
                ? 'आप अपने पार्टनर, मुंशी, या दोस्तों को जोड़ सकते हैं ताकि वे भी अपने फोन या लैपटॉप पर पूरा कोल्ड स्टोरेज संभाल सकें।'
                : 'You can add your partners, managers, or colleagues so they can manage cold storage operations directly.'}
            </p>
          </div>
        )}
      </div>

      {/* Shareable App Link Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="w-5 h-5 text-amber-700" />
          <h2 className="text-lg font-black text-slate-900">
            {language === 'hi' ? 'मित्रों के साथ शेयर करने हेतु ऐप लिंक' : 'Direct Shareable App Link'}
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {language === 'hi'
            ? 'इस लिंक को कॉपी करके अपने मित्रों को भेजें। वे इस लिंक को किसी भी ब्राउज़र में खोलकर लॉगिन कर सकेंगे।'
            : 'Copy and share this web link with your friends to access the application on any device.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-300">
          <input
            type="text"
            readOnly
            value={appUrl}
            className="w-full bg-transparent text-xs sm:text-sm font-mono text-slate-800 px-2 focus:outline-none"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(appUrl);
              setToastMessage(language === 'hi' ? 'ऐप लिंक कॉपी हो गया!' : 'App link copied to clipboard!');
              setTimeout(() => setToastMessage(''), 3000);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'लिंक कॉपी करें' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Data Share & Sync (Backup & Restore) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <Download className="w-5 h-5 text-blue-700" />
          <h2 className="text-lg font-black text-slate-900">{t.dataSyncTitle}</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">{t.dataSyncDesc}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1">
                {language === 'hi' ? '1. समस्त डेटा डाउनलोड करें' : '1. Download All Data'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'hi'
                  ? 'सभी किसान, आवक-निकासी व चेंबर का संपूर्ण डेटा फाइल के रूप में सेव करें।'
                  : 'Save all farmers, entries, and settings as a portable backup file.'}
              </p>
            </div>
            <button
              onClick={handleExportFullBackup}
              className="mt-4 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>{t.downloadBackup}</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-1">
                {language === 'hi' ? '2. मित्र से मिली फाइल लोड करें' : '2. Load File from Friend'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'hi'
                  ? 'यदि आपके मित्र ने नए किसान या आलू एंट्री की है, तो उनकी फाइल अपलोड करके तुरंत सिंक करें।'
                  : 'Import the JSON file shared by your friend to sync all entries.'}
              </p>
            </div>
            <label className="mt-4 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4 text-emerald-200" />
              <span>{t.uploadBackup}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Add Friend Access Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-amber-800 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-base sm:text-lg">{t.addNewFriendTitle}</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-amber-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.friendName} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'hi' ? 'उदा. राहुल सिंह' : 'e.g. Rahul Singh'}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.friendEmail} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === 'hi' ? 'उदा. rahul@example.com' : 'e.g. rahul@example.com'}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.friendPhone} {language === 'hi' ? '(वैकल्पिक)' : '(Optional)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={language === 'hi' ? 'मोबाइल नंबर' : 'Mobile number'}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.friendPassword} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={language === 'hi' ? 'कम से कम 4 अक्षर' : 'At least 4 characters'}
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.roleLabel} *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="FULL_ACCESS">{t.roleFullAccess}</option>
                  <option value="MANAGER">{t.roleManager}</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow cursor-pointer"
                >
                  {t.saveFriendAccess}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
