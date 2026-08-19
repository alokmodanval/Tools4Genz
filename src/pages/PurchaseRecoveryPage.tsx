import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@/components/layout/Container';
import { purchaseRecoveryService, RecoveryApiError } from '@/services/purchaseRecoveryService';
import { savePurchase } from '@/services/purchaseStore';
import SEO from '@/components/SEO';

type RecoveryState = 'recovering' | 'restored' | 'expired' | 'used' | 'invalid' | 'failed';

const PurchaseRecoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [recoveryToken] = useState(() => {
    const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const token = new URLSearchParams(fragment).get('token') || '';
    // Remove both fragment and any unsupported query token immediately,
    // before effects, network calls, analytics, or normal page usage.
    window.history.replaceState(null, '', window.location.pathname);
    return token;
  });
  const [state, setState] = useState<RecoveryState>(recoveryToken ? 'recovering' : 'invalid');

  useEffect(() => {
    let active = true;
    if (!recoveryToken) {
      return () => { active = false; };
    }

    purchaseRecoveryService.redeem(recoveryToken).then((purchase) => {
      if (!active) return;
      savePurchase({
        orderId: purchase.orderId,
        accessToken: purchase.accessToken,
        projectId: purchase.projectId,
        projectTitle: purchase.projectTitle,
        createdAt: purchase.createdAt,
      });
      setState('restored');
      window.setTimeout(() => navigate('/my-purchases', { replace: true }), 900);
    }).catch((recoveryError: unknown) => {
      if (!active) return;
      if (recoveryError instanceof RecoveryApiError) {
        if (recoveryError.code === 'RECOVERY_EXPIRED') setState('expired');
        else if (recoveryError.code === 'RECOVERY_USED') setState('used');
        else setState('invalid');
      } else setState('failed');
    });

    return () => { active = false; };
  }, [navigate, recoveryToken]);

  const copy: Record<RecoveryState, { title: string; message: string }> = {
    recovering: { title: 'Recovering purchase…', message: 'Securely verifying your one-time recovery link.' },
    restored: { title: 'Purchase restored', message: 'This purchase is now saved on this browser. Redirecting to My Purchases…' },
    expired: { title: 'Recovery link expired', message: 'Request a new recovery email from My Purchases.' },
    used: { title: 'Recovery link already used', message: 'This one-time link cannot be used again.' },
    invalid: { title: 'Unable to restore purchase', message: 'This recovery link is invalid or incomplete.' },
    failed: { title: 'Unable to restore purchase', message: 'Please try again or request a new recovery email.' },
  };

  return (
    <>
      <SEO title="Recover Purchase - Tools4Genz" description="Use a secure, one-time link to restore a Tools4Genz purchase to this browser." noindex />
    <section className="py-20">
      <Container>
        <div className="mx-auto max-w-lg rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm dark:border-surface-700 dark:bg-surface-900">
          {state === 'recovering' && <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />}
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{copy[state].title}</h1>
          <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">{copy[state].message}</p>
        </div>
      </Container>
    </section>
    </>
  );
};

export default PurchaseRecoveryPage;
