Backend (ip-geolocate-api)

# Tech Stack

- Node.js + Express

- PostgreSQL (hosted on Render)

- dotenv → environment config

- cors → cross-origin support

- body-parser → request body parsing

- bcrypt → password hashing

- jsonwebtoken → JWT authentication

## Installed Dependencies

npm install express body-parser cors dotenv bcrypt jsonwebtoken pg

npm install --save-dev nodemon

## .env Example

PORT=8000
JWT_SECRET=supersecretkey

## Postgres Database (external URL from Render)

DB_HOST=dpg-d3fnieili9vc73e7pjq0-a.singapore-postgres.render.com

DB_USER=geolocate_db_user

DB_PASSWORD=Y2wEk6OiOIhMP8QV7ePLGMzEaXTuZjQE

DB_NAME=geolocate_db

DB_PORT=5432

DB_SSL=true

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create `.env` (see example above) and ensure DB credentials are correct.

3. Seed a test user (optional):

```bash
npm run seed
```

4. Start in development:

```bash
npm run dev
```

Notes:

- The project uses `express.json()` for request parsing.
- If you run on Node 18+, the global `fetch` is available; `node-fetch` is kept for compatibility.
