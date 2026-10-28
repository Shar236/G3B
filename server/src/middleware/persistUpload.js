import fs from 'node:fs/promises';
import env from '../config/env.js';
import { uploadObject, storageBuckets } from '../services/supabaseStorage.js';

/** Keep legacy multipart endpoints durable too; JSON signed uploads pass through. */
export function persistUpload(parser, { prefix, privateFile = false, multiple = false }) {
  return (req, res, next) => parser(req, res, (error) => {
    if (error) return next(error);
    if (env.uploads.provider !== 'supabase') return next();
    const files = multiple ? req.files : req.file ? [req.file] : [];
    if (!files?.length) return next();

    const persist = async () => {
      const references = [];
      const bucket = privateFile ? storageBuckets.private : storageBuckets.media;
      for (const file of files) {
        const folder = typeof prefix === 'function' ? prefix(req) : prefix;
        const key = `${folder}/${file.filename}`;
        await uploadObject(bucket, key, await fs.readFile(file.path), file.mimetype);
        references.push({ storageKey: key, originalName: file.originalname, contentType: file.mimetype, size: file.size });
      }
      req.body ||= {};
      if (multiple) req.body.photos = references;
      else Object.assign(req.body, references[0]);
      // Controllers already implement the signed-object finalization path.
      req.file = undefined;
      req.files = undefined;
    };
    const complete = async () => {
      try {
        await persist();
      } finally {
      // These are request-created temporary files, never existing user media.
        await Promise.allSettled(files.map((file) => fs.unlink(file.path)));
      }
    };
    complete().then(() => next(), next);
  });
}
