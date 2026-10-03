export type Reaction = 'like' | 'dislike';

export interface Post {
  id: string;
  authorId: number;
  authorName: string;
  content: string;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  myReaction: Reaction | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostPage {
  items: Post[];
  total: number;
  page: number;
  size: number;
}

export interface PostFilter {
  author?: string;
  q?: string;
  from?: string;
  to?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}
