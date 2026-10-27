import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createTransport: vi.fn(), verify: vi.fn(), sendMail: vi.fn(), mail: { enabled: true, host: 'smtp.example.test', port: 587, secure: false, requireTLS: true, user: 'test-account', password: 'test-only', from: 'test@example.test' } }));
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock('../src/config/env.js', () => ({ default: { mail: mocks.mail } }));
vi.mock('../src/utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn() } }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.mail.enabled = true;
  mocks.createTransport.mockReturnValue({ verify: mocks.verify, sendMail: mocks.sendMail });
  mocks.verify.mockResolvedValue(true);
});

describe('SMTP verification', () => {
  it('requires verified TLS and checks configuration without sending an email', async () => {
    const { verifyMailConnection } = await import('../src/services/mailer.js');
    expect(await verifyMailConnection()).toEqual({ configured: true, verified: true });
    expect(mocks.createTransport.mock.calls[0][0]).toMatchObject({ requireTLS: true, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' } });
    expect(mocks.verify).toHaveBeenCalledOnce();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
  it('reports missing mail configuration without contacting a server', async () => {
    mocks.mail.enabled = false;
    const { verifyMailConnection } = await import('../src/services/mailer.js');
    expect(await verifyMailConnection()).toEqual({ configured: false, verified: false });
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
});
