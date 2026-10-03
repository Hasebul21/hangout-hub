import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @MaxLength(50)
  userName: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}
