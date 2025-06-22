/* eslint-disable prettier/prettier */
import { AddressDto } from '../../users/dto/address.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsMongoId } from 'class-validator';

export class CreateAddressDto extends AddressDto {
  @ApiProperty({
    description: 'User ID who owns this address',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'User ID must be a string' })
  @IsMongoId({ message: 'User ID must be a valid MongoDB ObjectId' })
  userId: string;
}