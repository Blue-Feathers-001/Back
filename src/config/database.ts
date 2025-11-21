import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    // OPTIMIZED: Connection pooling and performance settings
    const conn = await mongoose.connect(process.env.MONGODB_URI as string, {
      // Connection pool settings for better concurrency
      maxPoolSize: 10,           // Max connections in pool
      minPoolSize: 2,            // Min connections to keep open
      serverSelectionTimeoutMS: 5000,  // Timeout for server selection
      socketTimeoutMS: 45000,    // Socket timeout
      // Performance optimizations
      autoIndex: process.env.NODE_ENV !== 'production', // Disable auto-indexing in production
    });

    // Enable query debugging in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName: string, method: string, query: any) => {
        console.log(`[Mongoose] ${collectionName}.${method}`, JSON.stringify(query).substring(0, 100));
      });
    }

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
