import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MobileMenu from './MobileMenu';
import Container from './Container';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { getSiteSearchDestination } from '@/utils/siteSearch';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { enabled: customerLoginEnabled, user, logout } = useCustomerAuth();
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const destination = getSiteSearchDestination(searchQuery);
    if (destination) navigate(destination);
  };
  
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const { language, changeLanguage } = useLanguage();
  const toggleLanguage = () => {
    changeLanguage(language.startsWith('hi') ? 'en' : 'hi');
  };
  
  const navLinks = [
    { to: '/', label: 'nav.home', default: 'Home' },
    { to: '/tools', label: 'nav.tools', default: 'Tools' },
    { to: '/projects', label: 'nav.projects', default: 'Projects' },
    { to: '/services', label: 'nav.services', default: 'Services' },
    { to: '/students', label: 'nav.students', default: 'Students' },
    { to: '/clients', label: 'nav.clients', default: 'Clients' },
    { to: '/my-purchases', label: 'nav.myPurchases', default: 'My Purchases' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 lg:border-b lg:border-surface-900/10 dark:border-surface-50/[0.06] bg-white/95 dark:bg-surface-900/95 supports-backdrop-blur:bg-white/60 dark:supports-backdrop-blur:bg-surface-900/60">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <NavLink to="/" className="flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 rounded-md">
                <span className="text-xl font-bold tracking-tight text-surface-900 dark:text-white">
                  Tools<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-500">4G</span>enz
                </span>
              </NavLink>
              
              <nav className="hidden lg:flex items-center gap-1 ml-4">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => 
                      `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-surface-100 text-primary-600 dark:bg-surface-800 dark:text-primary-400' 
                          : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50 dark:text-surface-300 dark:hover:text-white dark:hover:bg-surface-800'
                      }`
                    }
                  >
                    {t(link.label, link.default)}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <form onSubmit={submitSearch} role="search" className="hidden md:flex relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-surface-400 dark:text-surface-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Search tools and projects"
                  placeholder={t('nav.search', 'Search...')}
                  className="w-48 lg:w-64 pl-10 pr-4 py-1.5 text-sm bg-surface-100 border-transparent rounded-full focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:bg-surface-800 dark:focus:bg-surface-900 dark:text-surface-200 transition-all outline-none"
                />
              </form>

              <div className="flex items-center gap-2">
                {customerLoginEnabled && (user ? (
                  <button onClick={() => void logout()} title={`Signed in as ${user.email}`} className="hidden xl:inline-flex rounded-full border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800">Logout</button>
                ) : (
                  <NavLink to="/login" className="hidden xl:inline-flex rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700">Login</NavLink>
                ))}
                <button 
                  onClick={toggleLanguage}
                  className="p-2 rounded-full text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Language selector"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-full text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Toggle dark mode"
                >
                  {isDarkMode ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
                <button 
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 rounded-md text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Open menu"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Container>
      </header>

      <MobileMenu 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        navLinks={navLinks}
      />
    </>
  );
};

export default Navbar;
