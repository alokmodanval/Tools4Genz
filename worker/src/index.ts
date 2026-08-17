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
} from './routes/admin';
import {
  handleCreateOrder,
  handleGetOrderById,
  handleVerifyPayment,
} from './routes/orders';
import { error } from './utils/api';
import { requireAuth } from './utils/auth';
import { buildCorsHeaders } from './utils/cors';

export interface Env {
  DB?: D1Database;
  ALLOWED_ORIGINS?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
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
      if (!corsHeaders) return response;
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
      }
      return new Response(response.body, { status: response.status, headers });
    };

    try {
      // ----------------------------------------------------
      // Public Endpoints
      // ----------------------------------------------------

      // GET /api/health
      if (path === '/api/health' && method === 'GET') {
        return applyCors(await handleHealth(env.DB));
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

      // POST /api/orders/:orderId/verify-payment (Payment signature verification)
      const orderVerifyMatch = path.match(/^\/api\/orders\/([^/]+)\/verify-payment$/);
      if (orderVerifyMatch && method === 'POST') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleVerifyPayment(request, orderVerifyMatch[1], env.DB, env));
      }

      // GET /api/orders/:orderId (Public safe order status)
      const publicOrderMatch = path.match(/^\/api\/orders\/([^/]+)$/);
      if (publicOrderMatch && method === 'GET') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleGetOrderById(publicOrderMatch[1], env.DB));
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
        (path === '/api/auth/bootstrap' && method !== 'POST') ||
        (path === '/api/auth/login' && method !== 'POST') ||
        (path === '/api/auth/logout' && method !== 'POST') ||
        (path === '/api/auth/me' && method !== 'GET') ||
        (path === '/api/requests' && method !== 'POST') ||
        (publicRequestMatch && method !== 'GET') ||
        (path === '/api/orders' && method !== 'POST') ||
        (orderVerifyMatch && method !== 'POST') ||
        (publicOrderMatch && method !== 'GET')
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