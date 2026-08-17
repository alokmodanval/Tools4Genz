/**
 * Tools4Genz — Production End-to-End Live Verification Suite
 *
 * Runs against the live production Cloudflare Worker and D1 database:
 * https://tools4genz-api.alokmodanwal940.workers.dev
 */

const PROD_URL = 'https://tools4genz-api.alokmodanwal940.workers.dev';

// Generate a cryptographically secure random strong password in memory (never committed)
function generateSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}';
  const randomValues = crypto.getRandomValues(new Uint8Array(24));
  let pwd = 'T4G_';
  for (let i = 0; i < randomValues.length; i++) {
    pwd += chars[randomValues[i] % chars.length];
  }
  return pwd + '!9';
}

async function run() {
  console.log('🚀 Starting Production Live Verification against:', PROD_URL, '\n');

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

  // 1. Health check
  console.log('--- Step 1: Health & Connectivity ---');
  const healthResp = await fetch(`${PROD_URL}/api/health`);
  assert(healthResp.status === 200, 'GET /api/health returned 200 OK');
  const healthData = await healthResp.json();
  assert(healthData.data.database === 'configured', 'D1 Database is configured and reachable');

  // 2. Unauthenticated route rejection
  console.log('\n--- Step 2: Unauthenticated Route Protection ---');
  const unauthResp = await fetch(`${PROD_URL}/api/admin/tools`);
  assert(unauthResp.status === 401, 'Unauthenticated /api/admin/tools returned 401 Unauthorized');
  const unauthJson = await unauthResp.json();
  assert(unauthJson.error.code === 'UNAUTHORIZED', 'Error envelope contains UNAUTHORIZED code');

  // 3. Admin Bootstrap
  console.log('\n--- Step 3: Production Admin Bootstrap ---');
  const adminEmail = 'admin@tools4genz.com';
  const adminPassword = generateSecurePassword();

  // Try bootstrap
  const bootstrapResp = await fetch(`${PROD_URL}/api/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  let sessionCookie = '';

  if (bootstrapResp.status === 201) {
    assert(true, 'Initial bootstrap succeeded with HTTP 201');
    const setCookie = bootstrapResp.headers.get('set-cookie');
    assert(setCookie && setCookie.includes('session_token=') && setCookie.includes('HttpOnly'), 'Bootstrap returned HttpOnly session cookie');
    const match = setCookie.match(/session_token=([^;]+)/);
    sessionCookie = `session_token=${match[1]}`;
  } else if (bootstrapResp.status === 403) {
    console.log('ℹ️ Admin user already exists in production D1.');
  } else {
    assert(false, `Unexpected bootstrap status ${bootstrapResp.status}`);
  }

  // Attempt duplicate bootstrap — MUST return 403
  const secondBootstrapResp = await fetch(`${PROD_URL}/api/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'intruder@tools4genz.com', password: generateSecurePassword() }),
  });
  assert(secondBootstrapResp.status === 403, 'Subsequent bootstrap attempt is permanently rejected with HTTP 403 Forbidden');
  const secondJson = await secondBootstrapResp.json();
  assert(secondJson.error.code === 'BOOTSTRAP_DISABLED', 'Rejection error code is BOOTSTRAP_DISABLED');

  // 4. Test Login
  console.log('\n--- Step 4: Login & Credential Verification ---');
  const badLoginResp = await fetch(`${PROD_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: 'IncorrectPassword123!' }),
  });
  assert(badLoginResp.status === 401, 'Invalid login password returns HTTP 401');

  const goodLoginResp = await fetch(`${PROD_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  assert(goodLoginResp.status === 200, 'Valid login returns HTTP 200');
  const loginCookie = goodLoginResp.headers.get('set-cookie');
  assert(loginCookie && loginCookie.includes('session_token=') && loginCookie.includes('HttpOnly'), 'Login issued HttpOnly cookie');
  const loginMatch = loginCookie.match(/session_token=([^;]+)/);
  sessionCookie = `session_token=${loginMatch[1]}`;

  // 5. Session Verification
  console.log('\n--- Step 5: Session Verification via /api/auth/me ---');
  const meResp = await fetch(`${PROD_URL}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  assert(meResp.status === 200, 'GET /api/auth/me with session cookie returned 200 OK');
  const meData = await meResp.json();
  assert(meData.data.email === adminEmail && meData.data.role === 'admin', 'Identity verified as admin');

  // 6. Tools CRUD & Phase 6.5 Metadata
  console.log('\n--- Step 6: Production Tools CRUD & Integration Metadata ---');
  const testTool = {
    id: 'prod-verify-tool',
    name: 'Live Verified Tool',
    slug: 'live-verified-tool',
    category: 'writing-tools',
    status: 'active',
    featured: true,
    description: 'Test tool verifying Phase 6.5 adapters and Phase 7 D1 persistence.',
    integration: 'worker-api',
    integrationConfig: {
      workerEndpoint: '/api/tools/live-verify',
      workerMethod: 'POST',
      allowEmbed: true,
    },
    capabilities: {
      offlineCapable: true,
      supportedFormats: ['json', 'txt'],
    },
    seo: {
      metaTitle: 'Live Verified Tool | Tools4Genz',
      metaDescription: 'Production verification tool.',
    },
  };

  const createToolResp = await fetch(`${PROD_URL}/api/admin/tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify(testTool),
  });
  assert(createToolResp.status === 201, 'POST /api/admin/tools created tool in production D1');

  const listToolsResp = await fetch(`${PROD_URL}/api/admin/tools`, {
    headers: { Cookie: sessionCookie },
  });
  assert(listToolsResp.status === 200, 'GET /api/admin/tools returned 200 OK');
  const toolsList = (await listToolsResp.json()).data;
  const foundTool = toolsList.find((t) => t.id === 'prod-verify-tool');
  assert(foundTool !== undefined, 'Created tool found in production listing');
  assert(foundTool.integration === 'worker-api', 'Phase 6.5 integration type persisted');
  assert(foundTool.integrationConfig.workerEndpoint === '/api/tools/live-verify', 'Phase 6.5 integrationConfig persisted');

  // Update Tool
  foundTool.name = 'Live Verified Tool (Updated)';
  const updateToolResp = await fetch(`${PROD_URL}/api/admin/tools/prod-verify-tool`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify(foundTool),
  });
  assert(updateToolResp.status === 200, 'PUT /api/admin/tools/:id updated tool in production D1');

  // Delete Tool
  const deleteToolResp = await fetch(`${PROD_URL}/api/admin/tools/prod-verify-tool`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie },
  });
  assert(deleteToolResp.status === 200, 'DELETE /api/admin/tools/:id deleted tool from production D1');

  // 7. Projects CRUD
  console.log('\n--- Step 7: Production Projects CRUD ---');
  const testProject = {
    id: 'prod-verify-proj',
    title: 'Live Verified Project',
    slug: 'live-verified-project',
    category: 'Full Stack',
    status: 'available',
    featured: true,
    price: 3999,
    currency: 'INR',
    technologies: ['React', 'TypeScript', 'Cloudflare D1'],
  };
  const createProjResp = await fetch(`${PROD_URL}/api/admin/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify(testProject),
  });
  assert(createProjResp.status === 201, 'POST /api/admin/projects created project');

  const listProjResp = await fetch(`${PROD_URL}/api/admin/projects`, {
    headers: { Cookie: sessionCookie },
  });
  assert(listProjResp.status === 200, 'GET /api/admin/projects returned 200 OK');

  const deleteProjResp = await fetch(`${PROD_URL}/api/admin/projects/prod-verify-proj`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie },
  });
  assert(deleteProjResp.status === 200, 'DELETE /api/admin/projects/:id deleted test project');

  // 8. Services CRUD
  console.log('\n--- Step 8: Production Services CRUD ---');
  const testService = {
    id: 'prod-verify-svc',
    title: 'Live Verified Service',
    category: 'Development',
    description: 'Service verifying D1 persistence.',
  };
  const createSvcResp = await fetch(`${PROD_URL}/api/admin/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify(testService),
  });
  assert(createSvcResp.status === 201, 'POST /api/admin/services created service');

  const deleteSvcResp = await fetch(`${PROD_URL}/api/admin/services/prod-verify-svc`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie },
  });
  assert(deleteSvcResp.status === 200, 'DELETE /api/admin/services/:id deleted test service');

  // 9. Categories CRUD
  console.log('\n--- Step 9: Production Categories CRUD ---');
  const testCategory = {
    id: 'prod-verify-cat',
    type: 'tool',
    name: 'Verified Categories',
    icon: '🏷️',
    count: 1,
  };
  const createCatResp = await fetch(`${PROD_URL}/api/admin/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify(testCategory),
  });
  assert(createCatResp.status === 201, 'POST /api/admin/categories created category');

  const deleteCatResp = await fetch(`${PROD_URL}/api/admin/categories/prod-verify-cat?type=tool`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie },
  });
  assert(deleteCatResp.status === 200, 'DELETE /api/admin/categories/:id?type=tool deleted test category');

  // 10. Requests Management
  console.log('\n--- Step 10: Production Request Management ---');
  const listReqsResp = await fetch(`${PROD_URL}/api/admin/requests`, {
    headers: { Cookie: sessionCookie },
  });
  assert(listReqsResp.status === 200, 'GET /api/admin/requests returned 200 OK');
  const reqs = (await listReqsResp.json()).data;
  assert(Array.isArray(reqs) && reqs.length >= 2, 'Existing production request tickets preserved');

  const firstReq = reqs[0];
  const origStatus = firstReq.status;
  const newStatus = origStatus === 'reviewing' ? 'in-progress' : 'reviewing';

  const updateStatusResp = await fetch(`${PROD_URL}/api/admin/requests/${firstReq.requestId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ status: newStatus }),
  });
  assert(updateStatusResp.status === 200, `PATCH /api/admin/requests/:id/status updated status to ${newStatus}`);

  // Revert status back to preserve original data
  await fetch(`${PROD_URL}/api/admin/requests/${firstReq.requestId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ status: origStatus }),
  });
  console.log(`✅ Reverted request ${firstReq.requestId} status back to original (${origStatus})`);

  // 11. Dashboard Metrics
  console.log('\n--- Step 11: Production Dashboard Metrics ---');
  const metricsResp = await fetch(`${PROD_URL}/api/admin/dashboard/metrics`, {
    headers: { Cookie: sessionCookie },
  });
  assert(metricsResp.status === 200, 'GET /api/admin/dashboard/metrics returned 200 OK');
  const metricsData = await metricsResp.json();
  assert(typeof metricsData.data.totalProjects === 'number', 'Metrics returned totalProjects');
  assert(typeof metricsData.data.pendingRequests === 'number', 'Metrics returned pendingRequests');

  // 12. Logout & Session Revocation
  console.log('\n--- Step 12: Logout & Session Invalidation ---');
  const logoutResp = await fetch(`${PROD_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie },
  });
  assert(logoutResp.status === 200, 'POST /api/auth/logout returned 200 OK');
  const logoutSetCookie = logoutResp.headers.get('set-cookie');
  assert(logoutSetCookie && logoutSetCookie.includes('Max-Age=0'), 'Logout returned Max-Age=0 cookie expiration');

  // Request with invalidated cookie must now be rejected
  const postLogoutMeResp = await fetch(`${PROD_URL}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  assert(postLogoutMeResp.status === 401, 'Request with revoked session cookie is rejected with HTTP 401');

  console.log(`\n🎉 All Production Live Verification Tests Passed! (${passed} passed, ${failed} failed)\n`);
}

run().catch((err) => {
  console.error('\n💥 Production verification failed:', err);
  process.exit(1);
});
