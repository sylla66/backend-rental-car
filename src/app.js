const express = require('express');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Car Rental Backend');
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
