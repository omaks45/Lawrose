/* eslint-disable prettier/prettier */
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  //MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token',
    example: 'abc123def456...',
  })
  @IsString({ message: 'Token must be a string' })
  @MinLength(32, { message: 'Invalid token format' })
  @MaxLength(128, { message: 'Invalid token format' })
  token: string;

  @ApiProperty({
    description: 'Email address being verified',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}