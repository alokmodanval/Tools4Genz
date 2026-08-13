var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/utils/api.ts
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}
__name(json, "json");
function success(data, status = 200) {
  return json({ success: true, data }, status);
}
__name(success, "success");
function error(code, message, status) {
  return json(
    {
      success: false,
      error: { code, message }
    },
    status
  );
}
__name(error, "error");

// src/routes/health.ts
async function handleHealth(db) {
  return success({
    service: "tools4genz-api",
    status: "ok",
    database: db ? "configured" : "not-configured"
  });
}
__name(handleHealth, "handleHealth");

// src/db/schema.ts
var REQUEST_INSERT_COLUMNS = `
  request_id, request_type, status,
  name, email, phone, preferred_contact,
  project_type, technology, project_title, description,
  budget, deadline, additional_notes,
  course, branch, academic_year, college_name,
  company, website_url, reference_website, existing_system,
  created_at, updated_at
`;
var REQUEST_INSERT_PLACEHOLDERS = `
  :request_id, :request_type, :status,
  :name, :email, :phone, :preferred_contact,
  :project_type, :technology, :project_title, :description,
  :budget, :deadline, :additional_notes,
  :course, :branch, :academic_year, :college_name,
  :company, :website_url, :reference_website, :existing_system,
  :created_at, :updated_at
`;

// src/db/repository.ts
var requestRepository = {
  /**
   * Insert a new request and return its internal row id.
   */
  async insert(db, row) {
    const result = await db.prepare(
      `INSERT INTO requests (${REQUEST_INSERT_COLUMNS})
         VALUES (${REQUEST_INSERT_PLACEHOLDERS})`
    ).bind(
      row.request_id,
      row.request_type,
      row.status,
      row.name,
      row.email,
      row.phone,
      row.preferred_contact,
      row.project_type,
      row.technology,
      row.project_title,
      row.description,
      row.budget,
      row.deadline,
      row.additional_notes,
      row.course,
      row.branch,
      row.academic_year,
      row.college_name,
      row.company,
      row.website_url,
      row.reference_website,
      row.existing_system,
      row.created_at,
      row.updated_at
    ).run();
    return result.meta.last_row_id;
  },
  /**
   * Fetch ONLY the safe public status fields for a given request,
   * keyed by the publicly-shareable request_id (not the internal id).
   * Never selects private columns (email, phone, budget, etc.).
   */
  async findPublicStatus(db, requestId) {
    return db.prepare(
      `SELECT request_id, status, created_at
         FROM requests
         WHERE request_id = ?
         LIMIT 1`
    ).bind(requestId).first();
  }
};

// src/utils/body.ts
var MAX_BODY_BYTES = 64 * 1024;
async function readJsonBody(request) {
  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new BadJsonError();
  }
}
__name(readJsonBody, "readJsonBody");
var BodyTooLargeError = class extends Error {
  static {
    __name(this, "BodyTooLargeError");
  }
  constructor() {
    super("Request body too large");
    this.name = "BodyTooLargeError";
  }
};
var BadJsonError = class extends Error {
  static {
    __name(this, "BadJsonError");
  }
  constructor() {
    super("Malformed JSON body");
    this.name = "BadJsonError";
  }
};

// src/utils/id.ts
function generateRequestId() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(4));
  const hex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `TG-REQ-${hex}`;
}
__name(generateRequestId, "generateRequestId");

