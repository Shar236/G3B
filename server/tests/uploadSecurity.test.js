import { describe, expect, it } from 'vitest';
import { validMediaExtension } from '../src/middleware/upload.js';

describe('public media file extensions', () => {
  it('rejects executable extensions disguised by a claimed image MIME type', () => {
    expect(validMediaExtension({ originalname: 'photo.html', mimetype: 'image/jpeg' })).toBe(false);
    expect(validMediaExtension({ originalname: 'photo.svg.html', mimetype: 'image/svg+xml' })).toBe(false);
    expect(validMediaExtension({ originalname: 'photo.exe', mimetype: 'video/mp4' })).toBe(false);
  });
  it('preserves supported images and videos including uppercase extensions', () => {
    for (const [originalname, mimetype] of [['Photo.JPG', 'image/jpeg'], ['photo.svg', 'image/svg+xml'], ['video.mov', 'video/quicktime'], ['photo.avif', 'image/avif']]) {
      expect(validMediaExtension({ originalname, mimetype })).toBe(true);
    }
  });
});
