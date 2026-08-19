import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from '@/components/layout/Layout';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';

// Lazy load public pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const ToolsPage = lazy(() => import('@/pages/ToolsPage'));
const ToolDetailPage = lazy(() => import('@/pages/ToolDetailPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const StudentsPage = lazy(() => import('@/pages/StudentsPage'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const MyPurchasesPage = lazy(() => import('@/pages/MyPurchasesPage'));
const PurchaseRecoveryPage = lazy(() => import('@/pages/PurchaseRecoveryPage'));
const ServiceRequestPage = lazy(() => import('@/pages/ServiceRequestPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const CustomerLoginPage = lazy(() => import('@/pages/CustomerLoginPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Lazy load admin pages
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const ToolManagementPage = lazy(() => import('@/pages/admin/ToolManagementPage'));
const ProjectManagementPage = lazy(() => import('@/pages/admin/ProjectManagementPage'));
const ServiceManagementPage = lazy(() => import('@/pages/admin/ServiceManagementPage'));
const CategoryManagementPage = lazy(() => import('@/pages/admin/CategoryManagementPage'));
const RequestManagementPage = lazy(() => import('@/pages/admin/RequestManagementPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const CustomerUsersPage = lazy(() => import('@/pages/admin/CustomerUsersPage'));
const AffiliateManagementPage = lazy(() => import('@/pages/admin/AffiliateManagementPage'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
  </div>
);

// Suspense wrapper
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <SuspenseWrapper><HomePage /></SuspenseWrapper> },
      { path: 'tools', element: <SuspenseWrapper><ToolsPage /></SuspenseWrapper> },
      { path: 'tools/:slug', element: <SuspenseWrapper><ToolDetailPage /></SuspenseWrapper> },
      { path: 'projects', element: <SuspenseWrapper><ProjectsPage /></SuspenseWrapper> },
      { path: 'projects/:slug', element: <SuspenseWrapper><ProjectDetailPage /></SuspenseWrapper> },
      { path: 'services', element: <SuspenseWrapper><ServicesPage /></SuspenseWrapper> },
      { path: 'services/request', element: <SuspenseWrapper><ServiceRequestPage /></SuspenseWrapper> },
      { path: 'students', element: <SuspenseWrapper><StudentsPage /></SuspenseWrapper> },
      { path: 'clients', element: <SuspenseWrapper><ClientsPage /></SuspenseWrapper> },
      { path: 'about', element: <SuspenseWrapper><AboutPage /></SuspenseWrapper> },
      { path: 'my-purchases', element: <SuspenseWrapper><MyPurchasesPage /></SuspenseWrapper> },
      { path: 'purchase/recover', element: <SuspenseWrapper><PurchaseRecoveryPage /></SuspenseWrapper> },
      { path: 'contact', element: <SuspenseWrapper><ContactPage /></SuspenseWrapper> },
      { path: 'privacy', element: <SuspenseWrapper><PrivacyPage /></SuspenseWrapper> },
      { path: 'terms', element: <SuspenseWrapper><TermsPage /></SuspenseWrapper> },
      { path: 'login', element: <SuspenseWrapper><CustomerLoginPage /></SuspenseWrapper> },
      { path: '*', element: <SuspenseWrapper><NotFoundPage /></SuspenseWrapper> },
    ],
  },
  {
    path: '/admin/login',
    element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
  },
  {
    path: '/admin',
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    children: [
      { index: true, element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
      { path: 'dashboard', element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
      { path: 'tools', element: <SuspenseWrapper><ToolManagementPage /></SuspenseWrapper> },
      { path: 'projects', element: <SuspenseWrapper><ProjectManagementPage /></SuspenseWrapper> },
      { path: 'services', element: <SuspenseWrapper><ServiceManagementPage /></SuspenseWrapper> },
      { path: 'categories', element: <SuspenseWrapper><CategoryManagementPage /></SuspenseWrapper> },
      { path: 'requests', element: <SuspenseWrapper><RequestManagementPage /></SuspenseWrapper> },
      { path: 'settings', element: <SuspenseWrapper><SettingsPage /></SuspenseWrapper> },
      { path: 'affiliates', element: <SuspenseWrapper><AffiliateManagementPage /></SuspenseWrapper> },
      { path: 'users', element: <SuspenseWrapper><CustomerUsersPage /></SuspenseWrapper> },
    ],
  },
]);
