/* eslint-disable prettier/prettier */
import { IsString, IsEmail, IsDateString, } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserVerifiedEvent {
  @ApiProperty({
    description: 'Event type identifier',
    example: 'user.verified',
  })
  @IsString()
  eventType: string = 'user.verified';

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
    description: 'Verification timestamp',
    example: '2023-12-01T12:05:00Z',
  })
  @IsDateString()
  verifiedAt: string;
}
