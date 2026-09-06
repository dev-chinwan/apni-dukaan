# FreshCart - Grocery Delivery App

FreshCart is a full-stack grocery delivery web app with:
- Mobile + name login (no password)
- Admin and customer experiences
- Real-time order updates via Socket.IO
- JSON file storage (no external database required)
- Admin product CRUD + bulk JSON catalog update

## Quick Start (Local)

1. Install dependencies

```bash
npm install
```

2. Create .env.local in the project root

```env
JWT_SECRET=your_long_random_secret_here
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
CLOUDINARY_SYNC_ENABLED=false
CLOUDINARY_SYNC_REQUIRED=false
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=freshcart-data
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

3. Run development server

```bash
npm run dev
```

Open http://localhost:3000

## Current Login Flow

- Customer login: name + mobile number
- Admin login: same login page, switch to admin mode
- Session persistence: login stays active for 30 days
- Route guard: unauthenticated users are redirected to login

## Admin Features

- Dashboard with live order alerts and quick process links
- Order status management with real-time customer updates
- Customer list and spending summary
- Groceries management:
- Create product (UUID auto product ID)
- Edit product fields
- Delete product
- Bulk replace full catalog JSON

## Product Management

Use Admin -> Groceries page:
- Manage Products tab for edit/delete
- Add Product tab for create
- Bulk JSON tab to load, edit, and save complete catalog JSON

Product JSON fields:

```json
{
  "id": "uuid",
  "name": "Alphonso Mangoes",
  "emoji": "🥭",
  "price": 249,
  "unit": "dozen",
  "category": "Fruits",
  "badge": "Seasonal",
  "inStock": true,
  "sortOrder": 1
}
```

## Data Storage

All app data is stored in data folder:
- data/users.json
- data/orders.json
- data/products.json
- data/settings.json

Optional Cloudinary JSON sync:
- Set CLOUDINARY_SYNC_ENABLED=true and provide Cloudinary credentials.
- Set CLOUDINARY_SYNC_REQUIRED=true if you want writes to fail whenever Cloudinary upload fails (strict cloud-first mode).
- The app hydrates JSON from Cloudinary on server startup and still keeps local JSON files as backup cache.
- Every write to users/orders/products/settings updates local JSON and uploads updated JSON to Cloudinary raw assets.
- If Cloudinary is unavailable, app continues with local JSON files.

Admin Cloudinary management:
- Open Admin Dashboard and use the Cloudinary Backup card.
- Push Local to Cloud uploads users/orders/products/settings JSON immediately.
- Pull Cloud to Local downloads cloud JSON and restores local backup files + UI data source.
- Use Admin -> Cloud Data for full bundle pull/edit/bulk-save of users, orders, products, and settings JSON.

Backup strategy:
- Copy the full data folder regularly

## Free Deployment Options

This project uses a custom Node server with Socket.IO in server.js, so do not deploy this build to Vercel serverless.

Recommended free options:
- Railway
- Render

### Fastest Path: Render Blueprint + Docker

This repository now includes:
- render.yaml
- Dockerfile

Deploy steps:
1. Push to GitHub.
2. In Render, choose New + and select Blueprint.
3. Pick this repository and apply the blueprint.
4. Set secret env vars in Render:
- JWT_SECRET
- NEXT_PUBLIC_APP_URL (your public Render URL)
5. Deploy.

Why this path is reliable:
- It uses Node 20 in Docker explicitly.
- It runs your custom Node server (server.js) and Socket.IO exactly the same as local.
- It avoids host runtime drift from auto-detected buildpacks.

### Option 1: Deploy on Railway (recommended)

1. Push this project to a GitHub repository.
2. Sign in to Railway and create New Project.
3. Choose Deploy from GitHub repo.
4. Select this repository.
5. Add environment variables:
- JWT_SECRET = your production secret
- NEXT_PUBLIC_APP_URL = your Railway public URL
- NODE_ENV = production
- PORT = 3000

Socket.IO on Railway notes:
- Set NEXT_PUBLIC_APP_URL exactly to your deployed HTTPS URL (no trailing slash).
- Railway also provides RAILWAY_PUBLIC_DOMAIN / RAILWAY_STATIC_URL; server uses these automatically for Socket.IO origin allowlist.
- Keep start command as npm start (this runs custom server.js required for Socket.IO).
6. Build command:

```bash
npm install && npm run build
```

7. Start command:

```bash
npm start
```

8. Deploy and open the generated Railway URL.

Important:
- Because storage is JSON files on disk, free containers may reset filesystem on redeploy/restart.
- For production-grade persistence, move data to managed DB or object storage.

### Option 2: Deploy on Render (free tier)

1. Push project to GitHub.
2. Create a new Web Service in Render.
3. Connect your repository.
4. Configure:
- Build Command: npm install && npm run build
- Start Command: npm start
5. Add environment variables:
- JWT_SECRET
- NEXT_PUBLIC_APP_URL (your Render URL)
- NODE_ENV=production
- PORT=3000
6. Deploy service.

Notes for free tier:
- Service may sleep when inactive.
- First request after sleep can be slow.

## URLs

- /login
- /login?admin=1
- /customer
- /customer/cart
- /customer/orders
- /customer/orders/:orderId
- /admin
- /admin/orders
- /admin/customers
- /admin/groceries
- /admin/settings

## Scripts

```bash
npm run dev
npm run build
npm start
```

## High-Level Structure

```text
server.js                custom Node server with Socket.IO
src/app                  Next.js App Router pages and APIs
src/lib/db.js            JSON file storage helpers
src/lib/catalog.js       products/settings data layer
src/middleware.js        auth-based route protection
data                     JSON data files
```
