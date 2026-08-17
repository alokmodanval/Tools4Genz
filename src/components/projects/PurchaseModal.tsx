import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectDefinition } from '@/types/project';
import { VerifyPaymentResponse } from '@/types/order';
import { orderService, loadRazorpayScript } from '@/services/orderService';
import Button from '@/components/ui/Button';

interface PurchaseModalProps {
  project: ProjectDefinition;
  isOpen: boolean;
  onClose: () => void;
}

type CheckoutStage = 'form' | 'processing' | 'verifying' | 'success' | 'failed';

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ project, isOpen, onClose }) => {
  const { t } = useTranslation();

  const [stage, setStage] = useState<CheckoutStage>('form');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderResult, setOrderResult] = useState<VerifyPaymentResponse | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset state on close
    setStage('form');
    setErrorMsg('');
    setOrderResult(null);
    onClose();
  };

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      setErrorMsg('Please enter your name and a valid email address.');
      return;
    }

    setErrorMsg('');
    setStage('processing');

    try {
      // 1. Create order on backend
      const orderData = await orderService.createOrder({
        projectId: project.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
      });

      setCreatedOrderId(orderData.orderId);

      // 2. Load official Razorpay checkout SDK
      const scriptLoaded = await loadRazorpayScript();

      // If Razorpay SDK is available in window
      if (scriptLoaded && window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: Math.round(orderData.amount * 100),
          currency: orderData.currency,
          name: 'Tools4Genz',
          description: project.title,
          order_id: orderData.providerOrderId,
          prefill: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            contact: customerPhone.trim() || undefined,
          },
          theme: {
            color: '#4F46E5',
          },
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            try {
              setStage('verifying');
              const verifyResult = await orderService.verifyPayment(orderData.orderId, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setOrderResult(verifyResult);
              setStage('success');
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Payment verification failed.';
              setErrorMsg(msg);
              setStage('failed');
            }
          },
          modal: {
            ondismiss: function () {
              setStage((curr) => (curr === 'success' ? 'success' : 'failed'));
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback if Razorpay SDK script was blocked (e.g. adblocker)
        setErrorMsg('Razorpay checkout script could not be loaded. Please disable ad-blockers and retry.');
        setStage('failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize payment.';
      setErrorMsg(msg);
      setStage('failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {stage === 'success'
              ? t('checkout.payment_success_title', 'Payment Successful!')
              : t('checkout.modal_title', 'Purchase Project')}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* STAGE: Form */}
        {stage === 'form' && (
          <form onSubmit={handleStartPayment} className="space-y-6">
            {/* Order Summary Box */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('checkout.order_summary', 'Order Summary')}
              </div>
              <div className="flex justify-between items-start">
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                  {project.title}
                </span>
                <span className="font-bold text-primary-600 dark:text-primary-400 text-lg">
                  ₹{project.price}
                </span>
              </div>
            </div>

            {/* Test Mode Banner */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <span>⚠️</span>
              <span>
                {t(
                  'checkout.test_mode_notice',
                  'Razorpay Test Mode: This is a safe testing environment. No real money will be charged.'
                )}
              </span>
            </div>

            {/* Customer Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('checkout.name_label', 'Full Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('checkout.name_placeholder', 'e.g. Rahul Sharma')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('checkout.email_label', 'Email Address')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder={t('checkout.email_placeholder', 'e.g. rahul@example.com')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t(
                    'checkout.email_help',
                    'Project source code and documentation will be delivered to this email address.'
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('checkout.phone_label', 'Phone Number (Optional)')}
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={t('checkout.phone_placeholder', 'e.g. +91 9876543210')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs">
                {errorMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                {t('checkout.cancel_btn', 'Cancel')}
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                {t('checkout.proceed_btn', 'Pay ₹{{price}} via Razorpay', { price: project.price })}
              </Button>
            </div>
          </form>
        )}

        {/* STAGE: Processing / Verifying */}
        {(stage === 'processing' || stage === 'verifying') && (
          <div className="py-12 text-center space-y-4">
            <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              {stage === 'processing'
                ? t('checkout.processing', 'Creating secure test order...')
                : t('checkout.verifying', 'Verifying payment signature with server...')}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Please do not close this window.
            </p>
          </div>
        )}

        {/* STAGE: Success */}
        {stage === 'success' && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {t(
                  'checkout.payment_success_desc',
                  'Your order has been verified and confirmed.'
                )}
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('checkout.order_id', 'Order Reference')}:
                </span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  {orderResult?.orderId || createdOrderId}
                </span>
              </div>
              {orderResult?.providerPaymentId && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('checkout.payment_id', 'Payment ID')}:
                  </span>
                  <span className="font-mono text-gray-700 dark:text-gray-300 text-xs">
                    {orderResult.providerPaymentId}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('checkout.amount_paid', 'Amount Paid')}:
                </span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  ₹{orderResult?.amount || project.price}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-blue-800 dark:text-blue-300 text-xs text-left">
              ℹ️ {t(
                'checkout.delivery_notice',
                'Your project package is ready. An email receipt and delivery instructions have been generated.'
              )}
            </div>

            <Button variant="primary" className="w-full" onClick={handleClose}>
              {t('checkout.close_btn', 'Close')}
            </Button>
          </div>
        )}

        {/* STAGE: Failed */}
        {stage === 'failed' && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✕
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {t('checkout.payment_failed_title', 'Payment Incomplete')}
              </h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {errorMsg ||
                  t(
                    'checkout.payment_failed_desc',
                    'The transaction was not completed or payment signature was invalid. Please try again.'
                  )}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                {t('checkout.close_btn', 'Close')}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  setStage('form');
                  setErrorMsg('');
                }}
              >
                {t('checkout.retry_btn', 'Try Again')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseModal;
