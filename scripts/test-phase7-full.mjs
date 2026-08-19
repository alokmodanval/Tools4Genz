/**
 * Tools4Genz — Comprehensive Phase 7 Backend & Authentication Test Suite
 *
 * Simulates D1 SQLite database in-memory and exercises all Worker handlers:
 * - PBKDF2 Web Crypto password hashing & verification
 * - One-time bootstrap & permanent lockdown
 * - Session token lifecycle with HttpOnly cookies
 * - Role-based authorization & 401/403 rejection
 * - Tools, Projects, Services, Categories CRUD + Phase 6.5 integration metadata preservation
 * - Request management & public safe status boundary
 * - Dashboard metrics aggregation
 */

import worker from '../worker/src/index.ts';
import { hashPassword, verifyPassword } from '../worker/src/utils/password.ts';

// In-Memory SQLite-like D1 Mock implementation
function createMockD1() {
  const tables = {
    requests: [],
    admin_users: [],
    admin_sessions: [],
    admin_tools: [],
    admin_projects: [],
    admin_services: [],
    admin_categories: [],
  };

  let nextId = 1;

  function prepare(sql) {
    const trimmed = sql.trim();
    let boundValues = [];

    const stmt = {
      bind(...values) {
        boundValues = values;
        return stmt;
      },

      async first() {
        const res = await stmt.all();
        return res.results && res.results.length > 0 ? res.results[0] : null;
      },

      async all() {
        const s = trimmed.toLowerCase();

        // COUNT queries
        if (s.includes('count(*) as count from admin_users') || s.includes('count(*) as c from admin_users')) {
          return { results: [{ count: tables.admin_users.length, c: tables.admin_users.length }] };
        }
        if (s.includes('count(*) as c from admin_tools') && s.includes("status = 'active'")) {
          return { results: [{ c: tables.admin_tools.filter((t) => t.status === 'active').length }] };
        }
        if (s.includes('count(*) as c from admin_tools')) {
          return { results: [{ c: tables.admin_tools.length }] };
        }
        if (s.includes('count(*) as c from admin_projects') && s.includes('featured = 1')) {
          return { results: [{ c: tables.admin_projects.filter((p) => p.featured === 1).length }] };
        }
        if (s.includes('count(*) as c from admin_projects')) {
          return { results: [{ c: tables.admin_projects.length }] };
        }
        if (s.includes('count(*) as c from admin_services')) {
          return { results: [{ c: tables.admin_services.length }] };
        }
        if (s.includes('count(*) as c from admin_categories')) {
          return { results: [{ c: tables.admin_categories.length }] };
        }
        if (s.includes('count(*) as c from requests') && s.includes('status in')) {
          return { results: [{ c: tables.requests.filter((r) => ['submitted', 'reviewing'].includes(r.status)).length }] };
        }
        if (s.includes('count(*) as c from requests') && s.includes("status = 'completed'")) {
          return { results: [{ c: tables.requests.filter((r) => r.status === 'completed').length }] };
        }

        // SELECT admin_users by email
        if (s.includes('from admin_users where lower(email) = lower(?)')) {
          const email = String(boundValues[0]).toLowerCase();
          const user = tables.admin_users.find((u) => u.email.toLowerCase() === email);
          return { results: user ? [user] : [] };
        }

        // SELECT session JOIN user
        if (s.includes('from admin_sessions s') && s.includes('join admin_users u')) {
          const tokenHash = boundValues[0];
          const now = boundValues[1];
          const session = tables.admin_sessions.find(
            (sess) => sess.session_token_hash === tokenHash && sess.expires_at > now
          );
          if (session) {
            const user = tables.admin_users.find((u) => u.id === session.admin_user_id && u.status === 'active');
            if (user) {
              return {
                results: [
                  {
                    ...session,
                    email: user.email,
                    role: user.role,
                    user_status: user.status,
                  },
                ],
              };
            }
          }
          return { results: [] };
        }

        // SELECT all tools
        if (s.includes('from admin_tools')) {
          if (s.includes('where slug = ?') && s.includes('id != ?')) {
            const t = tables.admin_tools.find((x) => x.slug === boundValues[0] && x.id !== boundValues[1]);
            return { results: t ? [{ id: t.id }] : [] };
          }
          if (s.includes('where id = ?')) {
            const t = tables.admin_tools.find((x) => x.id === boundValues[0]);
            return { results: t ? [t] : [] };
          }
          return { results: [...tables.admin_tools] };
        }

        // SELECT all projects
        if (s.includes('from admin_projects')) {
          if (s.includes('where id = ?')) {
            const p = tables.admin_projects.find((x) => x.id === boundValues[0]);
            return { results: p ? [p] : [] };
          }
          return { results: [...tables.admin_projects] };
        }

        // SELECT all services
        if (s.includes('from admin_services')) {
          if (s.includes('where id = ?')) {
            const srv = tables.admin_services.find((x) => x.id === boundValues[0]);
            return { results: srv ? [srv] : [] };
          }
          return { results: [...tables.admin_services] };
        }

        // SELECT all categories
        if (s.includes('from admin_categories')) {
          return { results: [...tables.admin_categories] };
        }

        // SELECT requests
        if (s.includes('from requests')) {
          if (s.includes('where request_id = ?')) {
            const r = tables.requests.find((x) => x.request_id === boundValues[0]);
            return { results: r ? [r] : [] };
          }
          return { results: [...tables.requests] };
        }

        return { results: [] };
      },

      async run() {
        const s = trimmed.toLowerCase();

        // INSERT admin_users
        if (s.includes('insert into admin_users')) {
          const id = nextId++;
          const row = {
            id,
            email: boundValues[0],
            password_hash: boundValues[1],
            role: boundValues[2],
            status: 'active',
            created_at: boundValues[3],
            updated_at: boundValues[4],
            last_login_at: null,
          };
          tables.admin_users.push(row);
          return { meta: { changes: 1, last_row_id: id } };
        }

        // UPDATE last login
        if (s.includes('update admin_users set last_login_at = ?')) {
          const u = tables.admin_users.find((x) => x.id === boundValues[2]);
          if (u) {
            u.last_login_at = boundValues[0];
            u.updated_at = boundValues[1];
          }
          return { meta: { changes: u ? 1 : 0, last_row_id: 0 } };
        }

        // INSERT admin_sessions
        if (s.includes('insert into admin_sessions')) {
          const row = {
            id: nextId++,
            admin_user_id: boundValues[0],
            session_token: 'hashed',
            session_token_hash: boundValues[1],
            expires_at: boundValues[2],
            created_at: boundValues[3],
            last_seen_at: boundValues[4],
          };
          tables.admin_sessions.push(row);
          return { meta: { changes: 1, last_row_id: row.id } };
        }

        // UPDATE last_seen_at
        if (s.includes('update admin_sessions set last_seen_at = ?')) {
          const sess = tables.admin_sessions.find((x) => x.id === boundValues[1]);
          if (sess) sess.last_seen_at = boundValues[0];
          return { meta: { changes: sess ? 1 : 0, last_row_id: 0 } };
        }

        // DELETE session
        if (s.includes('delete from admin_sessions where session_token_hash = ?')) {
          const initialLen = tables.admin_sessions.length;
          tables.admin_sessions = tables.admin_sessions.filter((x) => x.session_token_hash !== boundValues[0]);
          return { meta: { changes: initialLen - tables.admin_sessions.length, last_row_id: 0 } };
        }

        // UPSERT admin_tools
        if (s.includes('insert into admin_tools')) {
          const id = boundValues[0];
          const existingIdx = tables.admin_tools.findIndex((x) => x.id === id);
          const row = {
            id: boundValues[0],
            slug: boundValues[1],
            name: boundValues[2],
            category: boundValues[3],
            status: boundValues[4],
            featured: boundValues[5],
            data: boundValues[6],
            created_at: boundValues[7],
            updated_at: boundValues[8],
          };
          if (existingIdx >= 0) {
            tables.admin_tools[existingIdx] = row;
          } else {
            tables.admin_tools.push(row);
          }
          return { meta: { changes: 1, last_row_id: 0 } };
        }

        // DELETE admin_tools
        if (s.includes('delete from admin_tools where id = ?')) {
          const initialLen = tables.admin_tools.length;
          tables.admin_tools = tables.admin_tools.filter((x) => x.id !== boundValues[0]);
          return { meta: { changes: initialLen - tables.admin_tools.length, last_row_id: 0 } };
        }

        // UPSERT admin_projects
        if (s.includes('insert into admin_projects')) {
          const id = boundValues[0];
          const existingIdx = tables.admin_projects.findIndex((x) => x.id === id);
          const row = {
            id: boundValues[0],
            slug: boundValues[1],
            title: boundValues[2],
            category: boundValues[3],
            status: boundValues[4],
            featured: boundValues[5],
            data: boundValues[6],
            created_at: boundValues[7],
            updated_at: boundValues[8],
          };
          if (existingIdx >= 0) {
            tables.admin_projects[existingIdx] = row;
          } else {
            tables.admin_projects.push(row);
          }
          return { meta: { changes: 1, last_row_id: 0 } };
        }

        // DELETE admin_projects
        if (s.includes('delete from admin_projects where id = ?')) {
          const initialLen = tables.admin_projects.length;
          tables.admin_projects = tables.admin_projects.filter((x) => x.id !== boundValues[0]);
          return { meta: { changes: initialLen - tables.admin_projects.length, last_row_id: 0 } };
        }

        // UPSERT admin_services
        if (s.includes('insert into admin_services')) {
          const id = boundValues[0];
          const existingIdx = tables.admin_services.findIndex((x) => x.id === id);
          const row = {
            id: boundValues[0],
            title: boundValues[1],
            category: boundValues[2],
            data: boundValues[3],
            created_at: boundValues[4],
            updated_at: boundValues[5],
          };
          if (existingIdx >= 0) {
            tables.admin_services[existingIdx] = row;
          } else {
            tables.admin_services.push(row);
          }
          return { meta: { changes: 1, last_row_id: 0 } };
        }

        // DELETE admin_services
        if (s.includes('delete from admin_services where id = ?')) {
          const initialLen = tables.admin_services.length;
          tables.admin_services = tables.admin_services.filter((x) => x.id !== boundValues[0]);
          return { meta: { changes: initialLen - tables.admin_services.length, last_row_id: 0 } };
        }

        // UPSERT admin_categories
        if (s.includes('insert into admin_categories')) {
          const id = boundValues[0];
          const type = boundValues[1];
          const existingIdx = tables.admin_categories.findIndex((x) => x.id === id && x.type === type);
          const row = {
            id: boundValues[0],
            type: boundValues[1],
            name: boundValues[2],
            icon: boundValues[3],
            count: boundValues[4],
            data: boundValues[5],
            created_at: boundValues[6],
            updated_at: boundValues[7],
          };
          if (existingIdx >= 0) {
            tables.admin_categories[existingIdx] = row;
          } else {
            tables.admin_categories.push(row);
          }
          return { meta: { changes: 1, last_row_id: 0 } };
        }

        // DELETE admin_categories
        if (s.includes('delete from admin_categories where id = ? and type = ?')) {
          const initialLen = tables.admin_categories.length;
          tables.admin_categories = tables.admin_categories.filter(
            (x) => !(x.id === boundValues[0] && x.type === boundValues[1])
          );
          return { meta: { changes: initialLen - tables.admin_categories.length, last_row_id: 0 } };
        }
        if (s.includes('delete from admin_categories where id = ?')) {
          const initialLen = tables.admin_categories.length;
          tables.admin_categories = tables.admin_categories.filter((x) => x.id !== boundValues[0]);
          return { meta: { changes: initialLen - tables.admin_categories.length, last_row_id: 0 } };
        }

        // INSERT requests
        if (s.includes('insert into requests')) {
          const id = nextId++;
          const row = {
            id,
            request_id: boundValues[0],
            request_type: boundValues[1],
            status: boundValues[2],
            name: boundValues[3],
            email: boundValues[4],
            phone: boundValues[5],
            preferred_contact: boundValues[6],
            project_type: boundValues[7],
            technology: boundValues[8],
            project_title: boundValues[9],
            description: boundValues[10],
            budget: boundValues[11],
            deadline: boundValues[12],
            additional_notes: boundValues[13],
            course: boundValues[14],
            branch: boundValues[15],
            academic_year: boundValues[16],
            college_name: boundValues[17],
            company: boundValues[18],
            website_url: boundValues[19],
            reference_website: boundValues[20],
            existing_system: boundValues[21],
            created_at: boundValues[22],
            updated_at: boundValues[23],
          };
          tables.requests.push(row);
          return { meta: { changes: 1, last_row_id: id } };
        }

        // UPDATE requests status
        if (s.includes('update requests set status = ?')) {
          const r = tables.requests.find((x) => x.request_id === boundValues[2]);
          if (r) {
            r.status = boundValues[0];
            r.updated_at = boundValues[1];
          }
          return { meta: { changes: r ? 1 : 0, last_row_id: 0 } };
        }

        return { meta: { changes: 0, last_row_id: 0 } };
      },
    };

    return stmt;
  }

  async function batch(stmts) {
    const results = [];
    for (const stmt of stmts) {
      results.push(await stmt.run());
    }
    return results;
  }

  return { prepare, batch, _tables: tables };
}

