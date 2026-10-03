import { IsIn } from 'class-validator';

export class ReactionDto {
  @IsIn(['like', 'dislike'])
  type: 'like' | 'dislike';
}
