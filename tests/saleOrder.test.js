'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { User, Vehicle, Category, SaleOrder, Payment } = require('../src/models');

// ─── Mock Stripe ─────────────────────────────────────────────────────────────
jest.mock('../src/utils/stripe', () => ({
  getStripe: () => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_sale_123',
        client_secret: 'pi_test_sale_123_secret',
      }),
      cancel: jest.fn().mockResolvedValue({ status: 'canceled' }),
    },
  }),
}));

// ─── Helper : créer un user directement en base (bypass register) ─────────────
// Le schéma User stocke passwordHash (pas password) et utilise fullName (pas name).
// Il n'y a pas de pre-save hook — on hashe manuellement avant create().
const createUser = async ({ fullName, email, password, role = 'client' }) => {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({ fullName, email, passwordHash, role });
};

// ─── Setup / Teardown ────────────────────────────────────────────────────────
let adminToken, userToken, adminId, userId, vehicleId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Vehicle.deleteMany({}),
    SaleOrder.deleteMany({}),
    Payment.deleteMany({}),
  ]);

  // Créer la catégorie
  const cat = await Category.create({ name: 'Berline' });

  // Créer les users avec les bons champs du schéma
  const admin = await createUser({
    fullName: 'Admin Test',
    email: 'admin@saletest.com',
    password: 'Admin1234!',
    role: 'admin',
  });
  adminId = admin._id;

  const user = await createUser({
    fullName: 'Buyer Test',
    email: 'buyer@saletest.com',
    password: 'Buyer1234!',
    role: 'client',             // enum: ['client', 'admin']
  });
  userId = user._id;

  // Créer le véhicule disponible à la vente
  const vehicle = await Vehicle.create({
    name: 'Toyota Corolla',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2022,
    category: cat._id,
    dailyRate: 25000,
    salePrice: 8500000,
    isAvailableForSale: true,
    isSold: false,
    licensePlate: 'DK-SALE-01',
  });
  vehicleId = vehicle._id;

  // Obtenir les tokens JWT via l'API login
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@saletest.com', password: 'Admin1234!' });
  adminToken = adminRes.body.token;

  const userRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'buyer@saletest.com', password: 'Buyer1234!' });
  userToken = userRes.body.token;
}, 30000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}, 15000);

afterEach(async () => {
  await SaleOrder.deleteMany({});
  await Payment.deleteMany({});
  await Vehicle.findByIdAndUpdate(vehicleId, {
    isAvailableForSale: true,
    isSold: false,
  });
}, 10000);

