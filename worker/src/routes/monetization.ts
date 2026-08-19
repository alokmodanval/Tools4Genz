import { affiliateOfferRepository, D1Database } from '../db/repository';
import { AffiliateOfferRow } from '../db/schema';
import { currentCustomer } from '../services/customerAuth';
import { getPublicSettings, recordAnalyticsEvent } from '../services/platform';
import { error, success } from '../utils/api';
import { BodyTooLargeError, readJsonBody } from '../utils/body';

const STATUS = new Set(['draft', 'published', 'hidden', 'archived']);
const ENTITY_TYPES = new Set(['tool', 'project', 'service', 'category']);

function publicOffer(row: AffiliateOfferRow) {
  return {
    id: row.id, title: row.title, slug: row.slug, description: row.description,
    destinationUrl: row.destination_url, category: row.category, imageUrl: row.image_url,
    ctaText: row.cta_text, disclosureText: row.disclosure_text,
    featured: Boolean(row.featured), entityType: row.entity_type, entityId: row.entity_id,
  };
}

function adminOffer(row: AffiliateOfferRow) {
  return { ...publicOffer(row), status: row.status, sortOrder: row.sort_order, createdAt: row.created_at, updatedAt: row.updated_at };
}

function textValue(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function safeHttpsUrl(value: unknown, optional = false) {
  const raw = textValue(value, 2048);
  if (!raw && optional) return null;
  try { const parsed = new URL(raw); return parsed.protocol === 'https:' ? parsed.toString() : null; } catch { return null; }
}

function validateOffer(body: Record<string, unknown>) {
  const title = textValue(body.title, 120); const slug = textValue(body.slug, 100).toLowerCase();
  const description = textValue(body.description, 600); const destinationUrl = safeHttpsUrl(body.destinationUrl);
  const imageUrl = safeHttpsUrl(body.imageUrl, true); const ctaText = textValue(body.ctaText, 60) || 'Learn more';
  const disclosureText = textValue(body.disclosureText, 240) || null; const category = textValue(body.category, 80) || 'general';
  const status = textValue(body.status, 20) || 'draft'; const entityType = textValue(body.entityType, 20) || null;
  const entityId = textValue(body.entityId, 120) || null; const sortOrder = Math.max(-10000, Math.min(10000, Number(body.sortOrder) || 0));
  if (!title || title.length < 2 || !description || description.length < 8) return { message: 'Title and a useful description are required.' };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { message: 'A valid lowercase slug is required.' };
  if (!destinationUrl) return { message: 'Destination URL must be a valid HTTPS URL.' };
  if (body.imageUrl && !imageUrl) return { message: 'Image URL must be empty or a valid HTTPS URL.' };
  if (!STATUS.has(status)) return { message: 'Unsupported offer status.' };
  if (entityType && !ENTITY_TYPES.has(entityType)) return { message: 'Unsupported associated entity type.' };
  if (entityId && !/^[A-Za-z0-9_-]{1,120}$/.test(entityId)) return { message: 'Associated entity ID is invalid.' };
  if (entityId && !entityType) return { message: 'Associated entity type is required with an entity ID.' };
  return { value: { title, slug, description, destination_url: destinationUrl, category, image_url: imageUrl,
    cta_text: ctaText, disclosure_text: disclosureText, status, featured: body.featured === true ? 1 : 0,
    sort_order: sortOrder, entity_type: entityType, entity_id: entityId } };
}

export async function handlePublicAffiliateOffers(request: Request, db: D1Database) {
  const settings = await getPublicSettings(db);
  if (settings.affiliate_enabled !== 'true') return success([]);
  const url = new URL(request.url); const entityType = url.searchParams.get('entityType') || undefined;
  const entityId = url.searchParams.get('entityId') || undefined;
  if (entityType && !ENTITY_TYPES.has(entityType)) return error('VALIDATION_ERROR', 'Invalid entity type', 400);
  if (entityId && !/^[A-Za-z0-9_-]{1,120}$/.test(entityId)) return error('VALIDATION_ERROR', 'Invalid entity ID', 400);
  return success((await affiliateOfferRepository.listPublished(db, entityType, entityId)).map(publicOffer));
}

export async function handleAffiliateClick(request: Request, id: string, db: D1Database) {
  if (!/^\d+$/.test(id)) return error('NOT_FOUND', 'Recommendation not found', 404);
  const offer = await affiliateOfferRepository.findById(db, Number(id));
  if (!offer || offer.status !== 'published') return error('NOT_FOUND', 'Recommendation not found', 404);
  let body: Record<string, unknown>; try { body = await readJsonBody(request) as Record<string, unknown>; } catch (caught) { return caught instanceof BodyTooLargeError ? error('PAYLOAD_TOO_LARGE', 'Request body is too large', 413) : error('BAD_JSON', 'Invalid JSON body', 400); }
  const user = await currentCustomer(request, db);
  const recorded = await recordAnalyticsEvent(db, { sessionId: String(body.sessionId || ''), customerUserId: user?.id,
    eventName: 'affiliate_click', entityType: 'affiliate_offer', entityId: String(offer.id) });
  return recorded ? success({ recorded: true }, 201) : error('VALIDATION_ERROR', 'Invalid analytics session', 400);
}

export async function handleAdminAffiliateList(db: D1Database) { return success((await affiliateOfferRepository.listAdmin(db)).map(adminOffer)); }

export async function handleAdminAffiliateSave(request: Request, db: D1Database, id?: string) {
  let body: Record<string, unknown>; try { body = await readJsonBody(request) as Record<string, unknown>; } catch (caught) { return caught instanceof BodyTooLargeError ? error('PAYLOAD_TOO_LARGE', 'Request body is too large', 413) : error('BAD_JSON', 'Invalid JSON body', 400); }
  const parsed = validateOffer(body); if (!parsed.value) return error('VALIDATION_ERROR', parsed.message || 'Invalid offer', 400);
  const now = new Date().toISOString();
  try {
    const row = id
      ? await affiliateOfferRepository.update(db, Number(id), { ...parsed.value, updated_at: now })
      : await affiliateOfferRepository.create(db, { ...parsed.value, created_at: now, updated_at: now });
    return row ? success(adminOffer(row), id ? 200 : 201) : error('NOT_FOUND', 'Recommendation not found', 404);
  } catch { return error('VALIDATION_ERROR', 'An offer with this slug already exists.', 409); }
}

export async function handleAdminAffiliateArchive(id: string, db: D1Database) {
  return await affiliateOfferRepository.archive(db, Number(id))
    ? success({ archived: true }) : error('NOT_FOUND', 'Recommendation not found', 404);
}

export async function handleAdsTxt(db: D1Database) {
  const settings = await getPublicSettings(db); const match = settings.adsense_publisher_id.match(/^ca-(pub-\d{16})$/);
  const configured = settings.ads_enabled === 'true' && settings.adsense_enabled === 'true' && match;
  const text = configured ? `google.com, ${match[1]}, DIRECT, f08c47fec0942fa0\n` : '# Advertising seller information is not configured.\n';
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
