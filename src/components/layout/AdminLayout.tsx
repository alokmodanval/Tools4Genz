import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const AdminLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/admin/dashboard', label: t('admin.nav.dashboard', 'Dashboard'), icon: '📊' },
    { path: '/admin/tools', label: t('admin.nav.tools', 'Manage Tools'), icon: '🛠️' },
    { path: '/admin/projects', label: t('admin.nav.projects', 'Manage Projects'), icon: '📦' },
    { path: '/admin/services', label: t('admin.nav.services', 'Manage Services'), icon: '💼' },
    { path: '/admin/categories', label: t('admin.nav.categories', 'Manage Categories'), icon: '📁' },
    { path: '/admin/requests', label: t('admin.nav.requests', 'Manage Requests'), icon: '📥' },
    { path: '/admin/settings', label: t('admin.nav.settings', 'Settings'), icon: '⚙️' },
  ];

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex text-gray-800 dark:text-gray-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="text-xl font-black tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-2">
            <span>🚀</span> Tools4Genz <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-mono">ADMIN</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive
                    ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/40'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                  }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Link to="/" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold transition-all">
            &larr; {t('admin.nav.backToSite', 'Back to Public Site')}
          </Link>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-gray-900/60 backdrop-blur-sm">
          <aside className="w-64 bg-white dark:bg-gray-800 h-full flex flex-col border-r border-gray-200 dark:border-gray-700">
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
              <span className="text-lg font-black text-primary-600 dark:text-primary-400">Tools4Genz Admin</span>
              <button onClick={() => setSidebarOpen(false)} className="text-xl p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto" onClick={() => setSidebarOpen(false)}>
              {menuItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive
                        ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/40'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                      }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Link to="/" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-semibold">
                &larr; {t('admin.nav.backToSite', 'Back to Public Site')}
              </Link>
            </div>
          </aside>
          <div className="flex-1" onClick={() => setSidebarOpen(false)}></div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ☰
            </button>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 hidden sm:block">
              {'Admin > '}
              {location.pathname.split('/').filter(Boolean).slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' > ')}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Lang switch */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold transition-all"
            >
              {i18n.language === 'en' ? 'हिन्दी' : 'English'}
            </button>
            {/* Profile badge (mock placeholder) */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center text-sm">
                A
              </div>
              <span className="text-sm font-bold hidden md:inline">Operator</span>
            </div>
          </div>
        </header>

        {/* Security boundary indicator */}
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200/50 dark:border-yellow-900/30 px-6 py-2 text-xs font-semibold text-yellow-800 dark:text-yellow-400 flex items-center justify-between">
          <span>🔒 Platform Admin Boundary — Session Mock Storage Enabled. (Auth & IAM transition in Phase 7)</span>
        </div>

        {/* Page Content View */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50 dark:bg-gray-900/40">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
