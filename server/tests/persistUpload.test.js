import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  upload: vi.fn(async () => {}),
  read: vi.fn(async () => Buffer.from('test image')),
  unlink: vi.fn(async () => {}),
  env: { uploads: { provider: 'supabase' } },
}));
vi.mock('node:fs/promises', () => ({ default: { readFile: mocks.read, unlink: mocks.unlink } }));
vi.mock('../src/config/env.js', () => ({ default: mocks.env }));
vi.mock('../src/services/supabaseStorage.js', () => ({
  uploadObject: mocks.upload, storageBuckets: { media: 'public-media', private: 'private-reports' },
}));
import { persistUpload } from '../src/middleware/persistUpload.js';

const file = { filename: 'generated.png', originalname: 'Photo.png', mimetype: 'image/png', size: 10, path: '/request-temp/generated.png' };
const run = (req, options = {}) => new Promise((resolve) => {
  persistUpload((_req, _res, next) => next(), { prefix: 'content', ...options })(req, {}, (error) => resolve(error));
});
beforeEach(() => { vi.clearAllMocks(); mocks.env.uploads.provider = 'supabase'; });

describe('legacy multipart persistence in serverless functions', () => {
  it('stores images durably before forwarding them to the existing finalizer', async () => {
    const req = { file: { ...file }, body: { title: 'Keep title' } };
    expect(await run(req)).toBeUndefined();
    expect(mocks.upload).toHaveBeenCalledWith('public-media', 'content/generated.png', expect.any(Buffer), 'image/png');
    expect(req.body).toMatchObject({ storageKey: 'content/generated.png', title: 'Keep title', originalName: 'Photo.png' });
    expect(req.file).toBeUndefined();
    expect(mocks.unlink).toHaveBeenCalledWith(file.path);
  });
  it('keeps reports private and preserves bulk upload references', async () => {
    const req = { file: { ...file, filename: 'report.pdf', mimetype: 'application/pdf' }, params: { id: 12 } };
    await run(req, { prefix: (value) => `reports/${value.params.id}`, privateFile: true });
    expect(mocks.upload).toHaveBeenCalledWith('private-reports', 'reports/12/report.pdf', expect.any(Buffer), 'application/pdf');
    const bulk = { files: [{ ...file }], body: {} };
    await run(bulk, { prefix: 'gallery', multiple: true });
    expect(bulk.body.photos[0].storageKey).toBe('gallery/generated.png');
  });
  it('propagates provider failure without saving a temporary path as persistent data', async () => {
    mocks.upload.mockRejectedValueOnce(new Error('Provider unavailable'));
    const req = { file: { ...file }, body: {} };
    expect((await run(req)).message).toBe('Provider unavailable');
    expect(req.body.storageKey).toBeUndefined();
    expect(mocks.unlink).toHaveBeenCalledWith(file.path);
  });
  it('passes through signed JSON requests and keeps local development supported', async () => {
    const signed = { body: { storageKey: 'content/signed.png' } };
    await run(signed);
    mocks.env.uploads.provider = 'local';
    const local = { file: { ...file }, body: {} };
    await run(local);
    expect(local.file.path).toBe(file.path);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.unlink).not.toHaveBeenCalled();
  });
});
