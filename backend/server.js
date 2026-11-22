require('dotenv').config(); // load .env first, before anything else

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const errorHandler = require('./src/middleware/errorHandler');

// --- Database ---
connectDB();

const app = express();

// --- Security middleware ---
// helmet sets safe HTTP headers (Content-Security-Policy, X-Frame-Options, etc.)
app.use(helmet());

// CORS — only allow the origins listed in .env
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : '*',
    credentials: true,
  })
);

// --- Logging ---
// 'dev' format: METHOD /path STATUS response-time ms
app.use(morgan('dev'));

// --- Body parsing ---
app.use(express.json()); // parse JSON request bodies

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);

// Health check — useful to verify the server is running
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'PerformIQ API is running' });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// --- Centralised error handler (must be LAST middleware) ---
app.use(errorHandler);

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
