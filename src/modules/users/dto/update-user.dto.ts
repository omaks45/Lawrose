/* eslint-disable prettier/prettier */
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email'] as const)
) {
  @ApiProperty({
    description: 'User active status',
    example: true,
    required: false,
  })
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
}