// src/utils/validation.ts
var VALID_REQUEST_TYPES = [
  "student-project",
  "client-website",
  "client-software",
  "client-ai",
  "client-business",
  "custom-request"
];
var VALID_CONTACT_METHODS = ["email", "phone", "whatsapp"];
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var PHONE_REGEX = /^[0-9+\s-]{8,15}$/;
var DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
var MAX_DESCRIPTION_LENGTH = 4e3;
var MAX_NAME_LENGTH = 120;
var MAX_EMAIL_LENGTH = 254;
var MAX_PROJECT_TYPE_LENGTH = 120;
var MAX_GENERIC_LENGTH = 500;
function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}
__name(cleanString, "cleanString");
function normalizeRequestPayload(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ["Request body must be a JSON object"] };
  }
  const input = raw;
  const errors = [];
  const requestType = input.requestType;
  if (!VALID_REQUEST_TYPES.includes(requestType)) {
    errors.push("requestType must be one of: student-project, client-website, client-software, client-ai, client-business, custom-request");
  }
  const name = cleanString(input.name, MAX_NAME_LENGTH);
  if (!name) errors.push("name is required");
  const email = cleanString(input.email, MAX_EMAIL_LENGTH).toLowerCase();
  if (!email) {
    errors.push("email is required");
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push("email has an invalid format");
  } else if (email.length > MAX_EMAIL_LENGTH) {
    errors.push("email is too long");
  }
  const phoneRaw = cleanString(input.phone, 20);
  const phone = phoneRaw || void 0;
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.push("phone has an invalid format");
  }
  const contactRaw = input.preferredContactMethod;
  const preferredContactMethod = contactRaw && VALID_CONTACT_METHODS.includes(contactRaw) ? contactRaw : void 0;
  if (input.preferredContactMethod !== void 0 && input.preferredContactMethod !== null && !preferredContactMethod) {
    errors.push("preferredContactMethod must be one of: email, phone, whatsapp");
  }
  const projectType = cleanString(input.projectType, MAX_PROJECT_TYPE_LENGTH);
  if (!projectType) errors.push("projectType is required");
  const description = cleanString(input.description, MAX_DESCRIPTION_LENGTH);
  if (!description) {
    errors.push("description is required");
  } else if (description.length < 15) {
    errors.push("description must be at least 15 characters");
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`);
  }
  let deadline;
  const deadlineRaw = cleanString(input.deadline, 10);
  if (deadlineRaw) {
    if (!DATE_REGEX.test(deadlineRaw)) {
      errors.push("deadline must be a valid date in YYYY-MM-DD format");
    } else {
      deadline = deadlineRaw;
    }
  }
  const technology = cleanString(input.technology, 100) || void 0;
  const titleOrIdea = cleanString(input.titleOrIdea, 200) || void 0;
  const budget = cleanString(input.budget, 100) || void 0;
  const additionalDetails = cleanString(input.additionalDetails, MAX_GENERIC_LENGTH) || void 0;
  const additionalRequirements = cleanString(input.additionalRequirements, MAX_GENERIC_LENGTH) || void 0;
  const course = cleanString(input.course, 100) || void 0;
  const branch = cleanString(input.branch, 100) || void 0;
  const academicYear = cleanString(input.academicYear, 100) || void 0;
  const collegeName = cleanString(input.collegeName, 200) || void 0;
  const company = cleanString(input.company, 200) || void 0;
  const websiteUrl = cleanString(input.websiteUrl, 300) || void 0;
  const referenceWebsite = cleanString(input.referenceWebsite, 300) || void 0;
  const existingSystem = cleanString(input.existingSystem, MAX_GENERIC_LENGTH) || void 0;
  const businessDescription = cleanString(input.businessDescription, MAX_DESCRIPTION_LENGTH) || void 0;
  const requirements = cleanString(input.requirements, MAX_DESCRIPTION_LENGTH) || void 0;
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: {
      requestType,
      name,
      email,
      phone,
      preferredContactMethod,
      projectType,
      technology,
      titleOrIdea,
      description,
      budget,
      deadline,
      additionalDetails,
      additionalRequirements,
      course,
      branch,
      academicYear,
      collegeName,
      company,
      websiteUrl,
      referenceWebsite,
      existingSystem,
      businessDescription,
      requirements
    }
  };
}
__name(normalizeRequestPayload, "normalizeRequestPayload");

// src/routes/requests.ts
async function handleCreateRequest(request, db) {
  let rawBody;
  try {
    rawBody = await readJsonBody(request);
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      return error("PAYLOAD_TOO_LARGE", "Request body exceeds the maximum allowed size", 413);
    }
    if (err instanceof BadJsonError) {
      return error("BAD_JSON", "Request body must be valid JSON", 400);
    }
    throw err;
  }
  const parsed = normalizeRequestPayload(rawBody);
  if (!parsed.ok) {
    return error("VALIDATION_ERROR", parsed.errors.join("; "), 400);
  }
  const data = parsed.data;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const requestId = generateRequestId();
  const row = {
    request_id: requestId,
    request_type: data.requestType,
    status: "submitted",
    name: data.name,
    email: data.email,
    phone: data.phone ?? null,
    preferred_contact: data.preferredContactMethod ?? null,
    project_type: data.projectType,
    technology: data.technology ?? null,
    project_title: data.titleOrIdea ?? null,
    description: data.description,
    budget: data.budget ?? null,
    deadline: data.deadline ?? null,
    additional_notes: data.additionalDetails ?? data.additionalRequirements ?? null,
    course: data.course ?? null,
    branch: data.branch ?? null,
    academic_year: data.academicYear ?? null,
    college_name: data.collegeName ?? null,
    company: data.company ?? null,
    website_url: data.websiteUrl ?? null,
    reference_website: data.referenceWebsite ?? null,
    existing_system: data.existingSystem ?? null,
    created_at: now,
    updated_at: now
  };
  await requestRepository.insert(db, row);
  return success(
    {
      requestId,
      status: "submitted",
      createdAt: now
    },
    201
  );
}
__name(handleCreateRequest, "handleCreateRequest");
async function handleGetRequestStatus(requestId, db) {
  if (!/^[A-Z0-9-]+$/i.test(requestId)) {
    return error("VALIDATION_ERROR", "Invalid request ID format", 400);
  }
  const row = await requestRepository.findPublicStatus(db, requestId);
  if (!row) {
    return error("NOT_FOUND", "Request not found", 404);
  }
  return success({
    requestId: row.request_id,
    status: row.status,
    createdAt: row.created_at
  });
}
__name(handleGetRequestStatus, "handleGetRequestStatus");

// src/utils/cors.ts
var DEV_ORIGINS = /* @__PURE__ */ new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://localhost:4174",
  "http://localhost:4175",
  "http://localhost:4176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:4174",
  "http://127.0.0.1:4175",
  "http://127.0.0.1:4176"
]);
var PROD_ORIGINS = /* @__PURE__ */ new Set(["https://tools4genz.com"]);
var ALLOWED_METHODS = "GET,POST,OPTIONS";
var ALLOWED_HEADERS = "Content-Type,Authorization";
function getAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (DEV_ORIGINS.has(origin) || PROD_ORIGINS.has(origin)) return origin;
  if (env.ALLOWED_ORIGINS) {
    const extra = new Set(env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean));
    if (extra.has(origin)) return origin;
  }
  return null;
}
__name(getAllowedOrigin, "getAllowedOrigin");
function buildCorsHeaders(request, env) {
  const origin = getAllowedOrigin(request, env);
  if (!origin) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
__name(buildCorsHeaders, "buildCorsHeaders");

// src/index.ts
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") {
      const corsHeaders2 = buildCorsHeaders(request, env);
      if (!corsHeaders2) {
        return error("VALIDATION_ERROR", "Origin not allowed", 403);
      }
      return new Response(null, { status: 204, headers: corsHeaders2 });
    }
    const corsHeaders = buildCorsHeaders(request, env);
    const applyCors = /* @__PURE__ */ __name((response) => {
      if (!corsHeaders) return response;
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
      }
      return new Response(response.body, { status: response.status, headers });
    }, "applyCors");
    try {
      if (path === "/api/health" && method === "GET") {
        return applyCors(await handleHealth(env.DB));
      }
      if (path === "/api/requests" && method === "POST") {
        if (!env.DB) {
          return applyCors(error("INTERNAL_ERROR", "Database is not configured", 500));
        }
        return applyCors(await handleCreateRequest(request, env.DB));
      }
      const requestMatch = path.match(/^\/api\/requests\/([^/]+)$/);
      if (requestMatch && method === "GET") {
        if (!env.DB) {
          return applyCors(error("INTERNAL_ERROR", "Database is not configured", 500));
        }
        return applyCors(await handleGetRequestStatus(requestMatch[1], env.DB));
      }
      if (path === "/api/health" && method !== "GET" || path === "/api/requests" && method !== "POST" || requestMatch && method !== "GET") {
        return applyCors(error("METHOD_NOT_ALLOWED", "Method not allowed", 405));
      }
      return applyCors(error("NOT_FOUND", "Route not found", 404));
    } catch (err) {
      console.error("Unhandled worker error:", err);
      return applyCors(error("INTERNAL_ERROR", "Internal server error", 500));
    }
  }
};

// ../../Users/alok/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../Users/alok/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error2 = reduceError(e);
    const body = JSON.stringify(error2);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-qFxPUD/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../Users/alok/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-qFxPUD/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
