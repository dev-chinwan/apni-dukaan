import { createHash } from 'crypto';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const FOLDER = (process.env.CLOUDINARY_FOLDER || 'freshcart-data').replace(/^\/+|\/+$/g, '');
const ENABLED = String(process.env.CLOUDINARY_SYNC_ENABLED || '').toLowerCase() === 'true';
const REQUIRED = String(process.env.CLOUDINARY_SYNC_REQUIRED || '').toLowerCase() === 'true';

function isConfigured() {
  return ENABLED && Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

function cloudPath(filename) {
  const base = String(filename || '').replace(/\.json$/i, '');
  return `${FOLDER}/${base}`;
}

function encodePublicIdForUrl(publicId) {
  return publicId
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function signParams(params) {
  const sorted = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1').update(`${sorted}${API_SECRET}`).digest('hex');
}

export function isCloudinaryEnabled() {
  return isConfigured();
}

export function isCloudinarySyncRequired() {
  return isConfigured() && REQUIRED;
}

export async function downloadJsonFromCloud(filename) {
  if (!isConfigured()) return null;

  const publicId = cloudPath(filename);
  const url = `https://res.cloudinary.com/${encodeURIComponent(CLOUD_NAME)}/raw/upload/${encodePublicIdForUrl(publicId)}.json?ts=${Date.now()}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function uploadJsonToCloud(filename, data) {
  if (!isConfigured()) return { ok: false, skipped: true };

  const timestamp = Math.floor(Date.now() / 1000);
  const public_id = cloudPath(filename);
  const paramsToSign = {
    invalidate: true,
    overwrite: true,
    public_id,
    timestamp,
  };

  const signature = signParams(paramsToSign);
  const form = new FormData();
  form.append('file', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
  form.append('api_key', API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('public_id', public_id);
  form.append('overwrite', 'true');
  form.append('invalidate', 'true');
  form.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD_NAME)}/raw/upload`;

  try {
    const res = await fetch(endpoint, { method: 'POST', body: form });
    if (!res.ok) {
      const text = await res.text();
      console.error('[Cloudinary] Upload failed', filename, text);
      return { ok: false, skipped: false, error: text };
    }

    return { ok: true, skipped: false };
  } catch (err) {
    console.error('[Cloudinary] Upload error', filename, err);
    return { ok: false, skipped: false, error: String(err?.message || err) };
  }
}

export async function hydrateArrayFromCloud(filename, fallbackArray = []) {
  const cloudData = await downloadJsonFromCloud(filename);
  if (Array.isArray(cloudData)) return cloudData;
  return fallbackArray;
}

export async function hydrateObjectFromCloud(filename, fallbackObject = {}) {
  const cloudData = await downloadJsonFromCloud(filename);
  if (cloudData && typeof cloudData === 'object' && !Array.isArray(cloudData)) return cloudData;
  return fallbackObject;
}

export async function syncArrayToCloud(filename, data) {
  return uploadJsonToCloud(filename, Array.isArray(data) ? data : []);
}

export async function syncObjectToCloud(filename, data) {
  const safeData = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  return uploadJsonToCloud(filename, safeData);
}
