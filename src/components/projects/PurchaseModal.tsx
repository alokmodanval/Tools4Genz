import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ProjectDefinition } from '@/types/project';

export interface PurchaseModalProps {
  project: ProjectDefinition;
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ project, isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setUserEmail('');
    setUserName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleReset} title={`Order: ${project.title}`}>
      {submitted ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Order Request Received!
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
            Thank you, <span className="font-semibold text-gray-900 dark:text-white">{userName || 'Developer'}</span>! We have logged your order request for <span className="font-semibold">{project.title}</span>. Our team will contact you at <span className="text-primary-600 dark:text-primary-400 font-mono">{userEmail}</span> with instant access details and source code delivery links.
          </p>
          <div className="pt-4">
            <Button variant="primary" onClick={handleReset} className="w-full">
              Back to Marketplace
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Order Item Summary */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start space-x-4">
            <div className="text-3xl p-2 bg-white dark:bg-gray-700 rounded-xl shadow-xs shrink-0">
              {project.icon || '🚀'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 dark:text-white text-base truncate">
                {project.title}
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="primary" size="sm">{project.category}</Badge>
                <Badge variant="outline" size="sm">{project.level}</Badge>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-extrabold text-primary-600 dark:text-primary-400">
                ₹{project.price.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Included Deliverables */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Included Deliverables
            </h5>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700 dark:text-gray-300">
              {(project.includedItems || [
                'Full Source Code Archive',
                'Step-by-step Setup Guide (PDF)',
                'Database Schema Script (.sql)',
                'Academic / Client PPT Slides',
              ]).map((item, i) => (
                <li key={i} className="flex items-center">
                  <span className="text-green-500 font-bold mr-1.5">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Instant Checkout Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Enter your name"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email Address for Delivery
              </label>
              <input
                type="email"
                required
                placeholder="your.email@example.com"
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono"
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              💡 <span className="font-semibold">Phase 3 Preview Checkout:</span> Direct payment gateways (Razorpay/Stripe) will connect in Phase 4. Submitting now reserves instant download access.
            </div>

            <div className="flex space-x-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="w-1/3">
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="w-2/3">
                Confirm Order — ₹{project.price.toLocaleString('en-IN')}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
};

export default PurchaseModal;
