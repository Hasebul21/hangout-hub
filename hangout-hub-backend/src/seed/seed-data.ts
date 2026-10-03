// Content created on first start so the app has something to show.
// Demo accounts are clearly marked in the UI and can't be logged into.

export const OWNER = {
  key: 'owner',
  userName: 'Hasebul Hassan',
  email: 'hasebulhassan21@gmail.com',
  // only used locally, set OWNER_PASSWORD in production
  defaultPassword: 'hasebul123',
  professionalTitle: 'Software Engineer',
  portfolio: 'https://github.com/Hasebul21',
  skills: 'Java, Spring Boot, Angular, NestJS',
  bio: 'I built Hangout Hub. If you just signed up, say hi, I read every message.',
};

const DEMO_BIO =
  'Demo account to show how Hangout Hub works. This is not the real person.';

export const DEMO_USERS = [
  {
    key: 'elon',
    userName: 'Elon Musk',
    email: 'elon.demo@hangouthub.app',
    message:
      'Hey Hasebul, the chat is fast. How many people can it handle at once?',
    reply:
      'Thanks! One small server handles it fine for now, it can grow later if it needs to.',
  },
  {
    key: 'mark',
    userName: 'Mark Zuckerberg',
    email: 'mark.demo@hangouthub.app',
    message:
      'Hi! I liked your post about moving to NestJS. Was the rewrite worth it?',
    reply: 'Definitely. One language on both sides made every change quicker.',
  },
  {
    key: 'steve',
    userName: 'Steve Jobs',
    email: 'steve.demo@hangouthub.app',
    message:
      'Hello from the demo account. The layout is clean, keep it that way.',
    reply: null,
  },
  {
    key: 'donald',
    userName: 'Donald Trump',
    email: 'donald.demo@hangouthub.app',
    message:
      'Hi Hasebul, found your post through the feed search. Works great.',
    reply: null,
  },
].map((user) => ({ ...user, bio: DEMO_BIO }));

// hoursAgo keeps the feed in a natural order
export const SEED_POSTS = [
  {
    key: 'nest',
    author: 'owner',
    hoursAgo: 140,
    content:
      'Moved the Hangout Hub backend from Spring Boot to NestJS. Having TypeScript on the server and in the Angular client means one language for the whole project, and small changes go a lot faster.',
  },
  {
    key: 'search',
    author: 'owner',
    hoursAgo: 110,
    content:
      'You do not always need a search engine. The feed search here is plain Postgres text matching, and for a few thousand posts it answers instantly.',
  },
  {
    key: 'reuse',
    author: 'elon',
    hoursAgo: 96,
    content:
      'Reusable rockets cut the cost of reaching orbit by a huge margin. Same idea works in software: build a piece once, then use it everywhere.',
  },
  {
    key: 'tests',
    author: 'owner',
    hoursAgo: 80,
    content:
      'A habit that saved me a lot of time: write a test for the bug before fixing it. If the test does not fail first, you have not found the bug yet.',
  },
  {
    key: 'watch',
    author: 'mark',
    hoursAgo: 64,
    content:
      'The best way to learn how people use your product is to sit next to them while they use it. Numbers tell you what happened, not why.',
  },
  {
    key: 'less',
    author: 'steve',
    hoursAgo: 48,
    content:
      'Deciding what not to build matters as much as deciding what to build. Every extra button is one more thing people have to think about.',
  },
  {
    key: 'sockets',
    author: 'owner',
    hoursAgo: 30,
    content:
      'Websockets are easy to get working and hard to get right. Reconnects, the same user in two tabs, someone closing the laptop halfway through a message. Plan for those early.',
  },
  {
    key: 'location',
    author: 'donald',
    hoursAgo: 20,
    content:
      'Location, location, location. In real estate and in product launches, where you show up matters as much as what you bring.',
  },
  {
    key: 'welcome',
    author: 'owner',
    hoursAgo: 6,
    content:
      'If you are new here, open the chat page. I am pinned at the top of your contacts, send me a message and tell me what you think of the app.',
  },
];

export const SEED_COMMENTS = [
  {
    post: 'nest',
    author: 'mark',
    content:
      'One language across the stack is underrated. Did you keep the same database?',
  },
  {
    post: 'nest',
    author: 'owner',
    content:
      'Yes, everything lives in Postgres. One database is plenty for an app this size.',
  },
  {
    post: 'tests',
    author: 'steve',
    content: 'Simple rule, hard to follow. Worth it though.',
  },
  {
    post: 'reuse',
    author: 'owner',
    content:
      'That is how the UI here was built too, the same post card shows up on three pages.',
  },
  {
    post: 'less',
    author: 'elon',
    content: 'Agreed. Removing things is always harder than adding them.',
  },
  {
    post: 'location',
    author: 'mark',
    content:
      'Timing matters too. The same idea a year too early can still fail.',
  },
  {
    post: 'sockets',
    author: 'donald',
    content: 'Closing the laptop mid message, that is exactly what I do.',
  },
];

// who liked which post
export const SEED_LIKES: Record<string, string[]> = {
  nest: ['elon', 'mark', 'steve', 'donald'],
  tests: ['mark', 'steve', 'elon'],
  sockets: ['elon', 'donald'],
  less: ['owner', 'mark', 'elon'],
  reuse: ['owner', 'mark'],
  watch: ['owner', 'steve'],
  search: ['donald'],
  location: ['steve'],
};
