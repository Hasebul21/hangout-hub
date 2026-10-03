# Hangout Hub

A small social app: chat one to one in real time, share posts, like and comment, and see who is online.

Built with NestJS, Angular and PostgreSQL.

## Features

- Sign up and log in (passwords hashed with bcrypt, JWT for the API and the socket)
- Private chat over Socket.IO with message history
- Online status and "last seen", typing indicator, unread badges and notifications
- Search inside a conversation
- Posts with likes and dislikes (one vote per person), comments, edit and delete
- Trending posts that update live
- Feed search by author, keyword and date range
- Profile page with a picture upload (resized on the server)

## Project layout

```
hangout-hub-backend/   NestJS API and Socket.IO gateway
hangout-hub-client/    Angular app (ng-zorro-antd + Angular Material icons)
docker-compose.yml     Postgres and both apps
```

Everything (accounts, pictures, posts, comments, reactions and messages) is stored in PostgreSQL. Who is online is kept in memory on the server.

## Running locally

You need Node 22+ and Docker.

Start the database:

```bash
npm run services
```

Backend (http://localhost:8080):

```bash
cd hangout-hub-backend
cp .env.example .env
npm install
npm run start:dev
```

Client (http://localhost:4200):

```bash
cd hangout-hub-client
npm install
npm start
```

Or run everything in Docker with `npm start` from the root.

On the first start the backend creates the owner account and a few demo accounts with some posts, comments and chats so the app isn't empty. Demo accounts can't be logged into.

## Tests

The end to end tests boot the whole API against the local services:

```bash
cd hangout-hub-backend
npm run test:e2e
```

## Configuration

Backend environment variables (see `hangout-hub-backend/.env.example`):

| Variable                 | Notes                                          |
| ------------------------ | ---------------------------------------------- |
| `PORT`                   | defaults to 8080                               |
| `ALLOWED_ORIGINS`        | comma separated list of client urls            |
| `DATABASE_URL`           | Postgres connection string                     |
| `DATABASE_SSL`           | `true` for hosted Postgres                     |
| `DB_SYNCHRONIZE`         | create/update tables on start, default `true`  |
| `JWT_SECRET`             | required                                       |
| `OWNER_PASSWORD`         | password for the owner account                 |

The client reads the API url from `src/environments/environment.ts` (and `environment.prod.ts` for production builds).

## Deployment

- Backend: Render, using `render.yaml` (Docker, free plan). Set `DATABASE_URL` and `OWNER_PASSWORD` when creating it.
- Client: Vercel, using the root `vercel.json`.
