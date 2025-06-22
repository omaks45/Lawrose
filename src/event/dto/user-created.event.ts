/* eslint-disable prettier/prettier */
import { IsString, IsEmail, IsBoolean, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserCreatedEvent {
  @ApiProperty({
    description: 'Event type identifier',
    example: 'user.created',
  })
  @IsString()
  eventType: string = 'user.created';

  @ApiProperty({
    description: 'Event timestamp',
    example: '2023-12-01T12:00:00Z',
  })
  @IsDateString()
  timestamp: string;

  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Email verification status',
    example: false,
  })
  @IsBoolean()
  emailVerified: boolean;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;
}