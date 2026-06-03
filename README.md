# KubeMarket

KubeMarket is a full-stack Indonesian marketplace application with a React frontend, Express API, and PostgreSQL database.

## Stack

- Frontend: React, Vite, Tailwind CSS, nginx
- Backend: Node.js, Express, JWT, PostgreSQL
- Deployment: Docker Compose and Kubernetes manifests

## Local Run

```bash
docker compose up --build
```

Open `http://localhost:8080`.

## Database Initialization

The PostgreSQL image is built from `database/Dockerfile`. On first database creation, the official PostgreSQL entrypoint runs:

- `database/schema.sql` as `/docker-entrypoint-initdb.d/01-schema.sql`
- `database/seed.sql` as `/docker-entrypoint-initdb.d/02-seed.sql`

This creates all tables and inserts marketplace seed data automatically, including Indonesian categories and products. The scripts run only when the PostgreSQL data directory is empty. For Docker Compose, remove the `postgres-data` volume if you need to re-run initialization from scratch:

```bash
docker compose down -v
docker compose up --build
```

For Kubernetes, the same initialization runs when the PostgreSQL PVC is new or empty. If an old PVC already exists without seed data, delete or replace that PVC before redeploying.

Seeded accounts use password `Password123!`.

- Admin: `admin@kubemarket.local`
- Customers: `customer1@kubemarket.local` through `customer20@kubemarket.local`

## Kubernetes Deploy

```bash
kubectl apply -f k8s/
```

The manifests create namespace `kubemarket`, frontend/backend services, PostgreSQL with PVC, ConfigMap, and Secret. PostgreSQL uses `malubullul/kubemarket-postgres:latest`, which contains the schema and seed init scripts. Replace the placeholder JWT and database secrets before using this outside a lab.

## Docker Images

The Compose file builds these images:

- `malubullul/kubemarket-frontend:latest`
- `malubullul/kubemarket-backend:latest`
- `malubullul/kubemarket-postgres:latest`

Push them with:

```bash
docker compose push
```

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `GET /api/products/:id`
- `GET|POST|PUT|DELETE /api/addresses`
- `GET|POST|PUT|DELETE /api/cart`
- `GET /api/orders`
- `POST /api/orders/checkout`
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/orders`
- `GET|POST|PUT|DELETE /api/admin/categories`
