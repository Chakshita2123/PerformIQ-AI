require('dotenv').config(); // load .env first, before anything else

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
const errorHandler = require('./src/middleware/errorHandler');

// --- Database ---
connectDB();

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
  })
);

// --- Logging ---
app.use(morgan('dev'));

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
