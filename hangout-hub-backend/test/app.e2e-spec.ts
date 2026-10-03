import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const run = Date.now();

describe('Hangout Hub API (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const sockets: Socket[] = [];

  const alice = {
    userName: `Alice ${run}`,
    email: `alice${run}@test.dev`,
    password: 'secret1',
    id: 0,
    token: '',
  };
  const bob = {
    userName: `Bob ${run}`,
    email: `bob${run}@test.dev`,
    password: 'secret2',
    id: 0,
    token: '',
  };

  function http() {
    return request(app.getHttpServer());
  }

  function auth(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  function connect(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = io(baseUrl, {
        auth: { token },
        transports: ['websocket'],
      });
      sockets.push(socket);
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });
  }

  function nextEvent<T>(socket: Socket, name: string): Promise<T> {
    return new Promise((resolve) => socket.once(name, resolve));
  }

  function waitForEvent<T>(
    socket: Socket,
    name: string,
    check: (data: T) => boolean,
  ): Promise<T> {
    return new Promise((resolve) => {
      const handler = (data: T) => {
        if (check(data)) {
          socket.off(name, handler);
          resolve(data);
        }
      };
      socket.on(name, handler);
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0);
    baseUrl = await app.getUrl();
    baseUrl = baseUrl.replace('[::1]', 'localhost');
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.close());

    await new Promise((resolve) => setTimeout(resolve, 500));
    await app.close();
  });

  describe('auth', () => {
    it('registers new users', async () => {
      for (const user of [alice, bob]) {
        const res = await http()
          .post('/auth/register')
          .send({
            userName: user.userName,
            email: user.email,
            password: user.password,
          })
          .expect(201);
        expect(res.body.email).toBe(user.email);
        expect(res.body.password).toBeUndefined();
        user.id = res.body.id;
      }
    });

    it('rejects a duplicate email and bad input', async () => {
      await http()
        .post('/auth/register')
        .send({ userName: 'x', email: alice.email, password: 'secret1' })
        .expect(409);
      await http()
        .post('/auth/register')
        .send({ userName: '', email: 'nope', password: '1' })
        .expect(400);
    });

    it('logs in and returns a token', async () => {
      for (const user of [alice, bob]) {
        const res = await http()
          .post('/auth/login')
          .send({ email: user.email.toUpperCase(), password: user.password })
          .expect(200);
        expect(res.body.accessToken).toBeTruthy();
        user.token = res.body.accessToken;
      }
    });

    it('rejects a wrong password', async () => {
      await http()
        .post('/auth/login')
        .send({ email: alice.email, password: 'wrong' })
        .expect(401);
    });

    it('returns the current user', async () => {
      const res = await http()
        .get('/auth/me')
        .set(auth(alice.token))
        .expect(200);
      expect(res.body.id).toBe(alice.id);
      await http().get('/auth/me').expect(401);
    });
  });

  describe('users', () => {
    it('lists users with the seeded owner and demo accounts', async () => {
      const res = await http().get('/users').set(auth(alice.token)).expect(200);
      const owner = res.body.find((u: any) => u.isOwner);
      expect(owner.userName).toBe('Hasebul Hassan');
      expect(res.body.filter((u: any) => u.isDemo).length).toBe(4);
    });

    it("hides other people's email", async () => {
      const res = await http()
        .get(`/users/${bob.id}`)
        .set(auth(alice.token))
        .expect(200);
      expect(res.body.email).toBeUndefined();
    });

    it('updates the profile and picture', async () => {
      const image = await sharp({
        create: { width: 800, height: 500, channels: 3, background: '#336699' },
      })
        .resize(400, 400)
        .jpeg()
        .toBuffer();

      const res = await http()
        .put('/users/me')
        .set(auth(alice.token))
        .field('professionalTitle', 'Tester')
        .field('bio', 'Writing tests')
        .attach('avatar', image, {
          filename: 'me.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);
      expect(res.body.professionalTitle).toBe('Tester');

      const avatar = await http().get(`/users/${alice.id}/avatar`).expect(200);
      expect(avatar.headers['content-type']).toContain('image/jpeg');
      const meta = await sharp(avatar.body).metadata();
      expect(meta.width).toBe(400);
    });

    it('serves a default picture when there is none', async () => {
      const res = await http().get(`/users/${bob.id}/avatar`).expect(200);
      expect(res.headers['content-type']).toContain('image/svg+xml');
    });
  });

  describe('posts', () => {
    let postId = '';

    it('creates a post and sends the new post count', async () => {
      const socket = await connect(alice.token);
      const countEvent = nextEvent<{ count: number }>(socket, 'post-count');

      const res = await http()
        .post('/posts')
        .set(auth(alice.token))
        .send({ content: `  Hello from the e2e test ${run}  ` })
        .expect(201);
      postId = res.body.id;
      expect(res.body.content).toBe(`Hello from the e2e test ${run}`);
      expect((await countEvent).count).toBe(1);
    });

    it('rejects an empty post', async () => {
      await http()
        .post('/posts')
        .set(auth(alice.token))
        .send({ content: '   ' })
        .expect(400);
    });

    it('filters the feed', async () => {
      const byAuthor = await http()
        .get('/posts')
        .query({ author: alice.userName })
        .set(auth(bob.token))
        .expect(200);
      expect(byAuthor.body.items.map((p: any) => p.id)).toContain(postId);

      const byKeyword = await http()
        .get('/posts')
        .query({ q: `${run}` })
        .set(auth(bob.token))
        .expect(200);
      expect(byKeyword.body.total).toBe(1);

      const future = await http()
        .get('/posts')
        .query({ from: '2999-01-01T00:00:00Z' })
        .set(auth(bob.token))
        .expect(200);
      expect(future.body.total).toBe(0);
    });

    it('toggles likes and dislikes, one vote per user', async () => {
      const like = await http()
        .post(`/posts/${postId}/reaction`)
        .set(auth(bob.token))
        .send({ type: 'like' })
        .expect(200);
      expect(like.body).toMatchObject({
        likeCount: 1,
        dislikeCount: 0,
        myReaction: 'like',
      });

      const dislike = await http()
        .post(`/posts/${postId}/reaction`)
        .set(auth(bob.token))
        .send({ type: 'dislike' })
        .expect(200);
      expect(dislike.body).toMatchObject({
        likeCount: 0,
        dislikeCount: 1,
        myReaction: 'dislike',
      });

      const undo = await http()
        .post(`/posts/${postId}/reaction`)
        .set(auth(bob.token))
        .send({ type: 'dislike' })
        .expect(200);
      expect(undo.body).toMatchObject({
        likeCount: 0,
        dislikeCount: 0,
        myReaction: null,
      });
    });

    it('shows liked posts in trending', async () => {
      await http()
        .post(`/posts/${postId}/reaction`)
        .set(auth(bob.token))
        .send({ type: 'like' })
        .expect(200);
      const res = await http()
        .get('/posts/trending')
        .set(auth(bob.token))
        .expect(200);
      expect(res.body.length).toBeLessThanOrEqual(8);
      expect(res.body.map((p: any) => p.id)).toContain(postId);
    });

    it('only lets the author edit or delete', async () => {
      await http()
        .patch(`/posts/${postId}`)
        .set(auth(bob.token))
        .send({ content: 'hijacked' })
        .expect(403);
      const res = await http()
        .patch(`/posts/${postId}`)
        .set(auth(alice.token))
        .send({ content: 'Edited by the author' })
        .expect(200);
      expect(res.body.content).toBe('Edited by the author');
      await http().delete(`/posts/${postId}`).set(auth(bob.token)).expect(403);
    });

    it('adds and removes comments', async () => {
      const comment = await http()
        .post(`/posts/${postId}/comments`)
        .set(auth(bob.token))
        .send({ content: 'Nice post' })
        .expect(201);

      let post = await http()
        .get(`/posts/${postId}`)
        .set(auth(alice.token))
        .expect(200);
      expect(post.body.commentCount).toBe(1);

      await http()
        .delete(`/posts/${postId}/comments/${comment.body.id}`)
        .set(auth(alice.token))
        .expect(403);
      await http()
        .delete(`/posts/${postId}/comments/${comment.body.id}`)
        .set(auth(bob.token))
        .expect(204);

      post = await http()
        .get(`/posts/${postId}`)
        .set(auth(alice.token))
        .expect(200);
      expect(post.body.commentCount).toBe(0);
    });

    it('deletes the post', async () => {
      await http()
        .delete(`/posts/${postId}`)
        .set(auth(alice.token))
        .expect(204);
      await http().get(`/posts/${postId}`).set(auth(alice.token)).expect(404);
    });
  });

  describe('chat', () => {
    it('refuses a socket without a valid token', async () => {
      const socket = io(baseUrl, {
        auth: { token: 'nope' },
        transports: ['websocket'],
      });
      sockets.push(socket);
      await nextEvent(socket, 'disconnect');
    });

    it('shows who is online, the owner always included', async () => {
      const aliceSocket = await connect(alice.token);
      const presence = waitForEvent<any>(aliceSocket, 'presence', (p) =>
        p.onlineUserIds.includes(bob.id),
      );
      await connect(bob.token);
      const { onlineUserIds } = await presence;

      const users = await http().get('/users').set(auth(alice.token));
      const owner = users.body.find((u: any) => u.isOwner);
      expect(onlineUserIds).toContain(owner.id);
    });

    it('delivers private messages and keeps the history', async () => {
      const aliceSocket = await connect(alice.token);
      const bobSocket = await connect(bob.token);
      const received = nextEvent<any>(bobSocket, 'message');

      const sent = await aliceSocket.emitWithAck('send-message', {
        receiverId: bob.id,
        content: 'Hi Bob',
      });
      expect(sent.content).toBe('Hi Bob');
      expect((await received).content).toBe('Hi Bob');

      const empty = await aliceSocket.emitWithAck('send-message', {
        receiverId: bob.id,
        content: '  ',
      });
      expect(empty.error).toBeTruthy();

      const history = await http()
        .get(`/messages/${alice.id}`)
        .set(auth(bob.token))
        .expect(200);
      expect(history.body.map((m: any) => m.content)).toEqual(['Hi Bob']);
    });

    it('relays typing status', async () => {
      const aliceSocket = await connect(alice.token);
      const bobSocket = await connect(bob.token);
      const typing = nextEvent<any>(bobSocket, 'typing');
      aliceSocket.emit('typing', { receiverId: bob.id, typing: true });
      expect(await typing).toEqual({ userId: alice.id, typing: true });
    });

    it('counts unread messages until they are read', async () => {
      let unread = await http()
        .get('/messages/unread')
        .set(auth(bob.token))
        .expect(200);
      expect(unread.body[alice.id]).toBe(1);

      await http()
        .post(`/messages/${alice.id}/read`)
        .set(auth(bob.token))
        .expect(204);
      unread = await http()
        .get('/messages/unread')
        .set(auth(bob.token))
        .expect(200);
      expect(unread.body[alice.id]).toBeUndefined();
    });

    it('searches inside a conversation', async () => {
      const found = await http()
        .get(`/messages/${alice.id}/search`)
        .query({ q: 'bob' })
        .set(auth(bob.token))
        .expect(200);
      expect(found.body.length).toBe(1);

      const other = await http()
        .get(`/messages/${alice.id}/search`)
        .query({ q: 'something else' })
        .set(auth(bob.token))
        .expect(200);
      expect(other.body.length).toBe(0);
    });
  });
  describe('guests', () => {
    let guestToken = '';

    it('logs in as a guest without creating an account', async () => {
      const before = await http().get('/users').set(auth(alice.token));
      const res = await http().post('/auth/guest').expect(200);
      guestToken = res.body.accessToken;
      expect(res.body.user.isGuest).toBe(true);

      const after = await http().get('/users').set(auth(alice.token));
      expect(after.body.length).toBe(before.body.length);
    });

    it('can read posts and comments', async () => {
      await http().get('/posts').set(auth(guestToken)).expect(200);
      await http().get('/posts/trending').set(auth(guestToken)).expect(200);
      const me = await http().get('/auth/me').set(auth(guestToken)).expect(200);
      expect(me.body.isGuest).toBe(true);
    });

    it('cannot post, react, comment or read messages', async () => {
      const posts = await http().get('/posts').set(auth(guestToken));
      const postId = posts.body.items[0].id;

      await http()
        .post('/posts')
        .set(auth(guestToken))
        .send({ content: 'hi' })
        .expect(403);
      await http()
        .post(`/posts/${postId}/reaction`)
        .set(auth(guestToken))
        .send({ type: 'like' })
        .expect(403);
      await http()
        .post(`/posts/${postId}/comments`)
        .set(auth(guestToken))
        .send({ content: 'hi' })
        .expect(403);
      await http().get('/messages/unread').set(auth(guestToken)).expect(403);
      await http()
        .put('/users/me')
        .set(auth(guestToken))
        .field('bio', 'x')
        .expect(403);
    });

    it('cannot send chat messages', async () => {
      const socket = await connect(guestToken);
      const result = await socket.emitWithAck('send-message', {
        receiverId: alice.id,
        content: 'hi',
      });
      expect(result.error).toBeTruthy();
    });
  });
});
