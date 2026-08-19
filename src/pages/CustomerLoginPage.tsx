import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { platformService, trackEvent } from '@/services/platformService';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

const CustomerLoginPage: React.FC = () => {
  const { enabled, user, refresh } = useCustomerAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [step, setStep] = useState<'email'|'code'>('email'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const requestedReturn = params.get('returnTo') || '/my-purchases'; const returnTo = requestedReturn.startsWith('/') && !requestedReturn.startsWith('//') ? requestedReturn : '/my-purchases';
  const start = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); trackEvent('login_started'); try { await platformService.startLogin(email); setStep('code'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to start login.'); } finally { setBusy(false); } };
  const verify = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await platformService.verifyLogin(email, code); await refresh(); trackEvent('login_success'); navigate(returnTo, { replace: true }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to verify code.'); } finally { setBusy(false); } };
  if (user) return <Navigate to={returnTo} replace />;

  return <><SEO title="Customer Login - Tools4Genz" description="Securely sign in to purchase and view Tools4Genz projects." noindex />
    <main className="min-h-[70vh] bg-surface-50 px-4 py-16 dark:bg-surface-950"><Container><div className="mx-auto max-w-md rounded-3xl border border-surface-200 bg-white p-7 shadow-sm dark:border-surface-700 dark:bg-surface-900 sm:p-9">
      <div className="mb-7 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-2xl dark:bg-primary-950">🔐</div><h1 className="text-3xl font-black text-surface-950 dark:text-white">Customer login</h1><p className="mt-2 text-sm text-surface-600 dark:text-surface-300">Browse freely. Sign in only when you want to purchase or view account-linked orders.</p></div>
      {!enabled ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Customer login is not available until transactional email verification is configured. Browsing and the existing secure purchase-access flow remain available.<div className="mt-4"><Button href="/projects" variant="outline">Browse projects</Button></div></div> :
      step === 'email' ? <form onSubmit={start} className="space-y-5"><label className="block text-sm font-semibold text-surface-700 dark:text-surface-200">Email address<input type="email" required value={email} onChange={(event)=>setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-surface-950 outline-none focus:border-primary-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white" placeholder="you@example.com" /></label>{error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}<Button type="submit" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Continue with email'}</Button></form> :
      <form onSubmit={verify} className="space-y-5"><p className="text-sm text-surface-600 dark:text-surface-300">Enter the six-digit code sent to <strong>{email}</strong>.</p><label className="block text-sm font-semibold text-surface-700 dark:text-surface-200">Login code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event)=>setCode(event.target.value.replace(/\D/g,''))} className="mt-2 w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-surface-950 dark:border-surface-700 dark:bg-surface-800 dark:text-white" /></label>{error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}<Button type="submit" className="w-full" disabled={busy}>{busy ? 'Verifying…' : 'Verify and continue'}</Button><button type="button" onClick={()=>setStep('email')} className="w-full text-sm font-semibold text-primary-600 dark:text-primary-400">Use another email</button></form>}
      <p className="mt-7 text-center text-xs text-surface-500">Admin access is separate. <Link to="/privacy" className="text-primary-600 dark:text-primary-400">Privacy policy</Link></p>
    </div></Container></main></>;
};
export default CustomerLoginPage;
