import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authStore } from '@/services/adminService';

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // If user is already authenticated, redirect to /admin/dashboard
  useEffect(() => {
    let isMounted = true;
    authStore.me().then((user) => {
      if (isMounted) {
        if (user) {
          const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin/dashboard';
          navigate(from, { replace: true });
        }
        setCheckingSession(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('admin.login.requiredFields', 'Please enter both email and password.'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authStore.login(email, password);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('admin.login.invalidCredentials', 'Invalid email or password. Please try again.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600"></div>
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {t('admin.login.checkingSession', 'Verifying session...')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Bar for Back & Language switch */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold transition-all shadow-sm"
        >
          {i18n.language === 'en' ? 'हिन्दी' : 'English'}
        </button>
        <Link
          to="/"
          className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold transition-all shadow-sm flex items-center gap-1 text-gray-700 dark:text-gray-300"
        >
          &larr; {t('admin.nav.backToSite', 'Back to Public Site')}
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-2 text-2xl font-black text-primary-600 dark:text-primary-400 tracking-wider">
            <span>🚀</span> Tools4Genz
          </Link>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-gray-900 dark:text-white">
          {t('admin.login.title', 'Sign in to Admin Dashboard')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('admin.login.subtitle', 'Protected administration panel for Tools4Genz operators.')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-xl shadow-gray-200/50 dark:shadow-none sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-800">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-3">
              <span className="text-red-600 dark:text-red-400 text-lg leading-none">⚠️</span>
              <div className="text-xs font-semibold text-red-700 dark:text-red-300 flex-1">
                {error}
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2"
              >
                {t('admin.login.emailLabel', 'Email Address')}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tools4genz.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2"
              >
                {t('admin.login.passwordLabel', 'Password')}
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>{t('admin.login.signingIn', 'Signing In...')}</span>
                  </>
                ) : (
                  <>
                    <span>🔒</span>
                    <span>{t('admin.login.submitButton', 'Sign In to Dashboard')}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
              <span>🛡️ {t('admin.login.securityNote', 'Session secured with HttpOnly cookies and Cloudflare D1 verification.')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
