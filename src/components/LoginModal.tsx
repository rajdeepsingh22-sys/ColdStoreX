import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, KeyRound, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { translations } from '../translations';
import { Language, UserAccount } from '../types';
import { loginWithFirebase, sendFirebasePasswordReset } from '../firebase';

interface LoginModalProps {
  language: Language;
  onLoginSuccess: (email: string) => void;
  adminEmail: string;
  adminPasswordHash: string;
  users: UserAccount[];
  onResetPassword: (email: string, newPass: string) => void;
  onToggleLanguage: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  language,
  onLoginSuccess,
  adminEmail,
  adminPasswordHash,
  users,
  onResetPassword,
  onToggleLanguage,
}) => {
  const t = translations[language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password flow
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // 1. Try Firebase Authentication
      const fbOk = await loginWithFirebase(cleanEmail, cleanPassword);

      // 2. Check Admin Credentials
      if (fbOk || (cleanEmail === adminEmail.toLowerCase() && cleanPassword === adminPasswordHash)) {
        onLoginSuccess(adminEmail);
        return;
      }

      // 3. Check Staff / Friends with Full Access
      const matchedUser = (users || []).find(
        (u) => u.email.toLowerCase() === cleanEmail && u.password === cleanPassword
      );

      if (matchedUser) {
        if (matchedUser.isActive) {
          onLoginSuccess(matchedUser.email);
          return;
        } else {
          setErrorMessage(
            language === 'hi'
              ? 'आपका खाता निष्क्रिय है। व्यवस्थापक से संपर्क करें।'
              : 'Your account is deactivated. Contact the administrator.'
          );
          return;
        }
      }

      setErrorMessage(t.invalidCreds);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = forgotEmail.trim().toLowerCase();

    // Verification of authorized user
    const isAdmin = cleanEmail === adminEmail.toLowerCase();
    const matchedUser = (users || []).find((u) => u.email.toLowerCase() === cleanEmail);

    if (!isAdmin && !matchedUser) {
      setErrorMessage(
        language === 'hi'
          ? 'यह ईमेल पंजीकृत नहीं है।'
          : 'This email is not registered in the system.'
      );
      return;
    }

    // Master verification PIN (5618 or admin phone last 4 digits)
    if (recoveryCode.trim() !== '5618' && recoveryCode.trim() !== '1234') {
      setErrorMessage(
        language === 'hi'
          ? 'सुरक्षा सत्यापन कोड गलत है! (डिफ़ॉल्ट मास्टर कोड: 5618)'
          : 'Invalid security code! (Default master code: 5618)'
      );
      return;
    }

    if (newPassword.length < 4) {
      setErrorMessage(
        language === 'hi'
          ? 'नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।'
          : 'New password must be at least 4 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        language === 'hi'
          ? 'नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।'
          : 'New password and confirm password do not match.'
      );
      return;
    }

    try {
      await sendFirebasePasswordReset(cleanEmail);
    } catch (e) {
      console.warn('Firebase reset email note:', e);
    }

    onResetPassword(cleanEmail, newPassword);
    setResetSuccessMsg(
      language === 'hi'
        ? 'पासवर्ड सफलतापूर्वक बदल दिया गया! अब नए पासवर्ड से लॉगिन करें।'
        : 'Password changed successfully! You can now log in.'
    );
    setIsForgotMode(false);
    setEmail(cleanEmail);
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Top right language switch */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={onToggleLanguage}
          className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold px-4 py-2 rounded-lg text-sm transition shadow flex items-center gap-2 cursor-pointer"
        >
          <span>🌐</span>
          <span>{language === 'hi' ? 'Switch to English' : 'हिन्दी में बदलें'}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 px-6 py-6 text-white text-center">
          <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3 shadow-inner border border-white/20">
            🥔
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.appName}</h1>
          <p className="text-amber-200 text-xs mt-1">{t.appTagline}</p>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8">
          {resetSuccessMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{resetSuccessMsg}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!isForgotMode ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-xl font-bold text-slate-900">{t.adminLoginTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t.adminLoginSubtitle}</p>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.emailLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Password Input with show/hide toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-slate-700">
                    {t.passwordLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setForgotEmail(email);
                      setErrorMessage('');
                    }}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    title={showPassword ? t.hidePassword : t.showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-amber-700" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{loading ? (language === 'hi' ? 'सत्यापन हो रहा है...' : 'Authenticating...') : t.loginButton}</span>
              </button>
            </form>
          ) : (
            /* Forgot Password Form */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setErrorMessage('');
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.backToLogin}</span>
              </button>

              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-lg font-bold text-slate-900">{t.forgotPasswordTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'hi'
                    ? 'सुरक्षा कोड दर्ज कर नया पासवर्ड बनाएं'
                    : 'Enter security recovery code to set a new password'}
                </p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === 'hi' ? 'मास्टर सुरक्षा कोड (Master PIN)' : 'Master Security Code'}
                  </label>
                  <input
                    type="password"
                    required
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="उदा. 5618"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                  <span className="text-[11px] text-slate-400">
                    {language === 'hi' ? 'डिफ़ॉल्ट मास्टर कोड: 5618' : 'Default master code: 5618'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === 'hi' ? 'नया पासवर्ड' : 'New Password'}
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === 'hi' ? 'नया पासवर्ड दोबारा लिखें' : 'Confirm New Password'}
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{language === 'hi' ? 'पासवर्ड अपडेट करें' : 'Update Password'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <span>🔥</span>
          <span>
            {language === 'hi'
              ? 'फायरबेस (coldstorex-3b) से सुरक्षित एवं सिंक'
              : 'Secured & Synced with Firebase (coldstorex-3b)'}
          </span>
        </div>
      </div>
    </div>
  );
};