// ─── POST /api/sale-orders ───────────────────────────────────────────────────
describe('POST /api/sale-orders', () => {
  it('crée une commande et retourne un clientSecret', async () => {
    const res = await request(app)
      .post('/api/sale-orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ vehicleId: vehicleId.toString() });

    expect(res.status).toBe(201);
    expect(res.body.saleOrder.status).toBe('pending');
    expect(res.body.clientSecret).toBe('pi_test_sale_123_secret');
  }, 10000);

  it('refuse si vehicleId absent', async () => {
    const res = await request(app)
      .post('/api/sale-orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(400);
  }, 10000);

  it('refuse si véhicule non disponible à la vente', async () => {
    await Vehicle.findByIdAndUpdate(vehicleId, { isAvailableForSale: false });

    const res = await request(app)
      .post('/api/sale-orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ vehicleId: vehicleId.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pas disponible/);
  }, 10000);

  it('refuse si véhicule déjà vendu', async () => {
    await Vehicle.findByIdAndUpdate(vehicleId, { isSold: true });

    const res = await request(app)
      .post('/api/sale-orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ vehicleId: vehicleId.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/déjà été vendu/);
  }, 10000);

  it('refuse une 2e commande pending sur le même véhicule', async () => {
    await request(app)
      .post('/api/sale-orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ vehicleId: vehicleId.toString() });

    const res = await request(app)
      .post('/api/sale-orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ vehicleId: vehicleId.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/déjà en cours/);
  }, 10000);

  it('refuse sans authentification', async () => {
    const res = await request(app)
      .post('/api/sale-orders')
      .send({ vehicleId: vehicleId.toString() });

    expect(res.status).toBe(401);
  }, 10000);
});

// ─── GET /api/sale-orders ────────────────────────────────────────────────────
describe('GET /api/sale-orders', () => {
  beforeEach(async () => {
    await SaleOrder.create({
      buyer: userId,
      vehicle: vehicleId,
      totalPrice: 8500000,
      status: 'pending',
      stripePaymentIntentId: 'pi_test_get_001',
    });
  }, 10000);

  it('retourne uniquement les commandes du user connecté', async () => {
    const res = await request(app)
      .get('/api/sale-orders')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].buyer.email).toBe('buyer@saletest.com');
  }, 10000);

  it('admin voit toutes les commandes', async () => {
    const res = await request(app)
      .get('/api/sale-orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  }, 10000);

  it('supporte la pagination', async () => {
    const res = await request(app)
      .get('/api/sale-orders?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pages');
    expect(res.body).toHaveProperty('page', 1);
  }, 10000);
});

// ─── GET /api/sale-orders/:id ────────────────────────────────────────────────
describe('GET /api/sale-orders/:id', () => {
  it('retourne le détail de la commande', async () => {
    const order = await SaleOrder.create({
      buyer: userId,
      vehicle: vehicleId,
      totalPrice: 8500000,
      status: 'pending',
      stripePaymentIntentId: 'pi_test_detail_001',
    });

    const res = await request(app)
      .get(`/api/sale-orders/${order._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(order._id.toString());
  }, 10000);

  it("refuse l'accès à une commande d'un autre user", async () => {
    const otherUser = await createUser({
      fullName: 'Other User',
      email: 'other@saletest.com',
      password: 'Other1234!',
      role: 'client',
    });
    const order = await SaleOrder.create({
      buyer: otherUser._id,
      vehicle: vehicleId,
      totalPrice: 8500000,
      status: 'pending',
      stripePaymentIntentId: 'pi_test_other_001',
    });

    const res = await request(app)
      .get(`/api/sale-orders/${order._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    await User.findByIdAndDelete(otherUser._id);
  }, 10000);
});

// ─── PATCH /api/sale-orders/:id/cancel ──────────────────────────────────────
describe('PATCH /api/sale-orders/:id/cancel', () => {
  it('annule une commande pending', async () => {
    const order = await SaleOrder.create({
      buyer: userId,
      vehicle: vehicleId,
      totalPrice: 8500000,
      status: 'pending',
      stripePaymentIntentId: 'pi_test_cancel_001',
    });

    const res = await request(app)
      .patch(`/api/sale-orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('cancelled');
  }, 10000);

  it("refuse d'annuler une commande déjà payée", async () => {
    const order = await SaleOrder.create({
      buyer: userId,
      vehicle: vehicleId,
      totalPrice: 8500000,
      status: 'paid',
      stripePaymentIntentId: 'pi_test_cancel_002',
    });

    const res = await request(app)
      .patch(`/api/sale-orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/paid/);
  }, 10000);

  it("refuse l'annulation par un autre user", async () => {
    const order = await SaleOrder.create({
      buyer: adminId,
      vehicle: vehicleId,
      totalPrice: 8500000,
      status: 'pending',
      stripePaymentIntentId: 'pi_test_cancel_003',
    });

    const res = await request(app)
      .patch(`/api/sale-orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  }, 10000);
});

// ─── PATCH /api/sale-orders/:id/status (admin) ──────────────────────────────
describe('PATCH /api/sale-orders/:id/status', () => {
  it('admin change le statut en shipped', async () => {
    const order = await SaleOrder.create({
      buyer: userId,
      vehicle: vehicleId,
      totalPrice: 8500000,
      status: 'paid',
      stripePaymentIntentId: 'pi_test_status_001',
    });

    const res = await request(app)
      .patch(`/api/sale-orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('shipped');
  }, 10000);

  it('marque le véhicule comme vendu quand delivered', async () => {
    const order = await SaleOrder.create({
      buyer: userId,
      vehicle: vehicleId,
      totalPrice: 8500000,
      status: 'paid',
      stripePaymentIntentId: 'pi_test_status_002',
    });

    const res = await request(app)
      .patch(`/api/sale-orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });

    expect(res.status).toBe(200);

    const updatedVehicle = await Vehicle.findById(vehicleId);
    expect(updatedVehicle.isSold).toBe(true);
    expect(updatedVehicle.isAvailableForSale).toBe(false);
  }, 10000);

  it('refuse un statut invalide', async () => {
    const order = await SaleOrder.create({
      buyer: userId,
      vehicle: vehicleId,
      totalPrice: 8500000,
      status: 'paid',
      stripePaymentIntentId: 'pi_test_status_003',
    });

    const res = await request(app)
      .patch(`/api/sale-orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
  }, 10000);

  it('refuse à un user normal', async () => {
    const order = await SaleOrder.create({
      buyer: userId,
      vehicle: vehicleId,
      totalPrice: 8500000,
      status: 'paid',
      stripePaymentIntentId: 'pi_test_status_004',
    });

    const res = await request(app)
      .patch(`/api/sale-orders/${order._id}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'shipped' });

    expect(res.status).toBe(403);
  }, 10000);
});