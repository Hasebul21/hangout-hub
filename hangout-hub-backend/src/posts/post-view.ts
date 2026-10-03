import { Comment } from './comment.entity.js';
import { Post } from './post.entity.js';
import { ReactionType } from './reaction.entity.js';

// the shape the client gets, with the author's name flattened in
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

// so a search for "50%" doesn't turn into a wildcard
export function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, '\\$&');
}
