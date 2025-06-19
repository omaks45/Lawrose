/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGO_URL,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    bufferCommands: false,
    autoIndex: process.env.NODE_ENV === 'development',
    retryWrites: true,
    w: 'majority',
    readPreference: 'primary',
    compressors: ['zlib'],
    zlibCompressionLevel: 6,
  },
  connectionName: 'user-service',
}));