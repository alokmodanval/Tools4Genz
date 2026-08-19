import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ProjectDefinition } from '@/types/project';
import { OrderQrResponse, VerifyPaymentResponse } from '@/types/order';
import { orderService, loadRazorpayScript } from '@/services/orderService';
import { savePurchase } from '@/services/purchaseStore';
import Button from '@/components/ui/Button';
import { trackEvent } from '@/services/platformService';

interface PurchaseModalProps {
  project: ProjectDefinition;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Purchase flow stages:
 * - form:      customer details + payment method choice
 * - processing: creating secure order with backend
 * - checkout:  Razorpay Checkout SDK overlay active
 * - qr:        Dynamic UPI QR displayed (amount locked to server order amount)
 * - verifying: backend signature verification / status polling
 * - success:   verified payment receipt
 * - failed:    payment failed / abandoned
 */
type CheckoutStage = 'form' | 'processing' | 'qr' | 'verifying' | 'success' | 'failed';

type PaymentMethod = 'checkout' | 'upi-qr';

const formatInr = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ project, isOpen, onClose }) => {
  const { t } = useTranslation();

  const [stage, setStage] = useState<CheckoutStage>('form');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('checkout');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderResult, setOrderResult] = useState<VerifyPaymentResponse | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [purchaseAccessToken, setPurchaseAccessToken] = useState('');
  const [qrData, setQrData] = useState<OrderQrResponse | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(
    () => () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeButtonRef.current?.click(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      if (!controls.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { cancelAnimationFrame(focusFrame); document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [isOpen]);

  if (!isOpen) return null;

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startDeliveryPolling = (orderId: string, accessToken: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const status = await orderService.getOrderStatus(orderId, accessToken);
        const nextDeliveryStatus = status.deliveryStatus || null;
        setDeliveryStatus(nextDeliveryStatus);
        if (nextDeliveryStatus === 'ready' || nextDeliveryStatus === 'failed') {
          stopPolling();
        }
      } catch {
        // Artifact preparation may take time; keep the current safe state.
      }
    }, 6000);
  };

  const handleClose = () => {
    stopPolling();
    // Reset state on close
    setStage('form');
    setErrorMsg('');
    setOrderResult(null);
    setCreatedOrderId('');
    setPurchaseAccessToken('');
    setQrData(null);
    setDeliveryStatus(null);
    setDeliveryError('');
    setDownloading(false);
    setPaymentMethod('checkout');
    onClose();
  };

  const handleOpenCheckout = async (orderData: {
    orderId: string;
    providerOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
    accessToken: string;
  }) => {
    // 1. Load official Razorpay checkout SDK
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
            stopPolling();
            setStage('verifying');
            const verifyResult = await orderService.verifyPayment(orderData.orderId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setOrderResult(verifyResult);
            // Phase 9: Fetch delivery status after payment confirmation.
            try {
              const status = await orderService.getOrderStatus(orderData.orderId, orderData.accessToken);
              setDeliveryStatus(status.deliveryStatus || null);
              if (status.deliveryStatus !== 'ready' && status.deliveryStatus !== 'failed') {
                startDeliveryPolling(orderData.orderId, orderData.accessToken);
              }
            } catch {
              // Non-blocking — delivery status will appear on next lookup.
            }
            trackEvent('payment_success', 'project', project.id);
            setStage('success');
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Payment verification failed.';
            setErrorMsg(msg);
            setStage((curr) => (curr === 'success' ? 'success' : 'failed'));
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
      setErrorMsg(
        'Razorpay checkout script could not be loaded. Please disable ad-blockers and retry, or use the UPI QR option.'
      );
      setStage('failed');
    }
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
      // 1. Create order on backend (server resolves authoritative price)
      const orderData = await orderService.createOrder({
        projectId: project.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
      });

      setCreatedOrderId(orderData.orderId);
      setPurchaseAccessToken(orderData.accessToken);
      savePurchase({
        orderId: orderData.orderId,
        accessToken: orderData.accessToken,
        projectId: orderData.project.id,
        projectTitle: orderData.project.title,
        createdAt: new Date().toISOString(),
      });

      if (paymentMethod === 'upi-qr') {
        // 2. UPI QR flow — amount stays locked to the server order amount
        await handleStartQrFlow(orderData);
      } else {
        // 2. Default Razorpay Checkout flow
        await handleOpenCheckout(orderData);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize payment.';
      setErrorMsg(msg);
      setStage('failed');
    }
  };

  const handleStartQrFlow = async (orderData: {
    orderId: string;
    providerOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
    accessToken: string;
  }) => {
    const orderId = orderData.orderId;
    try {
      const qr = await orderService.getPaymentQr(orderId);
      setQrData(qr);
      setStage('qr');

      // Poll public status until webhook marks the order paid
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const status = await orderService.getOrderStatus(orderId, orderData.accessToken);
          if (status.status === 'paid') {
            stopPolling();
            setOrderResult({
              orderId: status.orderId,
              status: 'paid',
              providerPaymentId: '',
              paidAt: status.paidAt || new Date().toISOString(),
              amount: status.amount,
              currency: status.currency,
              projectTitle: status.projectTitle,
            });
            setDeliveryStatus(status.deliveryStatus || null);
            trackEvent('payment_success', 'project', project.id);
            setStage('success');
            if (status.deliveryStatus !== 'ready' && status.deliveryStatus !== 'failed') {
              startDeliveryPolling(orderId, orderData.accessToken);
            }
          } else if (status.status === 'payment_failed') {
            stopPolling();
            setErrorMsg('The payment was reported as failed. Please retry or use Checkout.');
            setStage('failed');
          }
        } catch {
          // Transient polling errors — keep polling
        }
      }, 6000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate UPI QR code.';

      // Razorpay Test Mode may not have Dynamic UPI QR Codes enabled on this
      // merchant account. Do NOT fake a QR — fall back to the official
      // Razorpay Checkout flow, which supports UPI QR within checkout in Test Mode.
      if (
        msg.includes('FEATURE_NOT_ENABLED') ||
        msg.toLowerCase().includes('dynamic upi qr is not enabled')
      ) {
        // UPI QR is not enabled on this merchant account. Do NOT fake a QR.
        // Reuse the SAME order (no duplicate) and open the official Razorpay
        // Checkout flow, which supports UPI QR, cards, and netbanking.
        setErrorMsg(
          'UPI QR payment is currently unavailable. Pay with Razorpay Checkout instead.'
        );
        setPaymentMethod('checkout');
        setStage('processing');
        try {
          await handleOpenCheckout(orderData);
        } catch (checkoutErr) {
          const checkoutMsg =
            checkoutErr instanceof Error ? checkoutErr.message : 'Failed to initialize Razorpay Checkout.';
          setErrorMsg(checkoutMsg);
          setStage('failed');
        }
        return;
      }

      // Unexpected QR failures are useful during diagnostics, but never log
      // provider payloads or the caught error (which could contain internals).
      console.error('Error generating UPI QR:');
      setErrorMsg(msg);
      setStage('failed');
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!createdOrderId) return;
    try {
      const status = await orderService.getOrderStatus(createdOrderId, purchaseAccessToken);
      if (status.status === 'paid') {
        stopPolling();
        setOrderResult({
          orderId: status.orderId,
          status: 'paid',
          providerPaymentId: '',
          paidAt: status.paidAt || new Date().toISOString(),
          amount: status.amount,
          currency: status.currency,
          projectTitle: status.projectTitle,
        });
        setDeliveryStatus(status.deliveryStatus || null);
        trackEvent('payment_success', 'project', project.id);
        setStage('success');
        if (status.deliveryStatus !== 'ready' && status.deliveryStatus !== 'failed') {
          startDeliveryPolling(createdOrderId, purchaseAccessToken);
        }
      } else if (status.status === 'payment_failed') {
        stopPolling();
        setErrorMsg('The payment was reported as failed. Please retry or use Checkout.');
        setStage('failed');
      } else {
        setErrorMsg('Payment is still pending. Please scan and complete the UPI payment, then check again.');
        setStage('qr');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to refresh payment status.';
      setErrorMsg(msg);
    }
  };

  /**
   * Phase 9 — Securely download the purchased project ZIP.
   * The Worker authorizes the download against the paid order/delivery.
   */
  const handleDownloadProject = async () => {
    const orderId = orderResult?.orderId || createdOrderId;
    if (!orderId || !purchaseAccessToken) return;

    setDownloading(true);
    setDeliveryError('');
    try {
      const { blob, filename } = await orderService.downloadProject(orderId, purchaseAccessToken);
      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      trackEvent('download_success', 'project', project.id);
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed. Please try again.';
      setDeliveryError(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="purchase-dialog-title" className="max-h-[calc(100vh-2rem)] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 relative">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-100 dark:border-gray-700">
          <h3 id="purchase-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white">
            {stage === 'success'
              ? t('checkout.payment_success_title', 'Payment Successful!')
              : t('checkout.modal_title', 'Purchase Project')}
          </h3>
          <button
            ref={closeButtonRef}
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
            {/* Order Summary Box — exact project price, read-only */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('checkout.order_summary', 'Order Summary')} —{' '}
                <span className="text-primary-600 dark:text-primary-400 font-bold">
                  {t('checkout.amount_locked', 'Amount Locked')}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                  {project.title}
                </span>
                <span className="font-bold text-primary-600 dark:text-primary-400 text-lg">
                  ₹{formatInr(project.price)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {t(
                  'checkout.amount_fixed_notice',
                  'The payment amount is fixed to the server-created order and cannot be changed.'
                )}
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('checkout.payment_method', 'Payment Method')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('checkout')}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition-all ${paymentMethod === 'checkout'
                    ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-400 text-primary-700 dark:text-primary-300 ring-1 ring-primary-400'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-300'
                    }`}
                >
                  <span className="block text-base">🛒</span>
                  {t('checkout.method_checkout', 'Card / NetBanking / UPI')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi-qr')}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${paymentMethod === 'upi-qr'
                    ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-400 text-primary-700 dark:text-primary-300 ring-1 ring-primary-400'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-300'
                    }`}
                >
                  <span className="block text-base">📱</span>
                  {t('checkout.method_qr', 'Scan UPI QR')}
                </button>
              </div>
              {paymentMethod === 'upi-qr' && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t(
                    'checkout.qr_notice',
                    'Scan with any UPI app (GPay, PhonePe, Paytm). The QR is fixed to ₹{{price}} for this order only.',
                    { price: formatInr(project.price) }
                  )}
                </p>
              )}
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
                    'Use this email for purchase support and recovery. Your secure download will appear in My Purchases after payment.'
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
                {paymentMethod === 'upi-qr'
                  ? t('checkout.proceed_qr_btn', 'Generate QR — ₹{{price}}', { price: formatInr(project.price) })
                  : t('checkout.proceed_btn', 'Pay ₹{{price}} via Razorpay', { price: formatInr(project.price) })}
              </Button>
            </div>
          </form>
        )}

        {/* STAGE: Processing */}
        {stage === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('checkout.processing', 'Creating secure test order...')}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('checkout.processing_hint', 'Please do not close this window.')}
            </p>
          </div>
        )}

        {/* STAGE: QR Payment */}
        {stage === 'qr' && qrData && (
          <div className="space-y-5 text-center">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(
                  'checkout.qr_scan_hint',
                  'Scan the QR with any UPI app (GPay, PhonePe, Paytm / BHIM).'
                )}
              </p>
              {/* Locked server amount — read-only display, not editable */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('checkout.amount_to_pay', 'Amount to Pay')}:
                </span>
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  ₹{qrData.amount}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {qrData.currency}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {t(
                  'checkout.qr_fixed_amount',
                  '🔒 Amount is fixed to the server-created order price and cannot be modified.'
                )}
              </p>
            </div>

            <div className="mx-auto max-w-[220px] bg-white dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
              <img
                src={qrData.imageUrl}
                alt="Razorpay Dynamic UPI QR Code for this order"
                className="w-full h-auto rounded-lg"
              />
            </div>

            <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
              <p>
                Order Reference: <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{qrData.orderId}</span>
              </p>
              <p>
                QR expires at:{' '}
                <span className="font-mono">{new Date(qrData.expiresAt).toLocaleTimeString()}</span>
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-blue-800 dark:text-blue-300 text-xs text-left">
              🔄{' '}
              {t(
                'checkout.qr_after_pay',
                'Once you complete the UPI payment, your payment is confirmed via a secure webhook from Razorpay. This page automatically refreshes the status.'
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                {t('checkout.close_btn', 'Close')}
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleCheckPaymentStatus}>
                {t('checkout.check_payment_btn', "I've Paid — Check Status")}
              </Button>
            </div>
          </div>
        )}

        {/* STAGE: Verifying */}
        {stage === 'verifying' && (
          <div className="py-12 text-center space-y-4">
            <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('checkout.verifying', 'Verifying payment signature with server...')}
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

            <p className="text-xs text-gray-500 dark:text-gray-400">
              This purchase is saved on this browser. You can return to{' '}
              <Link to="/my-purchases" className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
                My Purchases
              </Link>{' '}
              to check delivery or download it later.
            </p>

            {/* Phase 9 — Digital Delivery Status */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📦</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('checkout.delivery_title', 'Digital Delivery')}
                </span>
              </div>

              {deliveryStatus === 'ready' && (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(
                      'checkout.delivery_ready',
                      'Your project package is ready for download. Secure download is authorized by the server.'
                    )}
                  </p>
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={downloading}
                    onClick={handleDownloadProject}
                  >
                    {downloading
                      ? t('checkout.downloading_btn', 'Downloading...')
                      : t('checkout.download_btn', '⬇ Download Project')}
                  </Button>
                </>
              )}

              {deliveryStatus === 'pending' && (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(
                      'checkout.delivery_pending',
                      'Your project is still being prepared. Please check back shortly.'
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                    {t('checkout.delivery_preparing', 'Preparing your project...')}
                  </div>
                </>
              )}

              {deliveryStatus === 'failed' && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {t(
                    'checkout.delivery_failed',
                    'The delivery provider could not be reached. Please try again later or contact support.'
                  )}
                </p>
              )}

              {!deliveryStatus && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('checkout.delivery_unknown', 'Digital delivery status will appear here.')}
                </p>
              )}

              {deliveryError && (
                <p className="text-xs text-red-600 dark:text-red-400">{deliveryError}</p>
              )}

              <Button variant="outline" className="w-full" onClick={handleClose}>
                {t('checkout.close_btn', 'Close')}
              </Button>
            </div>
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
                  stopPolling();
                  setStage('form');
                  setErrorMsg('');
                  setQrData(null);
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
