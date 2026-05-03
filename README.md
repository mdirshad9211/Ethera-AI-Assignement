# Project Hub

A full-stack **project and task management** app with **JWT authentication**, **MongoDB** persistence, and **per-project role-based access** (Admin vs Member). Admins manage the project, team, and assignments; members collaborate on tasks within the projects they belong to.

---

## Features

- **Authentication** — Register, sign in, JWT sessions, protected API routes.
- **Projects** — Create projects; each creator becomes the first **Admin**.
- **Team** — Admins invite users by **email** (account must exist) and set roles **ADMIN** or **MEMBER**.
- **Tasks** — Create tasks with title, description, status, due date, and assignee (admins assign to any member; members create unassigned or self-assigned tasks per API rules).
- **Dashboard** — Cross-project summary: task counts by status, overdue tasks, and your open assignments.
- **Production-minded API** — Helmet, compression, CORS allowlist in production, rate limits, health check, graceful shutdown, validated environment variables.

---

## Tech stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| Backend  | Node.js 20+, Express 4, Mongoose 8 (MongoDB)    |
| Auth     | JWT + bcrypt password hashing                   |
| Config   | dotenv + Zod env validation                     |

---

## Repository layout

```
admin/
├── backend/          # REST API (Express + Mongoose)
│   ├── .env.example
│   └── src/
├── frontend/         # SPA (Vite + React)
│   ├── .env.example
│   └── src/
└── README.md         # This file
```

---

## Prerequisites

- **Node.js** 20 or newer  
- **MongoDB** — local instance or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)  
- npm (ships with Node)

---

## Quick start (local development)

### 1. MongoDB

Have a reachable `MONGODB_URI` (for Atlas, use a user with read/write on your database and include the database name in the path, e.g. `...mongodb.net/projecthub?...`).

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit **`backend/.env`**:

| Variable | Purpose |
| -------- | ------- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | At least **32 characters**; use a random string in production |
| `CORS_ORIGINS` | Comma-separated browser origins (required when `NODE_ENV=production`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Optional: auto-create that user on startup **if the email is not yet registered** |
| `ADMIN_NAME` | Optional display name for the bootstrapped user (default `Administrator`) |

Start the API (default port **4000**):

```bash
npm install
npm run dev
```

Confirm: open `http://localhost:4000/health` — `database` should be `connected`.

**Sign-in identifier:** the app uses **email**, not a separate username. Use the same value as `ADMIN_EMAIL` on the login screen after the bootstrap user exists.

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # optional; defaults work with proxy
npm install
npm run dev
```

Open **`http://localhost:5173`**. With an empty `VITE_API_URL`, the Vite dev server **proxies** `/api` and `/health` to `http://127.0.0.1:4000` (see `frontend/vite.config.js`).

For a **production build** of the SPA, set `VITE_API_URL` to your public API URL (no trailing slash), then `npm run build` and host the `dist/` folder behind HTTPS with your API on another origin listed in `CORS_ORIGINS`.

---

## Admin bootstrap (`ADMIN_*` variables)

When **both** `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set:

1. After MongoDB connects, the server checks whether a user with that email exists.
2. If **not**, it creates one with the given password (bcrypt) and `ADMIN_NAME` (or `Administrator`).
3. If the user **already exists**, nothing is changed (passwords are **not** overwritten).

Use strong passwords in production. After first login, consider removing or clearing `ADMIN_PASSWORD` from the environment so it is not stored on disk longer than needed.

---

## API overview

Base URL: `/api` (plus `/health` at the root).

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Returns JWT |
| `GET` | `/api/auth/me` | Yes | Current user |
| `GET` | `/api/dashboard` | Yes | Summary + overdue + my open tasks |
| `GET` / `POST` | `/api/projects` | Yes | List / create project |
| `GET` / `PATCH` / `DELETE` | `/api/projects/:projectId` | Yes | Member read; **Admin** update/delete |
| `GET` / `POST` | `/api/projects/:projectId/members` | Yes | **Admin** adds member by email |
| `PATCH` / `DELETE` | `/api/projects/:projectId/members/:userId` | Yes | **Admin** role / remove |
| `GET` / `POST` | `/api/projects/:projectId/tasks` | Yes | List / create tasks |
| `PATCH` / `DELETE` | `/api/projects/:projectId/tasks/:taskId` | Yes | RBAC on task edit/delete |

Send `Authorization: Bearer <token>` for protected routes.

---

## Role behavior (per project)

- **ADMIN** — Edit/delete project; manage members and roles; full task control including assignees.
- **MEMBER** — View project and members; create tasks; edit/delete tasks they **created** or are **assigned** to; cannot change assignee to another person (admins can).

---

## Production checklist

- Set `NODE_ENV=production` and a strong `JWT_SECRET`.
- Set **`CORS_ORIGINS`** to your real frontend origin(s); the server refuses to start in production without it.
- Use Atlas or a managed MongoDB with TLS; restrict network access and users.
- Put the API behind HTTPS; set `TRUST_PROXY=true` when behind a reverse proxy so rate limits and client IPs are correct.
- Do not commit `.env` files; rotate any credentials that were ever committed or shared.

---

## Scripts

| Directory | Command | Description |
| --------- | ------- | ----------- |
| `backend` | `npm run dev` | API with `--watch` |
| `backend` | `npm start` | API without watch |
| `frontend` | `npm run dev` | Vite dev server |
| `frontend` | `npm run build` | Production bundle |

---

## License

This project is provided as-is for your own use; add a license file if you redistribute it.
