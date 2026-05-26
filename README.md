## ShopSmart (E-Commerce Frontend)

Premium static HTML/CSS/JS e-commerce frontend with:
- Product grid (API fallback + optional Firestore catalog)
- Wishlist + filters
- Recently viewed
- Cart + checkout
- Firebase Auth integration
- Optional Firestore orders capture

### Run
Open `index.html` in a local static server (recommended) so modules + service worker work properly.

### Firebase config (keep out of git)

This repo does **not** commit real Firebase keys/config.

Option A (recommended): local JSON file
1. Copy `scripts/firebase-config.local.json.example` → `scripts/firebase-config.local.json`
2. Fill in your Firebase values

Option B: global variable
1. Copy `scripts/firebase-config.local.example.js` → `scripts/firebase-config.local.js`
2. Set `globalThis.__SHOPSMART_FIREBASE_CONFIG__ = {...}`

### Firestore (products + orders)

Collections used by the frontend:
- `products` (read): product catalog
- `orders` (write): orders placed from checkout

Suggested `products` doc fields:
- `title` (string), `price` (number), `image` (string), `category` (string), `description` (string)
- optional: `ratingRate` (number), `ratingCount` (number)

Security rules:
- See `firestore.rules.example` for an admin/products/reviews/orders ruleset.
  - It assumes a custom auth claim: `request.auth.token.admin == true` for admins.

### Payments

Payment gateways are not included. Checkout is Cash on Delivery only (demo).



### Admin dashboard

Admin page: `admin.html`

Local admin allowlist (gitignored):
1. Copy `scripts/admin-config.local.json.example` → `scripts/admin-config.local.json`
2. Add your email(s) to `adminEmails`

In production, enforce admin access using Firebase custom claims + Firestore security rules.

Setting admin claim (recommended):
1. Configure Firebase Admin SDK on the server (`server/.env`)
2. Look up a user by email:
   - POST `/api/admin/lookup-user` with header `x-admin-token: <ADMIN_API_TOKEN>` and JSON `{ "email": "you@example.com" }`
3. Set claim:
   - POST `/api/admin/set-admin-claim` with header `x-admin-token: <ADMIN_API_TOKEN>` and JSON `{ "uid": "<uid>", "admin": true }`
4. User re-logs in (or refreshes) so the token picks up the new claim.

Admin tools UI (no Postman needed):
- Page: `admin-tools.html`
- Requires:
  - You are already an admin (claim-based), and
  - `server/` is running, and
  - You enter `ADMIN_API_TOKEN` in the Tools page when making requests.

### Server

The folder `server/` contains a minimal Express backend for admin claim helpers.

Setup:
1. Copy `server/.env.example` → `server/.env` and set at least `ADMIN_API_TOKEN`
2. (Optional) Configure Firebase Admin SDK to manage custom claims (see variables in `server/.env.example`)
3. Install deps: `npm install` inside `server/`
4. Run: `npm run dev` inside `server/`
