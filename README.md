# Hxssan Studios — Standalone Backend Server

Standalone Node.js + Express + PostgreSQL REST API server powering the Hxssan Studios website and Admin Console.

---

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL 18
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs password hashing
- **Language**: TypeScript

---

## Environment Variables (`.env`)

Create or update `.env` in the project root:

```env
PORT=5000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hxssan_studio
JWT_SECRET=hxssan_studio_super_secret_jwt_key_2026
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@hxssanstudios.com
ADMIN_PASSWORD=admin123
```

---

## How to Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode (with hot reloading)
```bash
npm run dev
```

### 3. Build & Run for Production
```bash
npm run build
npm start
```

---

## API Endpoints

- **Health Check**: `GET /api/health`
- **Authentication**:
  - `POST /api/auth/login` (body: `{ email, password }`)
  - `GET /api/auth/me` (requires Bearer token)
- **Inquiries / Leads**:
  - `POST /api/inquiries` (public form submission)
  - `GET /api/inquiries` (admin list with filters: `status`, `search`)
  - `GET /api/inquiries/stats` (admin lead statistics)
  - `PATCH /api/inquiries/:id` (update status and notes)
  - `DELETE /api/inquiries/:id` (delete inquiry)
- **Projects**: `GET`, `POST`, `PUT`, `DELETE /api/projects`
- **Reels**: `GET`, `POST`, `PUT`, `DELETE /api/reels`
- **Services**: `GET`, `POST`, `PUT`, `DELETE /api/services`
