import { D1Database } from './db/repository';
import { handleHealth } from './routes/health';
import { handleCreateRequest, handleGetRequestStatus } from './routes/requests';
import { handleBootstrap, handleLogin, handleLogout, handleMe } from './routes/auth';
import {
  handleDeleteAdminCategory,
  handleDeleteAdminProject,
  handleDeleteAdminService,
  handleDeleteAdminTool,
  handleGetAdminCategories,
  handleGetAdminMetrics,
  handleGetAdminProjects,
  handleGetProjectReleases,
  handleGetAdminRequestById,
  handleGetAdminRequests,
  handleGetAdminServices,
  handleGetAdminTools,
  handleSaveAdminCategory,
  handleSaveAdminProject,
  handleSaveAdminService,
  handleSaveAdminTool,
  handleUpdateAdminCategory,
  handleUpdateAdminProject,
  handleUpdateAdminRequestStatus,
  handleUpdateAdminService,
  handleUpdateAdminTool,
  handleUploadProjectRelease,
  handlePublishProjectRelease,
  handleArchiveProjectRelease,
} from './routes/admin';
import {
  handleCreateOrder,
  handleCreateOrderQr,
  handleDownloadDelivery,
  handleGetProjectAvailability,
  handleGetOrderById,
  handleVerifyPayment,
} from './routes/orders';
import { handleRazorpayWebhook } from './routes/webhooks';
import { handleRedeemPurchaseRecovery, handleRequestPurchaseRecovery } from './routes/purchaseRecovery';
import { EmailBindings } from './services/email/emailProvider';
import { KVNamespace, R2Bucket } from './services/assetStorage';
import { error } from './utils/api';
import { requireAuth } from './utils/auth';
import { buildCorsHeaders } from './utils/cors';
import {
  handleAdminCustomerStatus, handleAdminCustomerUsers, handleAdminPlatformMetrics,
  handleAnalytics, handleCustomerAuthStatus, handleCustomerLoginStart, handleCustomerLoginVerify,
  handleCustomerLogout, handleCustomerOrders, handleGetPublicSettings, handleGetPublicTools,
  handleUpdateSettings,
} from './routes/platform';
import { handleSitemap } from './routes/seo';
import {
  handleAdminAffiliateArchive, handleAdminAffiliateList, handleAdminAffiliateSave,
  handleAdsTxt, handleAffiliateClick, handlePublicAffiliateOffers,
} from './routes/monetization';
import { enforceRateLimit, ratePolicy } from './utils/rateLimit';

