# 🚗 RentalCar — Backend API

API REST complète pour une application de location et vente de véhicules, construite avec Node.js, Express 5 et MongoDB.

[![CI](https://github.com/sylla66/backend-rental-car/actions/workflows/ci.yml/badge.svg)](https://github.com/sylla66/backend-rental-car/actions)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green)](https://mongodb.com)
[![Tests](https://img.shields.io/badge/Tests-44%20passing-brightgreen)]()

---

## 🌐 Démo

| Service | URL |
|---|---|
| API Production | https://backend-rental-car.onrender.com |
| Health check | https://backend-rental-car.onrender.com/health |
| Frontend | https://rental-car-beryl-six.vercel.app |

---

## ✨ Fonctionnalités

- **Auth JWT** — Register, Login, profil (`/me`), middleware `protect` + `isAdmin`
- **Véhicules** — CRUD admin, catalogue public avec filtres, recherche full-text, tri, pagination
- **Réservations** — Anti-chevauchement de dates, calcul prix automatique, annulation
- **Paiement Stripe** — PaymentIntent, webhook sécurisé (signature cryptographique), conversion XOF→USD
- **Ventes** — SaleOrder avec flux complet (pending → paid → shipped → delivered)
- **Avis clients** — Uniquement pour les clients ayant loué ou acheté le véhicule, note moyenne
- **Dashboard Admin** — Stats en temps réel (revenus, réservations, top véhicules)
- **CI/CD** — GitHub Actions (tests + lint) + Render auto-deploy

---

## 🛠 Stack technique

| Technologie | Version | Usage |
|---|---|---|
| Node.js | 24.x | Runtime |
| Express | 5.x | Framework HTTP |
| MongoDB | 7.x | Base de données |
| Mongoose | 9.x | ODM |
| JSON Web Token | 9.x | Authentification |
| bcryptjs | 3.x | Hashage mot de passe |
| Stripe | 22.x | Paiement en ligne |
| Jest + Supertest | 29.x | Tests |
| Docker | — | MongoDB local |

---

## 📁 Structure du projet

```
backend-rental-car/
├── src/
│   ├── app.js                  # Express app (routes + middlewares)
│   ├── server.js               # Point d'entrée (connectDB + listen)
│   ├── config/
│   │   └── db.js               # Connexion MongoDB
│   ├── controllers/
│   │   ├── adminController.js  # Stats dashboard
│   │   ├── authController.js   # Register / Login / Me
│   │   ├── bookingController.js
│   │   ├── paymentController.js # Stripe PaymentIntent + Webhook
│   │   ├── reviewController.js
│   │   ├── saleOrderController.js
│   │   └── vehicleController.js
│   ├── middleware/
│   │   ├── authMiddleware.js   # protect + isAdmin
│   │   └── corsMiddleware.js   # CORS multi-origines
│   ├── models/
│   │   ├── index.js            # Chargement centralisé
│   │   ├── Booking.js
│   │   ├── Category.js
│   │   ├── Payment.js          # Polymorphique (Booking | SaleOrder)
│   │   ├── Review.js
│   │   ├── SaleOrder.js
│   │   ├── User.js
│   │   └── Vehicle.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── saleOrderRoutes.js
│   │   └── vehicleRoutes.js
│   ├── seed/
│   │   └── vehicles.js         # Données de démo
│   └── utils/
│       └── stripe.js           # Singleton Stripe
├── tests/
│   ├── app.test.js
│   ├── review.test.js
│   └── saleOrder.test.js
├── .github/workflows/ci.yml
├── jest.setup.js
└── docker-compose.yml
```

---

## 🚀 Installation locale

### Prérequis

- Node.js 18+
- Docker (pour MongoDB)
- Compte Stripe (clés test)

### 1. Cloner le repo

```bash
git clone https://github.com/sylla66/backend-rental-car.git
cd backend-rental-car
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Remplir `.env` :

```env
PORT=10000
MONGODB_URI=mongodb://admin:password@localhost:27017/rental-car?authSource=admin
JWT_SECRET=your_jwt_secret_here
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
NODE_ENV=development
```

### 4. Démarrer MongoDB avec Docker

```bash
docker-compose up -d
```

### 5. Lancer le serveur

```bash
npm run dev     # Développement (nodemon)
npm start       # Production
```

L'API tourne sur `http://localhost:10000`

---

## 🧪 Tests

```bash
npm test                    # Lancer tous les tests
npm test -- --watch         # Mode watch
npm test -- tests/review    # Un fichier spécifique
```

**44 tests passants** couvrant :
- Auth (register, login, protection des routes)
- SaleOrder (création, annulation, statuts, anti-doublon)
- Reviews (création conditionnelle, unicité, suppression)

---

## 📡 API Endpoints

### Auth — `/api/auth`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/register` | Public | Créer un compte |
| POST | `/login` | Public | Se connecter |
| GET | `/me` | Authentifié | Profil utilisateur |

### Véhicules — `/api/vehicles`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/` | Public | Catalogue (filtres, recherche, pagination) |
| GET | `/:id` | Public | Détail d'un véhicule |
| POST | `/` | Admin | Créer un véhicule |
| PUT | `/:id` | Admin | Modifier un véhicule |
| DELETE | `/:id` | Admin | Supprimer un véhicule |

**Paramètres de filtre :**
```
?search=BMW
?fuelType=diesel
?transmission=automatique
?isAvailable=true
?minPrice=50000&maxPrice=200000
?sortBy=dailyRate&sortOrder=asc
?page=1&limit=9
```

### Réservations — `/api/bookings`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/` | Authentifié | Créer une réservation |
| GET | `/` | Authentifié | Mes réservations |
| GET | `/admin/all` | Admin | Toutes les réservations |
| GET | `/:id` | Authentifié | Détail |
| PATCH | `/:id/cancel` | Authentifié | Annuler |

### Paiement — `/api/payments`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/create-intent` | Authentifié | Créer un PaymentIntent Stripe |
| POST | `/webhook` | Stripe | Webhook de confirmation |
| GET | `/:bookingId/status` | Authentifié | Statut du paiement |

### Ventes — `/api/sale-orders`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/` | Authentifié | Créer une commande d'achat |
| GET | `/` | Authentifié | Mes commandes (admin: toutes) |
| GET | `/:id` | Authentifié | Détail |
| PATCH | `/:id/cancel` | Authentifié | Annuler (pending uniquement) |
| PATCH | `/:id/status` | Admin | Changer le statut |

### Avis — `/api/reviews`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/vehicle/:vehicleId` | Public | Avis d'un véhicule + note moyenne |
| POST | `/` | Authentifié* | Créer un avis |
| GET | `/me` | Authentifié | Mes avis |
| PATCH | `/:id` | Authentifié | Modifier son avis |
| DELETE | `/:id` | Authentifié | Supprimer (auteur ou admin) |
| GET | `/` | Admin | Tous les avis |

*Uniquement si le user a une réservation confirmée ou un achat payé sur ce véhicule.

### Admin — `/api/admin`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/stats` | Admin | KPIs, revenus, top véhicules, réservations récentes |

---

## 🔐 Sécurité

- Mots de passe hashés avec **bcrypt** (10 rounds)
- Tokens JWT avec expiration 7 jours
- Champ `passwordHash` exclu des réponses API (`select: false` + `toJSON`)
- Webhook Stripe vérifié par signature cryptographique
- CORS configuré par liste blanche d'origines
- Messages d'erreur auth volontairement vagues (anti-énumération)

---

## 🔄 Flux de paiement Stripe

```
POST /bookings              → Booking { status: 'pending' }
POST /payments/create-intent → PaymentIntent + clientSecret
  ↓ (Stripe Elements côté frontend)
POST /payments/webhook      → payment_intent.succeeded
  ↓
Booking { status: 'confirmed' }
Payment { status: 'paid' }
```

---

## 🌍 Déploiement

### Render (Backend)

Variables d'environnement à configurer sur Render :

```
MONGODB_URI
JWT_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
FRONTEND_URL
ALLOWED_ORIGINS
NODE_ENV=production
```

### GitHub Actions (CI)

Le pipeline `.github/workflows/ci.yml` :
1. Lance MongoDB natif GitHub Actions
2. Installe les dépendances
3. Exécute les 44 tests
4. Déclenche le redéploiement Render si les tests passent

---

## 👨‍💻 Auteur

**Hamidou El Cheikh Sylla**
Développeur Full-Stack — Dakar, Sénégal

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Hamidou%20Sylla-blue)](https://linkedin.com/in/hamidou-sylla)
[![GitHub](https://img.shields.io/badge/GitHub-sylla66-black)](https://github.com/sylla66)