import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RequestAdminService, AdminRequest } from '@/services/adminService';
import { RequestStatus } from '@/types/request';

export const RequestManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<AdminRequest[]>(() => RequestAdminService.getAll());
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Detail Modal State
  const [activeRequest, setActiveRequest] = useState<AdminRequest | null>(null);

  const refreshRequests = () => {
    setRequests(RequestAdminService.getAll());
  };

  const handleStatusChange = (requestId: string, newStatus: RequestStatus) => {
    RequestAdminService.updateStatus(requestId, newStatus);
    refreshRequests();
    if (activeRequest && activeRequest.requestId === requestId) {
      setActiveRequest(prev => (prev ? { ...prev, status: newStatus } : prev));
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesType = selectedTypeFilter === 'all' || r.requestType === selectedTypeFilter;
    const matchesStatus = selectedStatusFilter === 'all' || r.status === selectedStatusFilter;
    return matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('admin.requests.title', 'Customer Service Requests')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.requests.subtitle', 'Review complete specifications, change tickets state, and process incoming proposals.')}</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col sm:flex-row gap-4">
        <select
          value={selectedTypeFilter}
          onChange={(e) => setSelectedTypeFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2"
        >
          <option value="all">{t('admin.requests.allTypes', 'All Request Types')}</option>
          <option value="student-project">Student Mini-Project</option>
          <option value="client-website">Client Custom Website</option>
        </select>
        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2"
        >
          <option value="all">{t('admin.requests.allStatuses', 'All Workflow Statuses')}</option>
          <option value="submitted">Submitted</option>
          <option value="reviewing">Reviewing</option>
          <option value="contacted">Contacted</option>
          <option value="quoted">Quoted</option>
          <option value="approved">Approved</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Requests Table View */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/40 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4">{t('admin.table.requestId', 'Request ID')}</th>
                <th className="px-6 py-4">{t('admin.table.clientName', 'Customer Name')}</th>
                <th className="px-6 py-4">{t('admin.table.category', 'Category')}</th>
                <th className="px-6 py-4">{t('admin.table.status', 'Workflow Status')}</th>
                <th className="px-6 py-4">{t('admin.table.created', 'Created At')}</th>
                <th className="px-6 py-4 text-right">{t('admin.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm font-semibold">
              {filteredRequests.map(r => (
                <tr key={r.requestId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="px-6 py-4 font-mono font-extrabold text-primary-600 dark:text-primary-400">{r.requestId}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">{r.name}</td>
                  <td className="px-6 py-4 capitalize text-gray-500 dark:text-gray-400">{r.requestType.replace('-', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded capitalize ${r.status === 'submitted' ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400' :
                      r.status === 'reviewing' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' :
                        r.status === 'completed' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' :
                          r.status === 'cancelled' ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400' :
                            'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400'
                      }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setActiveRequest(r)} className="text-sm px-3 py-1.5 bg-primary-50 dark:bg-primary-950/30 hover:bg-primary-100 dark:hover:bg-primary-950/50 text-primary-600 dark:text-primary-400 rounded-lg">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Details Drawer/Modal */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 max-w-2xl w-full rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/40">
              <div>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest block font-mono">{activeRequest.requestId}</span>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('admin.requests.details', 'Request Specifications')}
                </h2>
              </div>
              <button onClick={() => setActiveRequest(null)} className="text-xl p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
              {/* Status workflow control */}
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="font-semibold text-blue-900 dark:text-blue-400">⚡ Modify Workflow State:</span>
                <select
                  value={activeRequest.status}
                  onChange={(e) => handleStatusChange(activeRequest.requestId, e.target.value as RequestStatus)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="submitted">Submitted</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="contacted">Contacted</option>
                  <option value="quoted">Quoted</option>
                  <option value="approved">Approved</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Client specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700/60">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Name:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{activeRequest.name}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Email (Contact):</span>
                  <span className="font-mono text-gray-900 dark:text-white">{activeRequest.email}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Phone:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{activeRequest.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Preference:</span>
                  <span className="capitalize font-bold text-primary-600 dark:text-primary-400">{activeRequest.preferredContactMethod || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Project Category:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{activeRequest.projectType}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Target Tech Stack:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{activeRequest.technology || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Allocated Budget:</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">{activeRequest.budget || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Required Deadline:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{activeRequest.deadline || '-'}</span>
                </div>
              </div>

              {/* Requirement Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Project Description:</span>
                <p className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80 rounded-xl leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300">
                  {activeRequest.description}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button onClick={() => setActiveRequest(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold">
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestManagementPage;
