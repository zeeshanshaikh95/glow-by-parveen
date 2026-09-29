import mongoose from 'mongoose';
import { config } from '../config/env.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message);
  });

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
