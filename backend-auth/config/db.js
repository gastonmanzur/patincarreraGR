import mongoose from 'mongoose';

const LOCAL_FALLBACK_URI = 'mongodb://127.0.0.1:27017/backend-auth';

const sanitizeMongoUri = (uri) => {
  if (!uri) return '';

  try {
    const parsed = new URL(uri);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch (error) {
    return uri.replace(/\/\/([^@]+)@/, '//***@');
  }
};

const resolveMongoUri = () => {
  const rawUri = process.env.MONGODB_URI?.trim();

  if (!rawUri) {
    console.warn(
      `[db] MONGODB_URI no está definido. Usando base de datos local por defecto: ${LOCAL_FALLBACK_URI}`
    );
    return LOCAL_FALLBACK_URI;
  }

  return rawUri;
};

const connectDB = async () => {
  const uri = resolveMongoUri();

  try {
    await mongoose.connect(uri);
    return { connection: mongoose.connection, uri };
  } catch (error) {
    error.mongoUri = uri;
    throw error;
  }
};

export { connectDB as default, connectDB, resolveMongoUri, sanitizeMongoUri };
