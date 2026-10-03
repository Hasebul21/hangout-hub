export const POSTS_INDEX = 'quickchat_posts';

export interface Post {
  id: string;
  authorId: number;
  authorName: string;
  content: string;
  likeCount: number;
  dislikeCount: number;
  likedBy: number[];
  dislikedBy: number[];
  createdAt: string;
  updatedAt: string;
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
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
  },
};
