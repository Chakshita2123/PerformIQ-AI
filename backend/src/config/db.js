const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas using the MONGO_URI from .env.
 * If NODE_ENV is 'test', connects to a dedicated test database (e.g. performiq_test)
 * to keep test runs completely isolated from development/production data.
 * Called once when the server starts. Exits the process on failure.
 */
const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    // Use dedicated test database if in test mode or MONGO_URI_TEST is set
    if (process.env.NODE_ENV === 'test') {
      uri = process.env.MONGO_URI_TEST || uri.replace(/\/performiq(\?|$)/, '/performiq_test$1');
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host} [DB: ${conn.connection.name}]`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // crash early — better than silently failing later
  }
};

module.exports = connectDB;
