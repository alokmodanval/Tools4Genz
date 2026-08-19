import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from './Container';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  const socialLinks = [['Instagram', settings.instagram_url], ['YouTube', settings.youtube_url], ['GitHub', settings.github_url], ['LinkedIn', settings.linkedin_url]].filter((item) => item[1]);

  return (
    <footer className="bg-surface-50 border-t border-surface-200 dark:bg-surface-950 dark:border-surface-800 pt-16 pb-8">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          <div className="space-y-4">
            <Link to="/" className="inline-block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 rounded-md">
              <span className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white">
                Tools<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-500">4G</span>enz
              </span>
            </Link>
            <p className="text-sm text-surface-500 dark:text-surface-400 max-w-xs leading-relaxed">
              {settings.short_description || t('footer.description', 'Practical tools and digital solutions for students, creators, and businesses.')}
            </p>
            {socialLinks.length > 0 && <div className="flex flex-wrap gap-3 pt-2">{socialLinks.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400">{label}</a>)}</div>}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-4">
              {t('footer.quickLinks', 'Quick Links')}
            </h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors">{t('nav.home', 'Home')}</Link></li>
              <li><Link to="/tools" className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors">{t('nav.tools', 'Tools')}</Link></li>
              <li><Link to="/projects" className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors">{t('nav.projects', 'Projects')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-4">
              {t('footer.services', 'Services')}
            </h4>
            <ul className="space-y-3">
              <li><Link to="/services" className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors">{t('nav.services', 'Our Services')}</Link></li>
              <li><Link to="/students" className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors">{t('nav.students', 'For Students')}</Link></li>
              <li><Link to="/clients" className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors">{t('nav.clients', 'For Clients')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-4">
              {t('footer.support', 'Support')}
            </h4>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors">{t('footer.about', 'About Us')}</Link></li>
              <li><Link to="/contact" className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors">{t('footer.contact', 'Contact')}</Link></li>
              <li><Link to="/privacy" className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors">{t('footer.privacy', 'Privacy Policy')}</Link></li>
              <li><Link to="/terms" className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors">{t('footer.terms', 'Terms of Service')}</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-surface-200 dark:border-surface-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-surface-500 dark:text-surface-400">
            © {new Date().getFullYear()} Tools4Genz. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
