import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { trackEvent } from '@/services/platformService';
import AdSenseManager from '@/components/monetization/AdSenseManager';

const Layout: React.FC = () => {
  const location = useLocation();
  useEffect(() => { trackEvent('page_view', 'page', location.pathname); }, [location.pathname]);
  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 font-sans transition-colors duration-200">
      <AdSenseManager />
      <Navbar />
      <main className="flex-1 w-full relative">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
