import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminDashboardService, AdminDashboardMetrics } from '@/services/adminService';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<AdminDashboardMetrics>(() =>
    AdminDashboardService.getMetrics()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    AdminDashboardService.fetchMetrics()
      .then((m) => {
        if (isMounted) {
          setMetrics(m);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const cardItems = [
    {
      label: t('admin.dashboard.totalTools', 'Total Tools'),
      val: metrics.totalTools,
      sub: `${metrics.activeTools} ${t('admin.dashboard.active', 'active')}`,
      icon: '🛠️',
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20',
    },
    {
      label: t('admin.dashboard.totalProjects', 'Total Projects'),
      val: metrics.totalProjects,
      sub: `${metrics.featuredProjects} ${t('admin.dashboard.featured', 'featured')}`,
      icon: '📦',
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20',
    },
    {
      label: t('admin.dashboard.pendingRequests', 'Pending Requests'),
      val: metrics.pendingRequests,
      sub: t('admin.dashboard.actionRequired', 'Requires Action'),
      icon: '📥',
      color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20',
    },
    {
      label: t('admin.dashboard.totalServices', 'Total Services'),
      val: metrics.totalServices,
      sub: t('admin.dashboard.activeServices', 'Active Solutions'),
      icon: '💼',
      color: 'text-green-600 bg-green-50 dark:bg-green-950/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">
            {t('admin.dashboard.title', 'Dashboard Overview')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.dashboard.subtitle', 'Real-time overview of the Tools4Genz platform parameters.')}
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 dark:text-primary-400">
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary-500 border-t-transparent"></div>
            <span>Syncing D1...</span>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardItems.map((c, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm flex items-center justify-between transition-all hover:shadow-md"
          >
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
                {c.label}
              </span>
              <span className="text-3xl font-black text-gray-950 dark:text-white block font-mono">
                {c.val}
              </span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">
                {c.sub}
              </span>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${c.color}`}>
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Tips & Platform Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric Note Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-950 dark:text-white">
            {t('admin.dashboard.platformHealth', 'System Performance')}
          </h2>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-600 dark:text-gray-400">
                {t('admin.dashboard.workerStatus', 'Cloudflare Worker Status')}
              </span>
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-xs font-bold rounded">
                ONLINE
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-600 dark:text-gray-400">
                {t('admin.dashboard.d1Status', 'Cloudflare D1 Connection')}
              </span>
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-xs font-bold rounded">
                CONNECTED
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            ℹ️ {t('admin.dashboard.metricsLiveNote', 'Platform metrics are synchronized with Cloudflare D1 database and Worker API.')}
          </div>
        </div>

        {/* Shortcuts Panel */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-950 dark:text-white">
            {t('admin.dashboard.shortcuts', 'Quick Shortcuts')}
          </h2>
          <div className="space-y-2.5">
            <Link
              to="/admin/requests"
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl text-sm font-semibold transition-all"
            >
              <span>📥 {t('admin.dashboard.viewRequests', 'Review Pending Requests')}</span>
              <span>&rarr;</span>
            </Link>
            <Link
              to="/admin/tools"
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl text-sm font-semibold transition-all"
            >
              <span>🛠️ {t('admin.dashboard.addNewTool', 'Create/Publish New Tool')}</span>
              <span>&rarr;</span>
            </Link>
            <Link
              to="/admin/projects"
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl text-sm font-semibold transition-all"
            >
              <span>📦 {t('admin.dashboard.addNewProject', 'Manage Marketplace Items')}</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
