import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import logger from '../utils/logger.js';

/**
 * Image optimisation built on sharp.
 *
 * Originals are never overwritten: every rendition is written as a *new* file,
 * which is what makes "restore the original" always possible.
 */

/** Responsive breakpoints generated for raster uploads. */
export const RESPONSIVE_WIDTHS = [480, 768, 1024, 1600];

/** Widest rendition we will produce, to bound disk usage. */
export const MAX_WIDTH = 2560;

/** Modern formats produced alongside the preserved original. */
const MODERN_FORMATS = [
  { format: 'webp', quality: 78 },
  { format: 'avif', quality: 52 },
];

/**
 * Formats we do not re-encode: SVG is vector (sharp would rasterise it and
 * break scalability) and GIF may be animated (flattening it would drop frames).
 */
const SKIP_VARIANTS = new Set(['svg', 'gif']);

/** Relative folder (under uploads) where generated renditions live. */
export const OPTIMIZED_FOLDER = 'optimized';

/** Read intrinsic dimensions and format without modifying the file. */
export async function readImageMetadata(filePath) {
  const meta = await sharp(filePath, { animated: false }).metadata();
  return {
    width: meta.width ?? null,
    height: meta.height ?? null,
    format: meta.format ?? null,
  };
}

/**
 * Generate compressed, responsive renditions (WebP + AVIF) for an uploaded
 * image. Returns an array of variant descriptors ready for `media_variants`.
 *
 * @param {object} options
 * @param {string} options.filePath    Absolute path of the stored original.
 * @param {string} options.filename    Stored filename (used to derive renditions).
 * @param {string} options.outputDir   Absolute folder for generated files.
 * @param {string} options.urlBase    Public URL prefix mapped to `outputDir`.
 * @returns {Promise<Array<{format:string,width:number,height:number,sizeBytes:number,url:string,path:string}>>}
 */
export async function generateVariants({ filePath, filename, outputDir, urlBase }) {
  const variants = [];

  let metadata;
  try {
    metadata = await sharp(filePath, { animated: false }).metadata();
  } catch (error) {
    logger.warn('Skipping image optimisation: metadata could not be read', {
      filename,
      error: error.message,
    });
    return variants;
  }

  if (SKIP_VARIANTS.has(metadata.format)) return variants;

  const sourceWidth = metadata.width ?? 0;
  if (!sourceWidth) return variants;

  const capped = Math.min(sourceWidth, MAX_WIDTH);
  const widths = RESPONSIVE_WIDTHS.filter((width) => width < capped);
  widths.push(capped); // always emit the largest useful rendition

  await fs.mkdir(outputDir, { recursive: true });
  const base = path.basename(filename, path.extname(filename));

  for (const targetWidth of widths) {
    for (const { format, quality } of MODERN_FORMATS) {
      const outName = `${base}-${targetWidth}.${format}`;
      const outPath = path.join(outputDir, outName);
      try {
        const info = await sharp(filePath, { animated: false })
          .resize({ width: targetWidth, withoutEnlargement: true })
          .toFormat(format, { quality })
          .toFile(outPath);
        variants.push({
          format,
          width: info.width,
          height: info.height,
          sizeBytes: info.size,
          url: `${urlBase}/${outName}`,
          path: outPath,
        });
      } catch (error) {
        logger.warn('Could not generate an image variant', {
          filename,
          format,
          targetWidth,
          error: error.message,
        });
      }
    }
  }

  return variants;
}

/** Remove generated rendition files for an asset. Missing files are ignored. */
export async function removeFiles(paths = []) {
  await Promise.all(
    paths
      .filter(Boolean)
      .map((target) => fs.rm(target, { force: true }).catch(() => {})),
  );
}

export default { readImageMetadata, generateVariants, removeFiles, RESPONSIVE_WIDTHS, MAX_WIDTH };
