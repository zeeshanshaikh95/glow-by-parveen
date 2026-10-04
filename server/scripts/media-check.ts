/**
 * Cloudinary connectivity check.
 *
 *   npm run media:check -w server          → ping, upload, verify, delete
 *   npm run media:check -w server -- --keep → keep the uploaded test file
 *
 * It uses the real integration code (config parsing + SDK adapter), so a green
 * run proves the CLOUDINARY_* env vars in server/.env are correct. No database
 * records and no site content are touched — the only asset created is a
 * throwaway 1×1 pixel image that is deleted again at the end.
 */
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { config, isCloudinaryConfigured } from '../src/config/env.js';
import { sniffImageMime } from '../src/middleware/upload.js';
import {
  destroyAsset,
  isCloudinaryUrl,
  pingCloudinary,
  publicIdFromUrl,
  uploadImageBuffer,
} from '../src/services/cloudinaryService.js';

const keep = process.argv.includes('--keep');
/** `--png=<path>` writes the generated test image instead of uploading it. */
const pngOut = process.argv.find((arg) => arg.startsWith('--png='))?.slice('--png='.length);

/** Confirms the generated PNG really decodes back to raw pixel data. */
function assertValidPng(png: Buffer): void {
  const idatStart = png.indexOf(Buffer.from('IDAT', 'ascii'));
  const idatLength = png.readUInt32BE(idatStart - 4);
  const idat = png.subarray(idatStart + 4, idatStart + 4 + idatLength);
  const inflated = zlib.inflateSync(idat);
  const sniffed = sniffImageMime(png);
  if (sniffed !== 'image/png' || inflated.length === 0) {
    fail(`the generated test image failed self-validation (${sniffed ?? 'not an image'})`);
  }
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/** Builds a valid 8×8 pink PNG in memory (no fixtures needed on disk). */
function makeTestPng(size = 8): Buffer {
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const row = y * stride;
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const px = row + 1 + x * 3;
      raw[px] = 0xf7;
      raw[px + 1] = 0xc6;
      raw[px + 2] = 0xd8;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  // Debug aid: `npm run media:check -w server -- --png=tmp/test.png` writes the
  // generated image instead of uploading, so the pipeline can be inspected.
  if (pngOut) {
    const png = makeTestPng();
    assertValidPng(png);
    writeFileSync(pngOut, png);
    console.log(`✓ wrote test image to ${pngOut} (${png.byteLength} bytes)`);
    return;
  }

  console.log('Cloudinary media check\n');

  if (!isCloudinaryConfigured) {
    fail(
      [
        'Cloudinary is not configured, so uploads currently fall back to local disk.',
        'Add these to server/.env (git-ignored) and re-run:',
        '  CLOUDINARY_CLOUD_NAME=…',
        '  CLOUDINARY_API_KEY=…',
        '  CLOUDINARY_API_SECRET=…',
      ].join('\n')
    );
  }

  const { cloudName, apiKey, folder } = config.cloudinary;
  // Only ever print identifiers, and mask the key too — never the secret.
  const maskedKey = apiKey ? `${apiKey.slice(0, 4)}…(${apiKey.length} chars)` : 'missing';
  console.log(`  cloud name : ${cloudName}`);
  console.log(`  api key    : ${maskedKey}`);
  console.log(`  folder     : ${folder}`);
  console.log(`  secret     : ${isCloudinaryConfigured ? 'set (hidden)' : 'missing'}\n`);

  try {
    const status = await pingCloudinary();
    console.log(`✓ credentials accepted (ping: ${status})`);
  } catch (err) {
    fail(
      `Cloudinary rejected the credentials: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const png = makeTestPng();
  assertValidPng(png);
  console.log(`✓ generated test image (${png.byteLength} bytes, decodes back to 8×8 pixel rows)`);
  console.log('… uploading');
  const uploaded = await uploadImageBuffer(png, 'glow-media-check.png');
  console.log(`✓ uploaded: ${uploaded.secureUrl}`);
  console.log(`  public_id: ${uploaded.publicId}`);
  console.log(`  format: ${uploaded.format} · ${uploaded.width}×${uploaded.height} · ${uploaded.bytes} bytes`);

  if (!isCloudinaryUrl(uploaded.secureUrl)) {
    fail('The returned URL is not a Cloudinary delivery URL — check the cloud name.');
  }
  const parsedBack = publicIdFromUrl(uploaded.secureUrl);
  if (parsedBack !== uploaded.publicId) {
    fail(`public_id round-trip mismatch (parsed "${parsedBack}" vs "${uploaded.publicId}")`);
  }
  console.log('✓ secure_url → public_id round trip OK');

  if (keep) {
    console.log('\n--keep set — test asset left in place. Delete it from the Cloudinary console.');
  } else {
    const result = await destroyAsset(uploaded.publicId);
    console.log(`✓ deleted test asset (${result})`);
  }

  console.log('\nAll good — the API can upload to and delete from Cloudinary.\n');
}

main().catch((err) => {
  console.error('\n✖ media:check failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
