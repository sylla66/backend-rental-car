# Car Rental Backend

This repository contains the backend service for the Car Rental application.

## Overview

The backend provides REST APIs for managing cars, reservations, users, and rental operations. It is designed to support a web or mobile frontend and handle authentication, business rules, and persistence.

## Features

- User registration and authentication
- Car inventory management
- Reservation creation and management
- Rental status tracking
- Basic validation and error handling

## Tech Stack

- Node.js
- Express
- Database (e.g. PostgreSQL, MySQL, MongoDB)
- ORM / query builder (e.g. Sequelize, TypeORM, Mongoose)

## Setup

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd backend
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Configure environment variables
   Create a `.env` file with values such as:
   ```env
   PORT=3000
   DATABASE_URL=your_database_connection_string
   JWT_SECRET=your_jwt_secret
   ```
4. Run database migrations or seed data if needed
   ```bash
   npm run migrate
   npm run seed
   ```

## Run

Start the development server:

```bash
npm run dev
```

Or start in production mode:

```bash
npm start
```

## API Endpoints

Common endpoints may include:

- `POST /auth/register`
- `POST /auth/login`
- `GET /cars`
- `POST /cars`
- `GET /cars/:id`
- `PUT /cars/:id`
- `DELETE /cars/:id`
- `POST /reservations`
- `GET /reservations`
- `GET /reservations/:id`

## Testing

Run tests with:

```bash
npm test
```

## Notes

Adjust configuration, routes, and database settings according to your project implementation.

## Variables d'environnement (sécurité)

Les valeurs sensibles (mots de passe, clefs, URLs de base de données) ne doivent pas être stockées en clair dans le dépôt.

- Copiez `.env.example` en `.env` et remplissez les valeurs requises:

```bash
cp .env.example .env
# puis éditez .env
```

- Le fichier `.env` est déjà listé dans `.gitignore` et ne doit pas être commité.

- Exemple de variables utiles: `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`.

