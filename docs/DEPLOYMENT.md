# Deployment Guide — Rental Management Platform

Stack: **PostgreSQL on Supabase** · **Backend on Render** · **Frontend on Vercel**

---

## Part 1 — Set Up the Database on Supabase

### 1.1 Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose your organisation, give the project a name (e.g. `rental-mgmt`), pick a region close to your users, set a strong database password → **Create project**
3. Wait ~2 minutes for the project to provision

### 1.2 Run the schema

1. In your project dashboard click **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `database/schema/supabase_schema.sql` from this repo
4. Paste the entire contents into the editor
5. Click **Run** — all tables, indexes, triggers and seed data will be created in one shot

> **Tip:** The file is idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), so it is safe to run again.

### 1.3 Get your connection string

1. Go to **Project Settings → Database**
2. Under **Connection string** pick the **URI** tab
3. Copy the string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. Append `?sslmode=require` to the end:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
   ```
5. Keep this string — you will paste it as `DATABASE_URL` in the backend env vars

### 1.4 Disable Row Level Security (RLS) for the app tables

Supabase enables RLS by default. Because the backend connects with the service-role credentials via `DATABASE_URL`, you can either:

- **Option A (simplest):** In **Authentication → Policies**, toggle RLS **off** for every table — the backend enforces its own multi-tenant `shop_id` scoping.
- **Option B (recommended for production):** Leave RLS on and add a single policy `USING (true)` for the `postgres` role on each table, or use the Supabase service key connection string which bypasses RLS automatically.

---

## Part 2 — Deploy the Backend on Render

### 2.1 Push your code to GitHub/GitLab

Make sure the repo is pushed. The `backend/` folder is the service root.

### 2.2 Create a new Web Service on Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Configure:

| Field | Value |
|---|---|
| **Name** | `rental-management-api` |
| **Root Directory** | `backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or Starter for always-on) |

### 2.3 Add environment variables

In the Render dashboard → **Environment** tab, add:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=<generate a strong 64-char random string>
JWT_EXPIRES_IN=1d
CLIENT_URL=https://your-frontend.vercel.app
```

> **Generate a JWT secret:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 2.4 Deploy

Click **Create Web Service** — Render will install deps and start the server. The health endpoint at `GET /` should return `{ success: true }`.

Note your Render URL, e.g. `https://rental-management-api.onrender.com` — you'll need it for the frontend.

---

## Part 3 — Deploy the Frontend on Vercel

### 3.1 Create a new project on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Configure:

| Field | Value |
|---|---|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 3.2 Add environment variables

In **Settings → Environment Variables**:

```
VITE_API_BASE_URL=https://rental-management-api.onrender.com/api/v1
```

### 3.3 Deploy

Click **Deploy**. Vercel will build and publish the site. Your live URL will be something like `https://rental-management-xyz.vercel.app`.

### 3.4 Update backend CORS

Go back to Render and update `CLIENT_URL` to your actual Vercel URL:
```
CLIENT_URL=https://rental-management-xyz.vercel.app
```
Render will auto-redeploy.

---

## Part 4 — Alternative: Deploy Backend on Vercel

If you prefer Vercel for both frontend and backend, the `backend/vercel.json` is already configured.

1. Create a **separate Vercel project** pointing to the `backend/` root directory
2. Add the same environment variables as in Part 2 (Step 2.3)
3. Set **Framework** to `Other` and **Root Directory** to `backend`

> **Note:** Vercel runs Node as serverless functions with a 10-second timeout on the free plan. For long-running DB transactions, **Render is the better choice** for the backend.

---

## Part 5 — Local Development

```bash
# 1. Copy env file
cp .env.example .env
# Edit .env with your local Postgres credentials or Supabase DATABASE_URL

# 2. Install backend deps (also removes mysql2 if still in node_modules)
cd backend && npm install

# 3. Install frontend deps
cd ../frontend && npm install

# 4. Start backend (in one terminal)
cd backend && npm run dev

# 5. Start frontend (in another terminal)
cd frontend && npm run dev
```

---

## Summary of all changes made

| Area | What changed |
|---|---|
| `database/migrations/*.sql` (all 25 files) | Converted from MySQL to PostgreSQL: `BIGSERIAL` for auto-increment, `SMALLINT` for booleans, `TIMESTAMPTZ` for timestamps, `JSONB` for JSON, `VARCHAR + CHECK` for enums, `PARTIAL INDEXES` instead of generated columns |
| `database/schema/supabase_schema.sql` | **New** — single consolidated file to bootstrap the entire DB in Supabase SQL Editor, including `updated_at` triggers |
| `backend/src/repositories/booking.repository.js` | `DATE_FORMAT` → `TO_CHAR`, `DATE(col)` → `col::DATE`, `SUM(condition)` → `COUNT(*) FILTER (WHERE ...)` |
| `backend/src/repositories/availability.repository.js` | `DATE_FORMAT` → `TO_CHAR` |
| `backend/src/repositories/return.repository.js` | `DATE_FORMAT` → `TO_CHAR`, `DATE(col)` → `col::DATE`, `CAST(id AS CHAR)` → `CAST(id AS TEXT)` |
| `backend/src/repositories/customer.repository.js` | `CURRENT_DATE()` → `CURRENT_DATE` (3 places) |
| `backend/src/repositories/payment.repository.js` | `SUM(status = 'X')` → `COUNT(*) FILTER (WHERE status = 'X')` |
| `backend/src/repositories/inventory.repository.js` | `SUM(i.status = 'X')` → `COUNT(*) FILTER (WHERE i.status = 'X')` |
| `backend/src/repositories/product.repository.js` | `information_schema.statistics` → `pg_indexes`, `MATCH...AGAINST` → `search_vector @@ plainto_tsquery`, `SUBSTRING_INDEX` → `SPLIT_PART`, `REGEXP` → `~` |
| `backend/src/repositories/role.repository.js` | `ON DUPLICATE KEY UPDATE` → `ON CONFLICT DO UPDATE` |
| `backend/package.json` | Removed `mysql2` dependency |
| `.env.example` | Updated with correct PostgreSQL port (5432), `DATABASE_URL` option, `DB_SSL` flags |
| `backend/vercel.json` | **New** — Vercel config for backend deployment |
| `docs/DEPLOYMENT.md` | **New** — this file |
