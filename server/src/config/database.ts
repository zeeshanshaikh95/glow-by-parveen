import mongoose from 'mongoose';
import { config } from '../config/env.js';

mongoose.set('strictQuery', true);

/**
 * Strips anything that could embed credentials before text is logged.
 * Some driver errors (e.g. MongoParseError) quote the full connection string
 * in their message, so every log path that surfaces a driver error goes
 * through this first. The configured URI is masked whole, and any other
 * mongodb:// / mongodb+srv:// token is masked as a fallback.
 */
export function redactMongoSecrets(text: string): string {
  const withoutUri = text.split(config.mongoUri).join('[MONGODB_URI]');
  return withoutUri.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[MONGODB_URI]');
}

interface DriverErrorShape {
  code?: unknown;
  codeName?: unknown;
  message?: string;
}

/**
 * Converts a connection failure into a safe, actionable error.
 * Never includes the connection string — only guidance — so an authentication
 * problem can be diagnosed from hosting logs without leaking credentials.
 */
export function describeConnectionFailure(err: unknown): Error {
  const e = (err ?? {}) as DriverErrorShape;
  const raw = typeof e.message === 'string' ? e.message : String(err);

  const isAuth =
    e.code === 8000 ||
    e.codeName === 'AtlasError' ||
    /authentication failed|bad auth/i.test(raw);
  if (isAuth) {
    return new Error(
      [
        'MongoDB authentication failed (AtlasError code 8000) — the cluster',
        'was reached but rejected the login. The connection string is never',
        'logged. Check MONGODB_URI in the Render dashboard:',
        "1) include authSource=admin — Atlas stores database users in 'admin',",
        '   while a database name in the URI path (…/glow-by-parveen) makes the',
        '   driver authenticate against that database instead;',
        '2) the username must be the Atlas Database Access user (not your',
        '   Atlas account email);',
        '3) URL-encode the password if it contains any of  @ : / ? # [ ] % ;',
        '4) confirm the credentials still match Atlas → Database Access.',
      ].join('\n')
    );
  }

  if (/querySrv|getaddrinfo|ENOTFOUND|ETIMEOUT|server selection|timed? ?out/i.test(raw)) {
    return new Error(
      `MongoDB unreachable: ${redactMongoSecrets(raw)}. Check the hostname in ` +
        'MONGODB_URI and that Atlas → Network Access allows 0.0.0.0/0 ' +
        '(Render free tier uses rotating egress IPs).'
    );
  }

  return new Error(`MongoDB connection failed: ${redactMongoSecrets(raw)}`);
}

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    console.error(
      '[db] MongoDB connection error:',
      redactMongoSecrets(err.message)
    );
  });

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
  } catch (err) {
    // Never let raw driver errors (which may quote the URI) escape unmasked.
    throw describeConnectionFailure(err);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
