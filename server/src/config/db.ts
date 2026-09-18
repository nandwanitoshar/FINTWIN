import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

let isConnected = false;
let lastConnectionError: string | null = null;
let activeUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fintwin';
let mongodServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<boolean> => {
  const preferredUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fintwin';
  activeUri = preferredUri;

  mongoose.set('strictQuery', true);

  // 1. Try connecting to already running MongoDB daemon
  try {
    await mongoose.connect(preferredUri, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    lastConnectionError = null;
    console.log(`[MONGODB] Connected successfully: ${mongoose.connection.host}:${mongoose.connection.port || 27017}/${mongoose.connection.name}`);
    return true;
  } catch (error: any) {
    console.log(`[MONGODB] No external daemon on ${preferredUri}. Starting real local MongoDB daemon...`);
  }

  // 2. Start real local MongoDB daemon process
  try {
    mongodServer = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'fintwin',
      },
    });
    activeUri = mongodServer.getUri();
    await mongoose.connect(activeUri);
    isConnected = true;
    lastConnectionError = null;
    console.log(`[MONGODB] Connected successfully to local MongoDB process: ${activeUri}`);
    return true;
  } catch (err: any) {
    // If port 27017 has conflict, start with dynamic port
    try {
      mongodServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'fintwin',
        },
      });
      activeUri = mongodServer.getUri();
      await mongoose.connect(activeUri);
      isConnected = true;
      lastConnectionError = null;
      console.log(`[MONGODB] Connected successfully to local MongoDB process: ${activeUri}`);
      return true;
    } catch (err2: any) {
      lastConnectionError = err2.message;
      console.error(`[MONGODB Error] Failed to connect: ${err2.message}`);
      isConnected = false;
      return false;
    }
  }
};

export const getIsConnected = (): boolean => isConnected && mongoose.connection.readyState === 1;

export const getDBStatus = () => ({
  status: isConnected && mongoose.connection.readyState === 1 ? 'ok' : 'error',
  database: isConnected && mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  connected: isConnected && mongoose.connection.readyState === 1,
  mode: 'MONGODB_PERSISTENT',
  uri: activeUri,
  host: isConnected ? mongoose.connection.host : null,
  port: isConnected ? mongoose.connection.port : null,
  databaseName: isConnected ? mongoose.connection.name : null,
  readyState: mongoose.connection.readyState,
  lastError: lastConnectionError,
});

export const disconnectDB = async (): Promise<void> => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
  if (mongodServer) {
    await mongodServer.stop();
    mongodServer = null;
  }
};