export interface Env extends EmailBindings {
  DB?: D1Database;
  ALLOWED_ORIGINS?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
  /** Private R2 bucket binding for secure digital delivery (Phase 9). */
  DIGITAL_DELIVERY_BUCKET?: R2Bucket;
  /** Active private KV namespace for MVP project ZIP storage. */
  PROJECT_ASSETS?: KVNamespace;
  /** Test-fixture compatibility only; never configured in production. */
  PURCHASE_AVAILABILITY_BYPASS?: string;
  /** Canonical frontend origin used for sitemap URLs. */
  SITE_ORIGIN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // --- CORS preflight ---
    if (method === 'OPTIONS') {
      const corsHeaders = buildCorsHeaders(request, env);
      if (!corsHeaders) {
        return error('VALIDATION_ERROR', 'Origin not allowed', 403);
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // --- Helper to attach CORS headers to responses ---
    const corsHeaders = buildCorsHeaders(request, env);
    const applyCors = (response: Response): Response => {
      const headers = new Headers(response.headers);
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Referrer-Policy', 'no-referrer');
      headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), usb=()');
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      if (corsHeaders) for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    };

    const policy = ratePolicy(path, method);
    if (policy) {
      const limited = await enforceRateLimit(request, ...policy);
      if (limited) return applyCors(limited);
    }

    try {
      // ----------------------------------------------------
      // Public Endpoints
      // ----------------------------------------------------

      if ((path === '/sitemap.xml' || path === '/api/seo/sitemap.xml') && method === 'GET') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleSitemap(env.DB, env.SITE_ORIGIN));
      }
      if ((path === '/ads.txt' || path === '/api/monetization/ads.txt') && method === 'GET') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleAdsTxt(env.DB));
      }

      // GET /api/health
      if (path === '/api/health' && method === 'GET') {
        return applyCors(await handleHealth(env.DB));
      }

      if (path === '/api/tools' && method === 'GET') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleGetPublicTools(env.DB));
      }
      if (path === '/api/site-settings/public' && method === 'GET') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleGetPublicSettings(env.DB));
      }
      if (path === '/api/customer-auth/status' && method === 'GET') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleCustomerAuthStatus(request, env.DB, env));
      }
      if (path === '/api/customer-auth/start' && method === 'POST') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleCustomerLoginStart(request, env.DB, env));
      }
      if (path === '/api/customer-auth/verify' && method === 'POST') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleCustomerLoginVerify(request, env.DB, env));
      }
      if (path === '/api/customer-auth/logout' && method === 'POST') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleCustomerLogout(request, env.DB));
      }
      if (path === '/api/customer/orders' && method === 'GET') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleCustomerOrders(request, env.DB));
      }
      if (path === '/api/analytics/events' && method === 'POST') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleAnalytics(request, env.DB));
      }
      if (path === '/api/affiliate-offers' && method === 'GET') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handlePublicAffiliateOffers(request, env.DB));
      }
      const affiliateClickMatch = path.match(/^\/api\/affiliate-offers\/(\d+)\/click$/);
      if (affiliateClickMatch && method === 'POST') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(await handleAffiliateClick(request, affiliateClickMatch[1], env.DB));
      }

      // POST /api/auth/bootstrap (One-time setup for initial admin)
      if (path === '/api/auth/bootstrap' && method === 'POST') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleBootstrap(request, env.DB));
      }

      // POST /api/auth/login
      if (path === '/api/auth/login' && method === 'POST') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleLogin(request, env.DB));
      }

      // POST /api/auth/logout
      if (path === '/api/auth/logout' && method === 'POST') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleLogout(request, env.DB));
      }

      // GET /api/auth/me
      if (path === '/api/auth/me' && method === 'GET') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleMe(request, env.DB));
      }

      // POST /api/requests (Public creation)
      if (path === '/api/requests' && method === 'POST') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleCreateRequest(request, env.DB));
      }

      // GET /api/requests/:requestId (Public safe status)
      const publicRequestMatch = path.match(/^\/api\/requests\/([^/]+)$/);
      if (publicRequestMatch && method === 'GET') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleGetRequestStatus(publicRequestMatch[1], env.DB));
      }

      // POST /api/orders (Public order creation)
      if (path === '/api/orders' && method === 'POST') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleCreateOrder(request, env.DB, env));
      }

      // GET /api/projects/:projectId/availability (safe release readiness)
      const projectAvailabilityMatch = path.match(/^\/api\/projects\/([^/]+)\/availability$/);
      if (projectAvailabilityMatch && method === 'GET') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        return applyCors(
          await handleGetProjectAvailability(projectAvailabilityMatch[1], env.DB, env)
        );
      }

      if (path === '/api/purchases/recovery/request' && method === 'POST') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        if (!env.EMAIL_PROVIDER && !(env.RESEND_API_KEY && env.EMAIL_FROM)) {
          return applyCors(error('FEATURE_NOT_ENABLED', 'Purchase recovery email is not configured yet.', 503));
        }
        return applyCors(await handleRequestPurchaseRecovery(request, env.DB, env));
      }

      if (path === '/api/purchases/recovery/redeem' && method === 'POST') {
        if (!env.DB) return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        if (!env.EMAIL_PROVIDER && !(env.RESEND_API_KEY && env.EMAIL_FROM)) {
          return applyCors(error('FEATURE_NOT_ENABLED', 'Purchase recovery email is not configured yet.', 503));
        }
        return applyCors(await handleRedeemPurchaseRecovery(request, env.DB));
      }

      // POST /api/orders/:orderId/verify-payment (Payment signature verification)
      const orderVerifyMatch = path.match(/^\/api\/orders\/([^/]+)\/verify-payment$/);
      if (orderVerifyMatch && method === 'POST') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleVerifyPayment(request, orderVerifyMatch[1], env.DB, env));
      }

      // POST /api/orders/:orderId/payment/qr (Dynamic UPI QR with authoritative locked amount)
      const orderQrMatch = path.match(/^\/api\/orders\/([^/]+)\/payment\/qr$/);
      if (orderQrMatch && method === 'POST') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleCreateOrderQr(request, orderQrMatch[1], env.DB, env));
      }

      // GET /api/orders/:orderId (Public safe order status)
      const publicOrderMatch = path.match(/^\/api\/orders\/([^/]+)$/);
      if (publicOrderMatch && method === 'GET') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleGetOrderById(request, publicOrderMatch[1], env.DB, env));
      }

      // GET /api/orders/:orderId/download (Secure digital delivery download, Phase 9)
      const orderDownloadMatch = path.match(/^\/api\/orders\/([^/]+)\/download$/);
      if (orderDownloadMatch && method === 'GET') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleDownloadDelivery(request, orderDownloadMatch[1], env.DB, env));
      }

      // POST /api/webhooks/razorpay (Razorpay server-to-server webhook reconciliation)
      if (path === '/api/webhooks/razorpay' && method === 'POST') {
        if (!env.DB) {
          return error('INTERNAL_ERROR', 'Database is not configured', 500);
        }
        return await handleRazorpayWebhook(request, env.DB, env);
      }

      // ----------------------------------------------------
      // Protected Admin Endpoints (/api/admin/*)
      // ----------------------------------------------------
      if (path.startsWith('/api/admin/')) {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }

        // Server-side auth gate
        const authResult = await requireAuth(request, env.DB);
        if (authResult instanceof Response) {
          return applyCors(authResult);
        }

        // --- Dashboard Metrics ---
        if (path === '/api/admin/dashboard/metrics' && method === 'GET') {
          return applyCors(await handleGetAdminMetrics(env.DB));
        }
        if (path === '/api/admin/analytics' && method === 'GET') {
          return applyCors(await handleAdminPlatformMetrics(env.DB));
        }
        if (path === '/api/admin/settings' && method === 'GET') {
          return applyCors(await handleGetPublicSettings(env.DB));
        }
        if (path === '/api/admin/settings' && method === 'PUT') {
          return applyCors(await handleUpdateSettings(request, env.DB));
        }
        if (path === '/api/admin/affiliate-offers' && method === 'GET') {
          return applyCors(await handleAdminAffiliateList(env.DB));
        }
        if (path === '/api/admin/affiliate-offers' && method === 'POST') {
          return applyCors(await handleAdminAffiliateSave(request, env.DB));
        }
        const adminAffiliateMatch = path.match(/^\/api\/admin\/affiliate-offers\/(\d+)$/);
        if (adminAffiliateMatch && method === 'PUT') {
          return applyCors(await handleAdminAffiliateSave(request, env.DB, adminAffiliateMatch[1]));
        }
        if (adminAffiliateMatch && method === 'DELETE') {
          return applyCors(await handleAdminAffiliateArchive(adminAffiliateMatch[1], env.DB));
        }
        if (path === '/api/admin/users' && method === 'GET') {
          return applyCors(await handleAdminCustomerUsers(env.DB));
        }
        const adminCustomerMatch = path.match(/^\/api\/admin\/users\/(\d+)\/status$/);
        if (adminCustomerMatch && method === 'PATCH') {
          return applyCors(await handleAdminCustomerStatus(request, adminCustomerMatch[1], env.DB));
        }

        // --- Admin Tools ---
        if (path === '/api/admin/tools' && method === 'GET') {
          return applyCors(await handleGetAdminTools(env.DB));
        }
        if (path === '/api/admin/tools' && method === 'POST') {
          return applyCors(await handleSaveAdminTool(request, env.DB));
        }
        const adminToolMatch = path.match(/^\/api\/admin\/tools\/([^/]+)$/);
        if (adminToolMatch && method === 'PUT') {
          return applyCors(await handleUpdateAdminTool(request, adminToolMatch[1], env.DB));
        }
        if (adminToolMatch && method === 'DELETE') {
          return applyCors(await handleDeleteAdminTool(adminToolMatch[1], env.DB));
        }

        // --- Admin Projects ---
        if (path === '/api/admin/projects' && method === 'GET') {
          return applyCors(await handleGetAdminProjects(env.DB));
        }
        if (path === '/api/admin/projects' && method === 'POST') {
          return applyCors(await handleSaveAdminProject(request, env.DB));
        }
        const projectReleaseActionMatch = path.match(
          /^\/api\/admin\/projects\/([^/]+)\/releases\/(\d+)\/(publish|archive)$/
        );
        if (projectReleaseActionMatch && method === 'POST') {
          const projectId = projectReleaseActionMatch[1];
          const releaseId = Number(projectReleaseActionMatch[2]);
          return applyCors(
            projectReleaseActionMatch[3] === 'publish'
              ? await handlePublishProjectRelease(projectId, releaseId, env.DB, env)
              : await handleArchiveProjectRelease(projectId, releaseId, env.DB)
          );
        }
        const projectReleasesMatch = path.match(
          /^\/api\/admin\/projects\/([^/]+)\/releases$/
        );
        if (projectReleasesMatch && method === 'GET') {
          return applyCors(await handleGetProjectReleases(projectReleasesMatch[1], env.DB));
        }
        if (projectReleasesMatch && method === 'POST') {
          return applyCors(
            await handleUploadProjectRelease(request, projectReleasesMatch[1], env.DB, env)
          );
        }
        const adminProjectMatch = path.match(/^\/api\/admin\/projects\/([^/]+)$/);
        if (adminProjectMatch && method === 'PUT') {
          return applyCors(await handleUpdateAdminProject(request, adminProjectMatch[1], env.DB));
        }
        if (adminProjectMatch && method === 'DELETE') {
          return applyCors(await handleDeleteAdminProject(adminProjectMatch[1], env.DB));
        }

        // --- Admin Services ---
        if (path === '/api/admin/services' && method === 'GET') {
          return applyCors(await handleGetAdminServices(env.DB));
        }
        if (path === '/api/admin/services' && method === 'POST') {
          return applyCors(await handleSaveAdminService(request, env.DB));
        }
        const adminServiceMatch = path.match(/^\/api\/admin\/services\/([^/]+)$/);
        if (adminServiceMatch && method === 'PUT') {
          return applyCors(await handleUpdateAdminService(request, adminServiceMatch[1], env.DB));
        }
        if (adminServiceMatch && method === 'DELETE') {
          return applyCors(await handleDeleteAdminService(adminServiceMatch[1], env.DB));
        }

        // --- Admin Categories ---
        if (path === '/api/admin/categories' && method === 'GET') {
          return applyCors(await handleGetAdminCategories(env.DB));
        }
        if (path === '/api/admin/categories' && method === 'POST') {
          return applyCors(await handleSaveAdminCategory(request, env.DB));
        }
        const adminCategoryMatch = path.match(/^\/api\/admin\/categories\/([^/]+)$/);
        if (adminCategoryMatch && method === 'PUT') {
          return applyCors(await handleUpdateAdminCategory(request, adminCategoryMatch[1], env.DB));
        }
        if (adminCategoryMatch && method === 'DELETE') {
          return applyCors(await handleDeleteAdminCategory(adminCategoryMatch[1], request, env.DB));
        }

        // --- Admin Requests ---
        if (path === '/api/admin/requests' && method === 'GET') {
          return applyCors(await handleGetAdminRequests(env.DB));
        }
        const adminRequestStatusMatch = path.match(/^\/api\/admin\/requests\/([^/]+)\/status$/);
        if (adminRequestStatusMatch && method === 'PATCH') {
          return applyCors(
            await handleUpdateAdminRequestStatus(request, adminRequestStatusMatch[1], env.DB)
          );
        }
        const adminRequestDetailMatch = path.match(/^\/api\/admin\/requests\/([^/]+)$/);
        if (adminRequestDetailMatch && method === 'GET') {
          return applyCors(await handleGetAdminRequestById(adminRequestDetailMatch[1], env.DB));
        }

        // Admin route matched path but not method
        return applyCors(error('METHOD_NOT_ALLOWED', 'Method not allowed', 405));
      }

      // Known public paths wrong method
      if (
        (path === '/api/health' && method !== 'GET') ||
        ((path === '/sitemap.xml' || path === '/api/seo/sitemap.xml') && method !== 'GET') ||
        ((path === '/ads.txt' || path === '/api/monetization/ads.txt') && method !== 'GET') ||
        (path === '/api/affiliate-offers' && method !== 'GET') ||
        (affiliateClickMatch && method !== 'POST') ||
        (path === '/api/auth/bootstrap' && method !== 'POST') ||
        (path === '/api/auth/login' && method !== 'POST') ||
        (path === '/api/auth/logout' && method !== 'POST') ||
        (path === '/api/auth/me' && method !== 'GET') ||
        (path === '/api/requests' && method !== 'POST') ||
        (publicRequestMatch && method !== 'GET') ||
        (path === '/api/orders' && method !== 'POST') ||
        (projectAvailabilityMatch && method !== 'GET') ||
        (path === '/api/purchases/recovery/request' && method !== 'POST') ||
        (path === '/api/purchases/recovery/redeem' && method !== 'POST') ||
        (orderVerifyMatch && method !== 'POST') ||
        (orderQrMatch && method !== 'POST') ||
        (publicOrderMatch && method !== 'GET') ||
        (orderDownloadMatch && method !== 'GET') ||
        (path === '/api/webhooks/razorpay' && method !== 'POST')
      ) {
        return applyCors(error('METHOD_NOT_ALLOWED', 'Method not allowed', 405));
      }

      // Unknown route
      return applyCors(error('NOT_FOUND', 'Route not found', 404));
    } catch (err) {
      console.error('Unhandled worker error:', err);
      return applyCors(error('INTERNAL_ERROR', 'Internal server error', 500));
    }
  },
};
