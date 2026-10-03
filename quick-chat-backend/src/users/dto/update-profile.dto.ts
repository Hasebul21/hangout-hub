import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  professionalTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  portfolio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  skills?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  hobbies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  instagram?: string;
}
