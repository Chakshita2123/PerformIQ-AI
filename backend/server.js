require('dotenv').config(); // load .env first, before anything else

// ── Production safety check ───────────────────────────────────────────────────
// Refuse to start in production if secrets are still set to demo/default values.
if (process.env.NODE_ENV === 'production') {
  const DEFAULT_JWT         = 'your_super_secret_jwt_key_here';
  const DEFAULT_ADMIN_PASS  = 'AdminDemo123!';
  const DEFAULT_TEACHER_PASS = 'TeacherDemo123!';

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT) {
    console.error(
      'FATAL: JWT_SECRET is not set or uses the default demo value. ' +
      'Set a strong secret before deploying.'
    );
    process.exit(1);
  }
  if (
    process.env.DEMO_ADMIN_PASSWORD   === DEFAULT_ADMIN_PASS ||
    process.env.DEMO_TEACHER_PASSWORD === DEFAULT_TEACHER_PASS
  ) {
    console.error(
      'FATAL: Demo passwords still use default values. ' +
      'Change DEMO_ADMIN_PASSWORD and DEMO_TEACHER_PASSWORD before deploying.'
    );
    process.exit(1);
  }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const assessmentRoutes = require('./src/routes/assessmentRoutes');
const { studentRouter: predStudentRouter, globalRouter: predGlobalRouter } = require('./src/routes/predictionRoutes');
const { router: interventionRouter, studentRouter: interventionStudentRouter } = require('./src/routes/interventionRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const ouladRoutes = require('./src/routes/ouladRoutes');
const errorHandler = require('./src/middleware/errorHandler');

// --- Database ---
connectDB();

const app = express();

// --- Security middleware ---
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

// --- Logging ---
// Use 'combined' format in production (Apache-style, includes IP, referrer, user-agent)
// and the more readable 'dev' format locally.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- Body parsing ---
app.use(express.json());

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);

// Assessment routes — mounted UNDER /api/students/:studentId
// mergeParams in the router lets it see :studentId
app.use('/api/students/:studentId/assessments', assessmentRoutes);

// Prediction routes — two mount points:
//   POST /api/students/:studentId/predict
//   GET  /api/students/:studentId/predictions
app.use('/api/students/:studentId', predStudentRouter);

//   GET  /api/predictions?risk=High  (global view)
app.use('/api/predictions', predGlobalRouter);

// Intervention routes — two mount points:
//   POST   /api/interventions
//   PATCH  /api/interventions/:id
//   GET    /api/interventions/:id/impact
app.use('/api/interventions', interventionRouter);

//   GET    /api/students/:studentId/interventions
app.use('/api/students/:studentId/interventions', interventionStudentRouter);

// Dashboard
app.use('/api/dashboard', dashboardRoutes);

// OULAD early warning & benchmarks (Module 3)
app.use('/api/oulad', ouladRoutes);

// Health check — returns running status, connected database, and environment
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    success: true,
    message: 'PerformIQ API is running',
    database: mongoose.connection.name,
    environment: process.env.NODE_ENV || 'development',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Centralised error handler (must be LAST)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
