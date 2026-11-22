const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas using the MONGO_URI from .env.
 * Called once when the server starts. Exits the process on failure
 * so we never serve requests without a database.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // crash early — better than silently failing later
  }
};

module.exports = connectDB;
