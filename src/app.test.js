const request = require('supertest');
const app = require('./app');

describe('Health check', () => {
  test('GET /health returns 200 with status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
    // On vérifie que "database" est présent sans imposer sa valeur
    // (connected en prod, disconnected en test — les deux sont valides)
    expect(response.body).toHaveProperty('database');
  });

  test('GET / returns welcome message', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Car Rental Backend');
  });

  test('GET /unknown returns 404', async () => {
    const response = await request(app).get('/unknown-route');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});