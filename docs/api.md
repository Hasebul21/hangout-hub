# API

Base url in production: `https://hangout-hub-api.onrender.com`
Locally: `http://localhost:8080`

Everything except register, login, `/health` and the avatar images needs the header:

```
Authorization: Bearer <accessToken>
```

Errors come back in Nest's usual shape:

```json
{ "message": "Post not found", "error": "Not Found", "statusCode": 404 }
```

For validation errors `message` is an array of strings.

## Auth

### POST /auth/register

```json
{ "userName": "Sara", "email": "sara@example.com", "password": "secret1" }
```

Password needs at least 6 characters. Returns the new user (never the password). `409` if the email is taken.

### POST /auth/login

```json
{ "email": "sara@example.com", "password": "secret1" }
```

Returns `{ "accessToken": "...", "user": { ... } }`. `401` for a wrong email or password (same message for both, on purpose).

### POST /auth/guest

No body. Returns a token for a guest session (valid for a day) and a guest user with `id: 0` and `isGuest: true`. Nothing is saved in the database.

Guests can read everything a member can (posts, comments, trending, users), but every write returns `403`: posting, voting, commenting, profile changes and anything under `/messages`. On the socket they get `presence` and `trending-posts`, and `send-message` replies with an error.

### GET /auth/me

The logged in user.

## Users

### GET /users

All users, sorted by name. Other people's `email` is left out.

### GET /users/:id

One user, again without the email unless it's you.

### PUT /users/me

`multipart/form-data`. Any of these text fields: `professionalTitle`, `location`, `bio` (max 300), `portfolio`, `skills` (max 100), `hobbies` (max 100), `instagram`. Send an empty value to clear a field.

Optional file field `avatar`: a JPEG under 1 MB. The web client resizes pictures to 400x400 before sending.

### GET /users/:id/avatar

The profile picture (`image/jpeg`), or a placeholder SVG if there isn't one. No auth needed.

## Posts

A post looks like this:

```json
{
  "id": "7c0c...",
  "authorId": 1,
  "authorName": "Hasebul Hassan",
  "content": "...",
  "likeCount": 4,
  "dislikeCount": 0,
  "commentCount": 2,
  "myReaction": "like",
  "createdAt": "2026-10-03T10:00:00.000Z",
  "updatedAt": "2026-10-03T10:00:00.000Z"
}
```

`myReaction` is your own vote: `like`, `dislike` or `null`. If `updatedAt` differs from `createdAt`, the text was edited.

### GET /posts

Query params, all optional:

| Param    | Meaning                                         |
| -------- | ----------------------------------------------- |
| `page`   | starts at 1                                     |
| `size`   | 1 to 50, default 8                              |
| `author` | start of the first or last name, e.g. `has`     |
| `q`      | text inside the post                            |
| `from`   | ISO date, posts created at or after             |
| `to`     | ISO date, posts created at or before            |

Returns `{ items, total, page, size }`, newest first.

### GET /posts/trending

Up to 8 posts with at least one like, most liked first.

### GET /posts/count/:userId

`{ "count": 5 }`

### GET /posts/:id

### POST /posts

`{ "content": "..." }`, 1 to 500 characters after trimming.

### PATCH /posts/:id

`{ "content": "..." }`. Only the author can do this (`403` otherwise).

### DELETE /posts/:id

Author only. Comments and votes go with it.

### POST /posts/:id/reaction

`{ "type": "like" }` or `{ "type": "dislike" }`.

Clicking the same one again removes your vote, and switching from like to dislike moves it. Returns the updated post.

## Comments

### GET /posts/:postId/comments

Oldest first.

### POST /posts/:postId/comments

`{ "content": "..." }`, max 500 characters.

### DELETE /posts/:postId/comments/:commentId

Only the person who wrote the comment.

## Messages

### GET /messages/:userId

The last 100 messages between you and that user, oldest first.

### GET /messages/:userId/search?q=text

Messages in that conversation containing the text, newest first, max 50.

### GET /messages/unread

How many unread messages you have from each person: `{ "4": 2, "7": 1 }` (sender id to count).

### POST /messages/:userId/read

Marks everything that user sent you as read.

## Socket.IO

Connect to the same base url:

```js
io(apiBaseUrl, { auth: { token: accessToken } })
```

A connection with a missing or bad token is closed right away.

Send a message (uses an acknowledgement):

```js
const result = await socket.emitWithAck('send-message', { receiverId: 4, content: 'hi' });
// result is the saved message, or { error: '...' }
```

The other person gets a `message` event, and so do your other open tabs (not the one that sent it).

Typing:

```js
socket.emit('typing', { receiverId: 4, typing: true });
// they receive: { userId: <you>, typing: true }
```

The server also pushes:

| Event            | Data                                                     |
| ---------------- | -------------------------------------------------------- |
| `presence`       | `{ onlineUserIds: number[], lastSeen: { [id]: isoDate } }` |
| `trending-posts` | same list as `GET /posts/trending`                       |
| `post-count`     | `{ count }`, only to the author                          |

## Health

`GET /health` returns `{ "status": "ok" }`. Render uses it to check the service is up.
