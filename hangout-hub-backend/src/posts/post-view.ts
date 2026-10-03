import { Comment } from './comment.entity.js';
import { Post } from './post.entity.js';
import { ReactionType } from './reaction.entity.js';

export function toPostView(post: Post, myReaction: ReactionType | null = null) {
  return {
    id: post.id,
    authorId: post.authorId,
    authorName: post.author?.userName,
    content: post.content,
    likeCount: post.likeCount,
    dislikeCount: post.dislikeCount,
    commentCount: post.commentCount,
    myReaction,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export function toCommentView(comment: Comment) {
  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    authorName: comment.author?.userName,
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

export function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, '\\$&');
}
