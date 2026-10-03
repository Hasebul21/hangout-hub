// Demo accounts so the app doesn't look empty. They are clearly marked as demo
// in the UI and nobody can log in with them (random password).
const DEMO_BIO =
  'Demo account to show how QuickChat works. This is not the real person.';

export const DEMO_USERS = [
  {
    userName: 'Elon Musk',
    email: 'elon.demo@quickchat.app',
    post: 'Just joined QuickChat to see how it handles a lot of messages. So far so good.',
    message: 'Hey Hasebul, the chat feels quick. Nice work.',
    reply: 'Thanks! Glad it works for you.',
  },
  {
    userName: 'Mark Zuckerberg',
    email: 'mark.demo@quickchat.app',
    post: 'Testing the feed here. Posting, liking and comments all work.',
    message: 'Hi! I left a like on your post about the new backend.',
    reply: 'Appreciate it, thanks for trying it out.',
  },
  {
    userName: 'Steve Jobs',
    email: 'steve.demo@quickchat.app',
    post: 'Checking out the profile page. Changing the picture takes two clicks.',
    message: 'Hello from the demo account. The layout is clean.',
    reply: null,
  },
  {
    userName: 'Donald Trump',
    email: 'donald.demo@quickchat.app',
    post: 'Tried the search in the feed. Found my own post in a second.',
    message: 'Hi Hasebul, just testing the chat. Works great.',
    reply: null,
  },
].map((user) => ({ ...user, bio: DEMO_BIO }));
