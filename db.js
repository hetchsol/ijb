const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    // If no Atlas URI configured, use in-memory MongoDB for development
    if (!uri || uri.includes('your_username') || uri.includes('your_password')) {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        uri = mongod.getUri();
        console.log('Using in-memory MongoDB for development');
        console.log('NOTE: Data will be lost on server restart. Set MONGODB_URI in .env for persistent storage.');
      } catch (e) {
        console.error('MONGODB_URI is not set and mongodb-memory-server is not available.');
        console.error('Please set MONGODB_URI in your environment variables.');
        process.exit(1);
      }
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
