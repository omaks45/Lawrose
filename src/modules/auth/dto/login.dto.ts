/* eslint-disable prettier/prettier */
import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  //MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(254, { message: 'Email must not exceed 254 characters' })
  email: string;

  @ApiProperty({
    description: 'Remember this device for longer sessions',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean = false;

  @ApiProperty({
    description: 'Device information for security tracking',
    example: 'Mozilla/5.0...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceInfo?: string;
}