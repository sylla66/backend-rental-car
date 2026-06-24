'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { User, Vehicle, Category, Booking, SaleOrder, Review } = require('../src/models');

// ─── Helper création user ─────────────────────────────────────────────────────
const createUser = async ({ fullName, email, password, role = 'client' }) => {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({ fullName, email, passwordHash, role });
};

// ─── Variables partagées ──────────────────────────────────────────────────────
let adminToken, userToken, user2Token;
let adminId, userId, user2Id;
let vehicleId, categoryId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Vehicle.deleteMany({}),
    Booking.deleteMany({}),
    SaleOrder.deleteMany({}),
    Review.deleteMany({}),
  ]);

  const cat = await Category.create({ name: 'SUV' });
  categoryId = cat._id;

  const admin = await createUser({ fullName: 'Admin', email: 'admin@reviewtest.com', password: 'Admin1234!', role: 'admin' });
  adminId = admin._id;

  const user = await createUser({ fullName: 'Client Un', email: 'user1@reviewtest.com', password: 'User1234!' });
  userId = user._id;

  const user2 = await createUser({ fullName: 'Client Deux', email: 'user2@reviewtest.com', password: 'User1234!' });
  user2Id = user2._id;

  const vehicle = await Vehicle.create({
    name: 'Honda Civic',
    brand: 'Honda',
    model: 'Civic',
    year: 2021,
    category: categoryId,
    dailyRate: 20000,
    licensePlate: 'DK-REV-01',
  });
  vehicleId = vehicle._id;

  // user1 a une réservation confirmée sur ce véhicule
  await Booking.create({
    userId,
    vehicleId,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-05'),
    totalPrice: 80000,
    status: 'confirmed',
  });

  // user2 a un achat payé sur ce véhicule
  await SaleOrder.create({
    buyer: user2Id,
    vehicle: vehicleId,
    totalPrice: 5000000,
    status: 'paid',
    stripePaymentIntentId: 'pi_test_review_001',
  });

  // Tokens
  const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@reviewtest.com', password: 'Admin1234!' });
  adminToken = adminRes.body.token;

  const userRes = await request(app).post('/api/auth/login').send({ email: 'user1@reviewtest.com', password: 'User1234!' });
  userToken = userRes.body.token;

  const user2Res = await request(app).post('/api/auth/login').send({ email: 'user2@reviewtest.com', password: 'User1234!' });
  user2Token = user2Res.body.token;
}, 30000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}, 15000);

afterEach(async () => {
  await Review.deleteMany({});
}, 10000);

// ─── POST /api/reviews ────────────────────────────────────────────────────────
describe('POST /api/reviews', () => {
  it('user avec réservation confirmée peut créer un avis', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ vehicleId: vehicleId.toString(), rating: 5, comment: 'Excellent véhicule !' });

    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(5);
    expect(res.body.review.userId.fullName).toBe('Client Un');
  }, 10000);

  it('user avec achat confirmé peut créer un avis', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ vehicleId: vehicleId.toString(), rating: 4, comment: 'Très bon achat.' });

    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(4);
  }, 10000);

  it('refuse si le user na pas utilisé ce véhicule', async () => {
    // admin n'a ni réservation ni achat
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vehicleId: vehicleId.toString(), rating: 3 });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/loué ou acheté/);
  }, 10000);

  it('refuse un 2e avis sur le même véhicule (index unique)', async () => {
    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ vehicleId: vehicleId.toString(), rating: 5 });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ vehicleId: vehicleId.toString(), rating: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/déjà laissé/);
  }, 10000);

  it('refuse sans authentification', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ vehicleId: vehicleId.toString(), rating: 4 });

    expect(res.status).toBe(401);
  }, 10000);

  it('refuse si rating manquant', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ vehicleId: vehicleId.toString() });

    expect(res.status).toBe(400);
  }, 10000);
});

// ─── GET /api/reviews/vehicle/:vehicleId ─────────────────────────────────────
describe('GET /api/reviews/vehicle/:vehicleId', () => {
  beforeEach(async () => {
    await Review.create({ userId, vehicleId, rating: 5, comment: 'Top' });
    await Review.create({ userId: user2Id, vehicleId, rating: 3, comment: 'Moyen' });
  }, 10000);

  it('retourne les avis avec note moyenne (public)', async () => {
    const res = await request(app)
      .get(`/api/reviews/vehicle/${vehicleId}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.avgRating).toBe(4); // (5+3)/2
    expect(res.body.reviews).toHaveLength(2);
  }, 10000);

  it('supporte la pagination', async () => {
    const res = await request(app)
      .get(`/api/reviews/vehicle/${vehicleId}?page=1&limit=1`);

    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
    expect(res.body.pages).toBe(2);
  }, 10000);
});

// ─── GET /api/reviews/me ──────────────────────────────────────────────────────
describe('GET /api/reviews/me', () => {
  it('retourne les avis du user connecté', async () => {
    await Review.create({ userId, vehicleId, rating: 4, comment: 'Bien' });

    const res = await request(app)
      .get('/api/reviews/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.reviews[0].rating).toBe(4);
  }, 10000);
});

// ─── PATCH /api/reviews/:id ───────────────────────────────────────────────────
describe('PATCH /api/reviews/:id', () => {
  it('auteur peut modifier son avis', async () => {
    const review = await Review.create({ userId, vehicleId, rating: 3, comment: 'Bien' });

    const res = await request(app)
      .patch(`/api/reviews/${review._id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ rating: 5, comment: 'Finalement excellent !' });

    expect(res.status).toBe(200);
    expect(res.body.review.rating).toBe(5);
    expect(res.body.review.comment).toBe('Finalement excellent !');
  }, 10000);

  it("refuse la modification par un autre user", async () => {
    const review = await Review.create({ userId, vehicleId, rating: 3 });

    const res = await request(app)
      .patch(`/api/reviews/${review._id}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ rating: 1 });

    expect(res.status).toBe(403);
  }, 10000);
});

// ─── DELETE /api/reviews/:id ──────────────────────────────────────────────────
describe('DELETE /api/reviews/:id', () => {
  it('auteur peut supprimer son avis', async () => {
    const review = await Review.create({ userId, vehicleId, rating: 4 });

    const res = await request(app)
      .delete(`/api/reviews/${review._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/supprimé/);

    const deleted = await Review.findById(review._id);
    expect(deleted).toBeNull();
  }, 10000);

  it('admin peut supprimer nimporte quel avis', async () => {
    const review = await Review.create({ userId, vehicleId, rating: 2 });

    const res = await request(app)
      .delete(`/api/reviews/${review._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  }, 10000);

  it('user ne peut pas supprimer lavis dun autre', async () => {
    const review = await Review.create({ userId, vehicleId, rating: 5 });

    const res = await request(app)
      .delete(`/api/reviews/${review._id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(403);
  }, 10000);
});

// ─── GET /api/reviews (admin) ─────────────────────────────────────────────────
describe('GET /api/reviews (admin)', () => {
  it('admin voit tous les avis', async () => {
    await Review.create({ userId, vehicleId, rating: 5 });
    await Review.create({ userId: user2Id, vehicleId, rating: 4 });

    const res = await request(app)
      .get('/api/reviews')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  }, 10000);

  it('refuse à un user normal', async () => {
    const res = await request(app)
      .get('/api/reviews')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  }, 10000);
});