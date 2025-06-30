/* eslint-disable prettier/prettier */
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsBoolean, IsDateString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';


export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email'] as const)
) {
  id() {
    throw new Error('Method not implemented.');
  }
  @ApiProperty({
    description: 'User active status',
    example: true,
    required: false,
  })

  @IsOptional()
  @IsEmail()
  email?: string;

  
  @ApiProperty({
    description: 'Email verification timestamp',
    example: '2023-12-01T12:00:00Z',
    required: false,
  })
  @IsOptional()
  emailVerifiedAt?: Date;

  @IsOptional()
  @IsBoolean({ message: 'Active status must be a boolean' })
  isActive?: boolean;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2023-12-01T12:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Last login must be a valid date' })
  lastLogin?: Date;

  @ApiProperty({
    required: false,
    type: 'object',
    example: {
      defaultShippingAddress: '60b8d6f5e1a3e73cd0f9c9f7',
      preferredShippingMethod: 'standard',
      emailNotifications: true,
      smsNotifications: false,
    },
  })
  @IsOptional()
  preferences?: Partial<{
    defaultShippingAddress?: Types.ObjectId;
    preferredShippingMethod?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
  }>;

}