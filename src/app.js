const express = require('express');

const app = express();

// Middleware to read JSON
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Cattle Weighing API running' });
});

module.exports = app;
