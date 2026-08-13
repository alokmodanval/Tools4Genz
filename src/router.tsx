import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from '@/components/layout/Layout';

// Lazy load all pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const ToolsPage = lazy(() => import('@/pages/ToolsPage'));
const ToolDetailPage = lazy(() => import('@/pages/ToolDetailPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const StudentsPage = lazy(() => import('@/pages/StudentsPage'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

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
      { path: 'students', element: <SuspenseWrapper><StudentsPage /></SuspenseWrapper> },
      { path: 'clients', element: <SuspenseWrapper><ClientsPage /></SuspenseWrapper> },
      { path: 'about', element: <SuspenseWrapper><AboutPage /></SuspenseWrapper> },
      { path: '*', element: <SuspenseWrapper><NotFoundPage /></SuspenseWrapper> },
    ],
  },
]);
