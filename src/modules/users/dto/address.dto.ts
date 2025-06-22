/* eslint-disable prettier/prettier */
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  //IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum AddressType {
  SHIPPING = 'shipping',
  BILLING = 'billing',
}

export class AddressDto {
  @ApiProperty({
    description: 'Address type',
    enum: AddressType,
    example: AddressType.SHIPPING,
  })
  @IsEnum(AddressType, { message: 'Address type must be either shipping or billing' })
  type: AddressType;

  @ApiProperty({
    description: 'First name for address',
    example: 'John',
  })
  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Matches(/^[a-zA-Z\s\-'\.]+$/, {
    message: 'First name can only contain letters, spaces, hyphens, apostrophes, and periods'
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    description: 'Last name for address',
    example: 'Doe',
  })
  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Matches(/^[a-zA-Z\s\-'\.]+$/, {
    message: 'Last name can only contain letters, spaces, hyphens, apostrophes, and periods'
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'US',
  })
  @IsString({ message: 'Country must be a string' })
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a valid 2-letter country code' })
  @Transform(({ value }) => value?.toUpperCase().trim())
  country: string;

  @ApiProperty({
    description: 'State or province',
    example: 'California',
  })
  @IsString({ message: 'State must be a string' })
  @MinLength(2, { message: 'State must be at least 2 characters' })
  @MaxLength(50, { message: 'State must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  state: string;

  @ApiProperty({
    description: 'City name',
    example: 'Los Angeles',
  })
  @IsString({ message: 'City must be a string' })
  @MinLength(2, { message: 'City must be at least 2 characters' })
  @MaxLength(50, { message: 'City must not exceed 50 characters' })
  @Matches(/^[a-zA-Z\s\-'\.]+$/, {
    message: 'City can only contain letters, spaces, hyphens, apostrophes, and periods'
  })
  @Transform(({ value }) => value?.trim())
  city: string;

  @ApiProperty({
    description: 'Street address',
    example: '123 Main Street, Apt 4B',
  })
  @IsString({ message: 'Address must be a string' })
  @MinLength(5, { message: 'Address must be at least 5 characters' })
  @MaxLength(200, { message: 'Address must not exceed 200 characters' })
  @Matches(/^[a-zA-Z0-9\s\-,\.#\/]+$/, {
    message: 'Address contains invalid characters'
  })
  @Transform(({ value }) => value?.trim())
  address: string;

  @ApiProperty({
    description: 'Postal or ZIP code',
    example: '90210',
  })
  @IsString({ message: 'Postal code must be a string' })
  @MinLength(3, { message: 'Postal code must be at least 3 characters' })
  @MaxLength(10, { message: 'Postal code must not exceed 10 characters' })
  @Matches(/^[A-Z0-9\s\-]{3,10}$/i, {
    message: 'Please provide a valid postal code'
  })
  @Transform(({ value }) => value?.toUpperCase().trim())
  postalCode: string;

  @ApiProperty({
    description: 'Phone number for this address',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^\+?[\d\s\-\(\)]+$/, {
    message: 'Please provide a valid phone number'
  })
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  @Transform(({ value }) => value?.replace(/\s+/g, ''))
  phone?: string;

  @ApiProperty({
    description: 'Whether this is the default address for this type',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Default flag must be a boolean' })
  isDefault?: boolean = false;

  @ApiProperty({
    description: 'Whether this address is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Active flag must be a boolean' })
  isActive?: boolean = true;
}