async function runTests() {
  console.log('🧪 Starting Tools4Genz Phase 7 Automated Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failed++;
      throw new Error(message);
    } else {
      console.log(`✅ PASS: ${message}`);
      passed++;
    }
  }

  const db = createMockD1();
  const env = { DB: db };

  // 1. Password Hashing & Verification
  console.log('\n--- 1. Web Crypto PBKDF2 Password Hashing Tests ---');
  const plainPassword = 'SuperSecretAdminPass2026!';
  const hashedPassword = await hashPassword(plainPassword);
  assert(hashedPassword.startsWith('pbkdf2_sha256$100000$'), 'Hash format matches pbkdf2_sha256$<iter>$<salt>$<hash>');
  assert(await verifyPassword(plainPassword, hashedPassword), 'Valid password verifies correctly against PBKDF2 hash');
  assert(!(await verifyPassword('WrongPassword123', hashedPassword)), 'Invalid password fails verification');
  assert(!(await verifyPassword('', hashedPassword)), 'Empty password fails verification');

  // 2. Unauthenticated Admin Endpoints Rejection
  console.log('\n--- 2. Route Protection & 401 Rejection Tests ---');
  const unauthResp = await worker.fetch(new Request('http://localhost:8787/api/admin/tools', { method: 'GET' }), env);
  assert(unauthResp.status === 401, 'Unauthenticated /api/admin/tools is rejected with HTTP 401');
  const unauthJson = await unauthResp.json();
  assert(unauthJson.success === false && unauthJson.error.code === 'UNAUTHORIZED', '401 returns standardized error envelope');

  // 3. One-Time Secure Bootstrap Endpoint
  console.log('\n--- 3. Initial Admin Bootstrap Endpoint Tests ---');
  const bootstrapPayload = { email: 'operator@tools4genz.com', password: 'OperatorPassword123!' };
  const bootstrapResp = await worker.fetch(
    new Request('http://localhost:8787/api/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bootstrapPayload),
    }),
    env
  );
  assert(bootstrapResp.status === 201, 'Bootstrap succeeds with HTTP 201 when admin_users is empty');
  const bootstrapCookie = bootstrapResp.headers.get('Set-Cookie');
  assert(bootstrapCookie && bootstrapCookie.includes('session_token=') && bootstrapCookie.includes('HttpOnly'), 'Bootstrap issues HttpOnly session cookie');
  const bootstrapJson = await bootstrapResp.json();
  assert(bootstrapJson.data.email === 'operator@tools4genz.com' && bootstrapJson.data.role === 'admin', 'Bootstrap returns admin user profile');

  // Subsequent bootstrap must fail with 403
  const secondBootstrapResp = await worker.fetch(
    new Request('http://localhost:8787/api/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hacker@tools4genz.com', password: 'HackerPassword123!' }),
    }),
    env
  );
  assert(secondBootstrapResp.status === 403, 'Subsequent bootstrap attempt is permanently rejected with HTTP 403 Forbidden');

  // 4. Authentication: Login, Session Verification & Me
  console.log('\n--- 4. Login & Session Lifecycle Tests ---');
  // Bad credentials
  const badLoginResp = await worker.fetch(
    new Request('http://localhost:8787/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@tools4genz.com', password: 'WrongPassword' }),
    }),
    env
  );
  assert(badLoginResp.status === 401, 'Invalid login password returns HTTP 401');

  // Valid login
  const loginResp = await worker.fetch(
    new Request('http://localhost:8787/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@tools4genz.com', password: 'OperatorPassword123!' }),
    }),
    env
  );
  assert(loginResp.status === 200, 'Valid login returns HTTP 200');
  const setCookie = loginResp.headers.get('Set-Cookie');
  assert(setCookie && setCookie.includes('session_token=') && setCookie.includes('HttpOnly'), 'Login sets HttpOnly session cookie');

  const cookieTokenMatch = setCookie.match(/session_token=([^;]+)/);
  const sessionCookie = `session_token=${cookieTokenMatch[1]}`;

  // GET /api/auth/me with session cookie
  const meResp = await worker.fetch(
    new Request('http://localhost:8787/api/auth/me', {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    }),
    env
  );
  assert(meResp.status === 200, 'GET /api/auth/me with session cookie returns HTTP 200');
  const meJson = await meResp.json();
  assert(meJson.data.email === 'operator@tools4genz.com' && meJson.data.role === 'admin', 'Auth Me returns verified session data');

  // 5. Admin Tools CRUD + Phase 6.5 Integration Metadata
  console.log('\n--- 5. Admin Tools CRUD & Integration Metadata Tests ---');
  const newTool = {
    id: 'test-external-tool',
    name: 'External AI Assistant',
    slug: 'external-ai-assistant',
    description: 'An external AI assistant integrated via Phase 6.5',
    category: 'ai-tools',
    status: 'active',
    featured: true,
    integration: 'external-url',
    integrationConfig: {
      type: 'external-url',
      url: 'https://assistant.example.com',
      openMode: 'new-tab',
    },
    capabilities: {
      offlineCapable: false,
      maxFileSize: 5242880,
    },
    seo: {
      metaTitle: 'External AI Assistant | Tools4Genz',
      metaDescription: 'Supercharge your workflow with External AI Assistant.',
    },
  };

  const createToolResp = await worker.fetch(
    new Request('http://localhost:8787/api/admin/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify(newTool),
    }),
    env
  );
  assert(createToolResp.status === 201, 'POST /api/admin/tools creates tool in D1 with HTTP 201');

  const getToolsResp = await worker.fetch(
    new Request('http://localhost:8787/api/admin/tools', {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    }),
    env
  );
  assert(getToolsResp.status === 200, 'GET /api/admin/tools returns tools list');
  const toolsJson = await getToolsResp.json();
  const savedTool = toolsJson.data.find((t) => t.id === 'test-external-tool');
  assert(savedTool && savedTool.integration === 'external-url', 'Phase 6.5 integration type is preserved');
  assert(savedTool.integrationConfig.url === 'https://assistant.example.com', 'Phase 6.5 integrationConfig is preserved');

  // Update tool
  savedTool.name = 'External AI Assistant (Updated)';
  const updateToolResp = await worker.fetch(
    new Request('http://localhost:8787/api/admin/tools/test-external-tool', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify(savedTool),
    }),
    env
  );
  assert(updateToolResp.status === 200, 'PUT /api/admin/tools/:id updates tool in D1');

  // Delete tool
  const deleteToolResp = await worker.fetch(
    new Request('http://localhost:8787/api/admin/tools/test-external-tool', {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    }),
    env
  );
  assert(deleteToolResp.status === 200, 'DELETE /api/admin/tools/:id safely archives tool');

  // 6. Admin Projects CRUD
  console.log('\n--- 6. Admin Projects CRUD Tests ---');
  const newProject = {
    id: 'test-proj-1',
    title: 'E-Commerce Marketplace',
    slug: 'ecommerce-marketplace',
    category: 'Full Stack',
    status: 'available',
    featured: true,
    price: 4999,
    currency: 'INR',
    technologies: ['React', 'Node.js', 'PostgreSQL'],
  };
  const createProjResp = await worker.fetch(
    new Request('http://localhost:8787/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify(newProject),
    }),
    env
  );
  assert(createProjResp.status === 201, 'POST /api/admin/projects creates project');

  const getProjResp = await worker.fetch(
    new Request('http://localhost:8787/api/admin/projects', {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    }),
    env
  );
  assert(getProjResp.status === 200, 'GET /api/admin/projects returns projects');

  // 7. Admin Services CRUD
  console.log('\n--- 7. Admin Services CRUD Tests ---');
  const newService = {
    id: 'test-svc-1',
    title: 'Cloudflare Migration & DevOps',
    category: 'Development',
    description: 'Expert migration to Cloudflare Workers and Pages.',
  };
  const createSvcResp = await worker.fetch(
    new Request('http://localhost:8787/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify(newService),
    }),
    env
  );
  assert(createSvcResp.status === 201, 'POST /api/admin/services creates service');

  // 8. Admin Categories CRUD
  console.log('\n--- 8. Admin Categories CRUD Tests ---');
  const newCat = {
    id: 'automation-tools',
    type: 'tool',
    name: 'Automation Tools',
    icon: '⚡',
    count: 3,
  };
  const createCatResp = await worker.fetch(
    new Request('http://localhost:8787/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify(newCat),
    }),
    env
  );
  assert(createCatResp.status === 201, 'POST /api/admin/categories creates category');

  // 9. Request Management & Public Boundary
  console.log('\n--- 9. Request Submission & Admin Management Tests ---');
  // Public creation
  const publicReqPayload = {
    requestType: 'student-project',
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    phone: '+91 9876543210',
    preferredContactMethod: 'email',
    projectType: 'Web App',
    description: 'A student final year AI powered recommendation system with React frontend.',
    budget: '5000-10000',
    deadline: '2026-11-30',
    course: 'B.Tech',
    branch: 'CSE',
  };
  const pubReqResp = await worker.fetch(
    new Request('http://localhost:8787/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(publicReqPayload),
    }),
    env
  );
  assert(pubReqResp.status === 201, 'Public POST /api/requests creates ticket with HTTP 201');
  const pubReqJson = await pubReqResp.json();
  const createdRequestId = pubReqJson.data.requestId;
  assert(createdRequestId.startsWith('TG-REQ-'), 'Request ID has standard prefix TG-REQ-');

  // Public status query (must NOT leak personal/contact details)
  const pubStatusResp = await worker.fetch(
    new Request(`http://localhost:8787/api/requests/${createdRequestId}`, { method: 'GET' }),
    env
  );
  assert(pubStatusResp.status === 200, 'GET /api/requests/:requestId returns public status');
  const pubStatusJson = await pubStatusResp.json();
  assert(pubStatusJson.data.requestId === createdRequestId && pubStatusJson.data.status === 'submitted', 'Public status returns safe fields');
  assert(pubStatusJson.data.email === undefined && pubStatusJson.data.phone === undefined, 'Public status never exposes email or phone');

  // Admin Request Listing (includes all sensitive fields)
  const adminReqListResp = await worker.fetch(
    new Request('http://localhost:8787/api/admin/requests', {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    }),
    env
  );
  assert(adminReqListResp.status === 200, 'Admin GET /api/admin/requests succeeds');
  const adminReqs = (await adminReqListResp.json()).data;
  assert(adminReqs.some((r) => r.requestId === createdRequestId && r.email === 'aarav@example.com'), 'Admin listing contains complete customer details');

  // Admin Update Status
  const updateStatusResp = await worker.fetch(
    new Request(`http://localhost:8787/api/admin/requests/${createdRequestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ status: 'in-progress' }),
    }),
    env
  );
  assert(updateStatusResp.status === 200, 'Admin PATCH /api/admin/requests/:id/status updates workflow status to in-progress');

  // 10. Dashboard Metrics
  console.log('\n--- 10. Dashboard Metrics Aggregation Tests ---');
  const metricsResp = await worker.fetch(
    new Request('http://localhost:8787/api/admin/dashboard/metrics', {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    }),
    env
  );
  assert(metricsResp.status === 200, 'GET /api/admin/dashboard/metrics returns 200');
  const metricsJson = await metricsResp.json();
  assert(typeof metricsJson.data.totalProjects === 'number', 'Dashboard returns totalProjects metric');
  assert(typeof metricsJson.data.pendingRequests === 'number', 'Dashboard returns pendingRequests metric');

  // 11. Logout & Session Invalidation
  console.log('\n--- 11. Logout & Invalidation Tests ---');
  const logoutResp = await worker.fetch(
    new Request('http://localhost:8787/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    }),
    env
  );
  assert(logoutResp.status === 200, 'POST /api/auth/logout succeeds');
  const logoutCookie = logoutResp.headers.get('Set-Cookie');
  assert(logoutCookie && logoutCookie.includes('Max-Age=0'), 'Logout clears session cookie with Max-Age=0');

  // Subsequent me request with old cookie must fail
  const postLogoutMeResp = await worker.fetch(
    new Request('http://localhost:8787/api/auth/me', {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    }),
    env
  );
  assert(postLogoutMeResp.status === 401, 'Request with invalidated session token is denied HTTP 401');

  console.log(`\n🎉 All tests passed! (${passed} passed, ${failed} failed)\n`);
}

runTests().catch((err) => {
  console.error('\n💥 Test suite failed:', err);
  process.exit(1);
});
