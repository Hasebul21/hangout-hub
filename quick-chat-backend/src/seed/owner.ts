// The site owner. This account is always there for new users to talk to.
// Set OWNER_PASSWORD in production, the default is only for local use.
export const OWNER = {
  userName: 'Hasebul Hassan',
  email: 'hasebulhassan21@gmail.com',
  defaultPassword: 'hasebul123',
  professionalTitle: 'Software Engineer',
  portfolio: 'https://github.com/Hasebul21',
  skills: 'Java, Spring Boot, Angular, NestJS',
  bio: 'I built QuickChat. If you just signed up, say hi, I usually reply.',
};

export const OWNER_POSTS = [
  {
    daysAgo: 6,
    content:
      'QuickChat has a new backend. I rewrote the server in NestJS and retired the old Spring Boot version. Chat, posts and search still work the same, it is just a lot easier to work on now.',
  },
  {
    daysAgo: 4,
    content:
      'If you are new here, open the chat page. I am always at the top of your contact list, so send me a message and tell me what you think.',
  },
  {
    daysAgo: 2,
    content:
      'The feed search goes through Elasticsearch, so you can look for a word you remember from a post instead of scrolling through everything.',
  },
  {
    daysAgo: 1,
    content:
      'Added comments on posts. Likes are one per person now, and clicking the same button again takes your vote back.',
  },
];
