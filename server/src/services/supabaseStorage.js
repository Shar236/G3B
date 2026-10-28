import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const storageRoot = () => `${env.storage.url.replace(/\/+$/, '')}/storage/v1`;
const encodePath = (value) => value.split('/').map(encodeURIComponent).join('/');

function assertConfigured() {
  if (!env.storage.url || !env.storage.serviceRoleKey) {
    throw new ApiError(503, 'Supabase Storage is not configured on the backend.');
  }
}

function headers(extra = {}) {
  assertConfigured();
  return {
    apikey: env.storage.serviceRoleKey,
    Authorization: `Bearer ${env.storage.serviceRoleKey}`,
    ...extra,
  };
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: headers(options.headers),
  });
  if (!response.ok) {
    throw new ApiError(502, `Supabase Storage request failed (${response.status}).`);
  }
  return response;
}

export function publicObjectUrl(bucket, key) {
  assertConfigured();
  return `${storageRoot()}/object/public/${encodeURIComponent(bucket)}/${encodePath(key)}`;
}

export async function createSignedUploadUrl(bucket, key) {
  const response = await request(
    `${storageRoot()}/object/upload/sign/${encodeURIComponent(bucket)}/${encodePath(key)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
  const data = await response.json();
  if (typeof data.url !== 'string' || !data.url) {
    throw new ApiError(502, 'Supabase Storage did not return a signed upload URL.');
  }
  const signedUrl = /^https?:\/\//i.test(data.url)
    ? data.url
    : `${storageRoot()}${data.url.startsWith('/') ? data.url : `/${data.url}`}`;
  const token = new URL(signedUrl).searchParams.get('token');
  if (!token) throw new ApiError(502, 'Supabase Storage did not return an upload token.');
  return {
    bucket,
    path: key,
    signedUrl,
    token,
    publicKey: env.storage.publishableKey || null,
  };
}

export async function downloadObject(bucket, key, { maxBytes = Infinity } = {}) {
  const response = await request(
    `${storageRoot()}/object/${encodeURIComponent(bucket)}/${encodePath(key)}`,
  );
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ApiError(413, 'The stored file exceeds the processing limit.');
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) throw new ApiError(413, 'The stored file exceeds the processing limit.');
  return {
    buffer,
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  };
}

export async function uploadObject(bucket, key, buffer, contentType) {
  await request(
    `${storageRoot()}/object/${encodeURIComponent(bucket)}/${encodePath(key)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: buffer,
    },
  );
}

export async function deleteObjects(bucket, keys) {
  if (keys.length === 0) return;
  await request(`${storageRoot()}/object/${encodeURIComponent(bucket)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: keys }),
  });
}

export async function listObjects(bucket, prefix = '', { limit = 1000, offset = 0 } = {}) {
  const response = await request(
    `${storageRoot()}/object/list/${encodeURIComponent(bucket)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit, offset }),
    },
  );
  return response.json();
}

export const storageBuckets = {
  media: env.storage.mediaBucket,
  private: env.storage.privateBucket,
};
