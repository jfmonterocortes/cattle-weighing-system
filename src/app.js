require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const pesajesRoutes = require('./routes/pesajes.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Cattle Weighing API running' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/pesajes', pesajesRoutes);

module.exports = app;
