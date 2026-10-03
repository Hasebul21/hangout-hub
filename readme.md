# Hangout Hub

A small social app I built to try out NestJS with Angular. You can chat with people one to one in real time, write posts, like and comment on them, and see who's online.

Live: https://hangout-hub.vercel.app

## What it does

- Sign up and log in
- Private chat that updates instantly, with typing status, unread counts and "last seen"
- Search inside a conversation
- Posts with likes, dislikes and comments. You can edit or delete your own.
- A trending list on the home page that updates as people vote
- Feed search by author, by text and by date
- Profile page with a picture

When you sign up, my account is pinned at the top of your contacts, so there's always someone to message. The famous names you see (Elon Musk and so on) are demo accounts with some sample posts and chats. They're tagged "Demo" and nobody can log in as them.

## Tech

- Backend: NestJS 12, TypeORM, PostgreSQL, Socket.IO, JWT
- Frontend: Angular 19, ng-zorro-antd (Ant Design), Socket.IO client
- Hosting: Vercel (client), Render (backend), Neon (database)

```
hangout-hub-backend/   the API and the socket server
hangout-hub-client/    the Angular app
docs/                  notes on the design, the API and deployment
docker-compose.yml     Postgres, plus both apps if you want everything in Docker
render.yaml            Render setup for the backend
```

## Running it locally

You need Node 22 or newer and Docker.

Start Postgres:

```bash
npm run services
```

Then the backend, on http://localhost:8080:

```bash
cd hangout-hub-backend
cp .env.example .env
npm install
npm run start:dev
```

And the client, on http://localhost:4200:

```bash
cd hangout-hub-client
npm install
npm start
```

The first start creates the owner account and the demo content. Locally the owner logs in with `hasebulhassan21@gmail.com` and the default password from `src/seed/seed-data.ts`, unless you set `OWNER_PASSWORD` in `.env`.

If you'd rather not install anything, `npm start` in the root runs the whole thing in Docker.

To try the chat with two people, sign up a second account in another tab. Logins are kept per tab, so both can be open at once.

## Tests

The backend has end to end tests that start the real app against your local Postgres and go through sign up, posts, votes, comments, chat, typing, unread counts and search:

```bash
cd hangout-hub-backend
npm run test:e2e
```

## More detail

- [How it's put together](docs/architecture.md)
- [API and socket events](docs/api.md)
- [Deployment](docs/deployment.md)
