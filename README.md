# KubeMarket

KubeMarket is a full-stack marketplace target for Kubernetes security testing and STRIDE threat modeling.

## Stack

- Frontend: React, Vite, Tailwind CSS, nginx
- Backend: Node.js, Express, JWT, PostgreSQL
- Deployment: Docker Compose and Kubernetes manifests

## Local Run

```bash
docker compose up --build
```

Open `http://localhost:8080`.

Seeded accounts use password `Password123!`.

- Admin: `admin@kubemarket.local`
- Customers: `customer1@kubemarket.local` through `customer20@kubemarket.local`

## Kubernetes Deploy

```bash
kubectl apply -f k8s/
```

The manifests create namespace `kubemarket`, frontend/backend services, PostgreSQL with PVC, ConfigMap, and Secret. Replace the placeholder JWT and database secrets before using this outside a lab.

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
