# How Hangout Hub is put together

This is a note for whoever works on the code next (probably me in six months). It explains how the parts fit and why some things are done the way they are.

## The two apps

There are two separate projects in this repo and they only talk over HTTP and a websocket.

- `hangout-hub-backend` is a NestJS app. It serves a REST API and a Socket.IO server on the same port.
- `hangout-hub-client` is an Angular app. It's a plain single page app, built to static files and served from Vercel.

The client finds the backend through `apiBaseUrl` in `src/environments/environment.ts` (local) and `environment.prod.ts` (production build).

## Backend modules

Each folder under `hangout-hub-backend/src` is one Nest module.

- `auth` handles register, login, guest sessions and the JWT guards. Passwords are hashed with bcrypt. A login returns a token that's valid for 7 days, and the client sends it as `Authorization: Bearer <token>`.
- `users` covers the account table, profile updates and profile pictures.
- `posts` holds posts, likes/dislikes and comments.
- `chat` is the Socket.IO gateway, private messages and who is online.
- `seed` creates the owner account and the demo content on first start.

### Guests

"Continue as guest" doesn't create an account. The server signs a token with `guest: true` and user id 0. `JwtAuthGuard` marks the request as a guest, and `MembersOnlyGuard` sits on every write route and turns guests away with a 403. The socket gateway lets guests connect so they see who is online, but it doesn't count them as online and won't relay their messages.

### Database

Everything lives in PostgreSQL, through TypeORM. Tables:

| Table            | What's in it                                                   |
| ---------------- | -------------------------------------------------------------- |
| `accounts`       | users, hashed passwords, profile fields, the picture as bytes  |
| `posts`          | post text, author, like/dislike/comment counters               |
| `post_reactions` | one row per user per post, `like` or `dislike`                 |
| `comments`       | comments on posts                                              |
| `messages`       | private messages, with a `read` flag                           |

The table is called `accounts` and not `users` because the old Spring version of this app left a `users` table in the same database. Using a new name meant the new app could not break the old data.

The like and dislike counts are stored on the post as well as in `post_reactions`. That looks like duplication, but it lets the trending query sort by `likeCount` without a join. The counters are recalculated inside the same transaction every time someone votes, so they can't drift.

Every message has a `conversationId` like `3_7` (the smaller user id first). Both people in a chat get the same id, so loading a conversation is a single indexed query.

### Realtime

The client opens one Socket.IO connection after login and passes the JWT in the handshake (`auth: { token }`). The gateway checks the token and puts the socket in a room called `user:<id>`. Every tab the same person has open joins the same room, so sending to a user means sending to that room.

Events the server sends:

- `presence`: who is online and when others were last seen
- `message`: a new private message
- `typing`: someone is typing to you
- `trending-posts`: the top 8 posts changed
- `post-count`: your number of posts changed

Events the client sends:

- `send-message` with `{ receiverId, content }`. The reply (ack) is the saved message, or `{ error }`.
- `typing` with `{ receiverId, typing }`

Who is online is kept in memory on the server. It counts open sockets per user, so closing one of two tabs doesn't make you look offline. This only works while there is a single backend instance. If the app ever runs on more than one server, presence and the rooms need to move to Redis (the Socket.IO Redis adapter).

The owner account is always reported as online, so new users always have someone to talk to.

### Profile pictures

The browser crops and shrinks the picture to a 400x400 JPEG before uploading (`shared/resize-image.ts` in the client). The server only checks that it really is a JPEG (by the first bytes, not the file name) and that it's under 1 MB, then stores the bytes in the `accounts` table.

It used to be resized on the server with `sharp`, but `sharp` is a native module and it broke on hosts with a different CPU. Doing it in the browser removed the problem and makes uploads smaller as well.

`GET /users/:id/avatar` is public because `<img>` tags can't send the auth header. When someone has no picture it returns a grey placeholder SVG instead of a 404, so the client never has to handle a missing image.

### Seed data

`seed/seed-data.ts` holds the owner account, four demo accounts, some posts, comments, likes and a short chat between each demo user and the owner. The seed runs on every start, but it only creates things once (it checks whether the first demo user exists).

A few things to know:

- Demo accounts get a random password that is never stored anywhere, so nobody can log in as them. They are marked `isDemo` and the client shows a "Demo" tag next to their names.
- The owner password comes from `OWNER_PASSWORD`. If it's set, the owner's password is updated to match on every start.
- Seeding takes a Postgres transaction lock first (`pg_advisory_xact_lock`), because a host can start several copies of the app at the same time and they would otherwise all try to insert the same rows. It has to be a transaction lock: Neon's connection pooler shares connections between clients, and a session lock taken through it never gets released.
- Registering with the owner email is blocked, so nobody can grab that account before the seed runs.

## Client

Angular 19 with standalone components. UI pieces come from ng-zorro-antd (Ant Design): messages, notifications, badges, the edit modal, delete confirmations, pagination, the date range picker and inputs. Icons are mostly Angular Material icons.

Things worth knowing:

- `service/auth.service.ts` keeps the token and the current user in `sessionStorage`. Every tab has its own session, which is handy for testing chat between two users in one browser.
- `service/auth.interceptor.ts` adds the token to every API call and sends you to the login page on a 401.
- `service/socket.service.ts` wraps Socket.IO. Components call `socket.on('event')` and get an Observable. It works even if they subscribe before the connection is up.
- `service/unread.service.ts` keeps unread counts for the whole app, so the badge in the navbar and the badges in the contact list always agree. It also shows the "new message" notification when the message isn't for the chat you have open.
