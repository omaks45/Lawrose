/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";
export class MagicLinkDto {
  @ApiProperty({
    description: 'Magic link token',
    example: 'xyz789abc123...',
  })
  @IsString({ message: 'Token must be a string' })
  @MinLength(32, { message: 'Invalid token format' })
  @MaxLength(128, { message: 'Invalid token format' })
  token: string;

  @ApiProperty({
    description: 'Email address for magic link authentication',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}