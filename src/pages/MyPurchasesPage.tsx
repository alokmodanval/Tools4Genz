import React, { useEffect, useState } from 'react';
import Container from '@/components/layout/Container';
import Button from '@/components/ui/Button';
import { orderService } from '@/services/orderService';
import { getPurchases, removePurchase, SavedPurchase } from '@/services/purchaseStore';
import { PublicOrderSummary } from '@/types/order';
import { purchaseRecoveryService } from '@/services/purchaseRecoveryService';
import SEO from '@/components/SEO';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { CustomerOrder, platformService } from '@/services/platformService';

interface PurchaseView {
  saved: SavedPurchase;
  order?: PublicOrderSummary;
  loading: boolean;
  error?: string;
  downloading?: boolean;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function friendlyStatus(value: string | null | undefined): string {
  if (!value) return 'Pending';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const MyPurchasesPage: React.FC = () => {
  const { enabled: customerLoginEnabled, user } = useCustomerAuth();
  const [accountOrders, setAccountOrders] = useState<CustomerOrder[]>([]);
  const [purchases, setPurchases] = useState<PurchaseView[]>(() =>
    getPurchases().map((saved) => ({ saved, loading: true }))
  );
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [requestingRecovery, setRequestingRecovery] = useState(false);
  useEffect(() => { if (!user) return; platformService.customerOrders().then(setAccountOrders).catch(() => setAccountOrders([])); }, [user]);
  const displayedAccountOrders = user ? accountOrders : [];

  useEffect(() => {
    let active = true;
    const savedPurchases = getPurchases();
    if (savedPurchases.length === 0) return () => { active = false; };

    Promise.all(
      savedPurchases.map(async (saved): Promise<PurchaseView> => {
        try {
          const order = await orderService.getOrderStatus(saved.orderId, saved.accessToken);
          return { saved, order, loading: false };
        } catch {
          return {
            saved,
            loading: false,
            error: 'Purchase access could not be verified.',
          };
        }
      })
    ).then((next) => {
      if (active) setPurchases(next);
    });

    return () => { active = false; };
  }, []);

  const removeFromDevice = (orderId: string) => {
    removePurchase(orderId);
    setPurchases((current) => current.filter((item) => item.saved.orderId !== orderId));
  };

  const download = async (purchase: PurchaseView) => {
    setPurchases((current) => current.map((item) =>
      item.saved.orderId === purchase.saved.orderId ? { ...item, downloading: true, error: undefined } : item
    ));
    try {
      const { blob, filename } = await orderService.downloadProject(
        purchase.saved.orderId,
        purchase.saved.accessToken
      );
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setPurchases((current) => current.map((item) =>
        item.saved.orderId === purchase.saved.orderId ? { ...item, downloading: false } : item
      ));
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : 'Download failed. Please try again.';
      setPurchases((current) => current.map((item) =>
        item.saved.orderId === purchase.saved.orderId
          ? { ...item, downloading: false, error: message }
          : item
      ));
    }
  };

  const requestRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!recoveryEmail.trim()) return;
    setRequestingRecovery(true);
    setRecoveryMessage('');
    try {
      setRecoveryMessage(await purchaseRecoveryService.request(recoveryEmail.trim()));
      setRecoveryEmail('');
    } catch {
      setRecoveryMessage('Unable to send recovery instructions right now. Please try again later.');
    } finally {
      setRequestingRecovery(false);
    }
  };

