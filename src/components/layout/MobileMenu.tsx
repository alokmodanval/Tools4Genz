import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { getSiteSearchDestination } from '@/utils/siteSearch';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

export interface NavLinkItem {
  to: string;
  label: string;
  default: string;
}

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: NavLinkItem[];
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, navLinks }) => {
  const { t } = useTranslation();
  const { toggleTheme } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { enabled: customerLoginEnabled, user, logout } = useCustomerAuth();
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const destination = getSiteSearchDestination(searchQuery);
    if (destination) {
      navigate(destination);
      onClose();
    }
  };
  
  const toggleLanguage = () => {
    changeLanguage(language.startsWith('hi') ? 'en' : 'hi');
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div 
        className="fixed inset-0 bg-surface-900/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-surface-900 shadow-xl overflow-y-auto transform transition-transform duration-300 ease-in-out px-6 py-6 sm:px-8">
        <div className="flex items-center justify-between mb-8">
          <span className="text-xl font-bold tracking-tight text-surface-900 dark:text-white">
            Tools<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-500">4G</span>enz
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <span className="sr-only">Close menu</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <form onSubmit={submitSearch} role="search" className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-surface-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Search tools and projects"
              placeholder={t('nav.search', 'Search...')}
              className="w-full pl-10 pr-4 py-2 text-base bg-surface-100 border-transparent rounded-lg focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:bg-surface-800 dark:focus:bg-surface-950 dark:text-surface-200 outline-none transition-all"
            />
          </form>
        </div>

        <nav className="flex flex-col gap-2 mb-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) => 
                `block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' 
                    : 'text-surface-700 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-white'
                }`
              }
            >
              {t(link.label, link.default)}
            </NavLink>
          ))}
        </nav>
        {customerLoginEnabled && <div className="mb-6 border-t border-surface-200 pt-5 dark:border-surface-800">
          {user ? <div className="space-y-2"><p className="truncate px-2 text-xs text-surface-500">{user.email}</p><NavLink to="/my-purchases" onClick={onClose} className="block rounded-lg px-4 py-3 font-semibold text-surface-700 dark:text-surface-200">My Purchases</NavLink><button onClick={() => { void logout(); onClose(); }} className="w-full rounded-lg px-4 py-3 text-left font-semibold text-red-600 dark:text-red-400">Logout</button></div> : <NavLink to="/login" onClick={onClose} className="block rounded-xl bg-primary-600 px-4 py-3 text-center font-bold text-white">Customer Login</NavLink>}
        </div>}
        
        <div className="border-t border-surface-200 dark:border-surface-800 pt-6">
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-4 px-2">Settings</p>
          <div className="flex gap-4 px-2">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white font-medium text-sm"
            >
              <svg className="w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('settings.language', 'Language')}
            </button>
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-2 text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white font-medium text-sm"
            >
              <svg className="w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              {t('settings.theme', 'Theme')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
