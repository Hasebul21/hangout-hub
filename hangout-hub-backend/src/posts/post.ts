export const POSTS_INDEX = 'hangouthub_posts';

export interface Post {
  id: string;
  authorId: number;
  authorName: string;
  content: string;
  likeCount: number;
  dislikeCount: number;
  likedBy: number[];
  dislikedBy: number[];
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type Reaction = 'like' | 'dislike';

// what the client sees: the voter lists stay on the server
export function toPostView(post: Post, userId: number) {
  const { likedBy, dislikedBy, ...rest } = post;
  let myReaction: Reaction | null = null;
  if (likedBy.includes(userId)) {
    myReaction = 'like';
  } else if (dislikedBy.includes(userId)) {
    myReaction = 'dislike';
  }
  return { ...rest, commentCount: rest.commentCount ?? 0, myReaction };
}

export const postMappings = {
  properties: {
    id: { type: 'keyword' },
    authorId: { type: 'integer' },
    authorName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
    content: { type: 'text' },
    likeCount: { type: 'integer' },
    dislikeCount: { type: 'integer' },
    likedBy: { type: 'integer' },
    dislikedBy: { type: 'integer' },
    commentCount: { type: 'integer' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
  },
};