  return (
    <>
      <SEO title="My Purchases - Tools4Genz" description="Securely view and recover your Tools4Genz project purchases." noindex />
    <section className="py-14 sm:py-20">
      <Container>
        <div className="mx-auto max-w-4xl">
          <div className="mb-10">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Your projects
            </p>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">My Purchases</h1>
            <p className="mt-3 max-w-2xl text-surface-600 dark:text-surface-300">
              Purchases made on this browser appear here. Your private access key stays hidden and is sent only to authorize order status and downloads.
            </p>
          </div>

          {customerLoginEnabled && <div className="mb-8 rounded-2xl border border-primary-200 bg-primary-50/70 p-5 dark:border-primary-900 dark:bg-primary-950/20">
            {user ? <><p className="text-sm font-bold text-primary-900 dark:text-primary-200">Account purchases for {user.email}</p>{displayedAccountOrders.length ? <div className="mt-4 grid gap-3">{displayedAccountOrders.map(order=><div key={order.orderId} className="flex flex-col justify-between gap-2 rounded-xl bg-white p-4 dark:bg-surface-900 sm:flex-row"><div><strong className="text-surface-950 dark:text-white">{order.projectTitle}</strong><p className="mt-1 font-mono text-xs text-surface-500">{order.orderId}</p></div><div className="text-sm sm:text-right"><strong>{formatMoney(order.amount,order.currency)}</strong><p className="text-surface-500">{friendlyStatus(order.status)} · {friendlyStatus(order.deliveryStatus)}</p></div></div>)}</div>:<p className="mt-2 text-sm text-primary-800 dark:text-primary-300">No account-linked orders yet. Older browser purchases remain listed below.</p>}</> : <p className="text-sm text-primary-900 dark:text-primary-200">Log in when available to view account-linked purchases. Browser-saved purchases remain accessible below.</p>}
          </div>}

          {purchases.length === 0 ? (
            <div className="rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm dark:border-surface-700 dark:bg-surface-900">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">No purchases saved on this device</h2>
              <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
                When you start a project purchase, its secure reference will be saved here automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {purchases.map((purchase) => {
                const order = purchase.order;
                return (
                  <article key={purchase.saved.orderId} className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                          {order?.projectTitle || purchase.saved.projectTitle}
                        </h2>
                        <p className="mt-1 font-mono text-xs text-surface-500 dark:text-surface-400">
                          Order: {purchase.saved.orderId}
                        </p>
                        <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                          Purchased: {new Date(order?.createdAt || purchase.saved.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {order && (
                        <p className="text-base font-semibold text-surface-900 dark:text-white">
                          {formatMoney(order.amount, order.currency)}
                        </p>
                      )}
                    </div>

                    {purchase.loading ? (
                      <p className="mt-5 text-sm text-surface-500 dark:text-surface-400">Checking purchase status…</p>
                    ) : order ? (
                      <div className="mt-5 grid gap-3 rounded-xl bg-surface-50 p-4 dark:bg-surface-800 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">Payment</p>
                          <p className="mt-1 font-semibold text-surface-900 dark:text-white">{friendlyStatus(order.status)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">Delivery</p>
                          <p className="mt-1 font-semibold text-surface-900 dark:text-white">{friendlyStatus(order.deliveryStatus)}</p>
                        </div>
                      </div>
                    ) : null}

                    {purchase.error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{purchase.error}</p>}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      {order?.status === 'paid' && order.deliveryStatus === 'ready' && (
                        <Button variant="primary" disabled={purchase.downloading} onClick={() => download(purchase)}>
                          {purchase.downloading ? 'Downloading…' : 'Download Project'}
                        </Button>
                      )}
                      {order?.status === 'paid' && order.deliveryStatus === 'pending' && (
                        <span className="self-center text-sm text-blue-600 dark:text-blue-400">Preparing your project…</span>
                      )}
                      <Button variant="outline" onClick={() => removeFromDevice(purchase.saved.orderId)}>
                        Remove from this device
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-surface-200 bg-surface-50 p-6 dark:border-surface-700 dark:bg-surface-900">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Can’t find a purchase?</h2>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              Enter the email used at checkout. For privacy, the response is the same whether purchases are found or not.
            </p>
            <form onSubmit={requestRecovery} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                placeholder="Email used at checkout"
                autoComplete="email"
                className="min-w-0 flex-1 rounded-lg border border-surface-300 bg-white px-4 py-2 text-sm text-surface-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
              />
              <Button type="submit" variant="primary" disabled={requestingRecovery}>
                {requestingRecovery ? 'Sending…' : 'Recover by email'}
              </Button>
            </form>
            {recoveryMessage && <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">{recoveryMessage}</p>}
          </div>
        </div>
      </Container>
    </section>
    </>
  );
};

export default MyPurchasesPage;
