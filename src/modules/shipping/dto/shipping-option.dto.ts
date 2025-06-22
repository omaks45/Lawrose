/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ShippingProvider {
  DHL = 'dhl',
  FEDEX = 'fedex',
  UPS = 'ups',
  USPS = 'usps',
}

export enum ShippingSpeed {
  STANDARD = 'standard',
  EXPRESS = 'express',
  OVERNIGHT = 'overnight',
  SAME_DAY = 'same_day',
}

export class ShippingOptionDto {
  @ApiProperty({
    description: 'Shipping provider',
    enum: ShippingProvider,
    example: ShippingProvider.DHL,
  })
  @IsEnum(ShippingProvider, { message: 'Invalid shipping provider' })
  provider: ShippingProvider;

  @ApiProperty({
    description: 'Shipping service name',
    example: 'DHL Express Worldwide',
  })
  @IsString({ message: 'Service name must be a string' })
  @MinLength(2, { message: 'Service name must be at least 2 characters' })
  @MaxLength(100, { message: 'Service name must not exceed 100 characters' })
  serviceName: string;

  @ApiProperty({
    description: 'Shipping speed category',
    enum: ShippingSpeed,
    example: ShippingSpeed.EXPRESS,
  })
  @IsEnum(ShippingSpeed, { message: 'Invalid shipping speed' })
  speed: ShippingSpeed;

  @ApiProperty({
    description: 'Shipping cost in cents',
    example: 1500,
  })
  @IsNumber({}, { message: 'Cost must be a number' })
  @Min(0, { message: 'Cost cannot be negative' })
  @Max(100000, { message: 'Cost cannot exceed $1000' })
  @Transform(({ value }) => Math.round(value * 100) / 100) // Round to 2 decimal places
  cost: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  @IsString({ message: 'Currency must be a string' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be a valid 3-letter currency code' })
  @Transform(({ value }) => value?.toUpperCase())
  currency: string;

  @ApiProperty({
    description: 'Estimated delivery time in business days',
    example: 3,
  })
  @IsNumber({}, { message: 'Delivery time must be a number' })
  @Min(0, { message: 'Delivery time cannot be negative' })
  @Max(30, { message: 'Delivery time cannot exceed 30 days' })
  estimatedDeliveryDays: number;

  @ApiProperty({
    description: 'Whether tracking is included',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Tracking flag must be a boolean' })
  hasTracking?: boolean = true;

  @ApiProperty({
    description: 'Whether insurance is included',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Insurance flag must be a boolean' })
  hasInsurance?: boolean = false;

  @ApiProperty({
    description: 'Maximum package weight in kg',
    example: 10.5,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Max weight must be a number' })
  @Min(0.1, { message: 'Max weight must be at least 0.1 kg' })
  @Max(100, { message: 'Max weight cannot exceed 100 kg' })
  maxWeight?: number;

  @ApiProperty({
    description: 'Additional service fees',
    example: { 'signature_required': 300, 'saturday_delivery': 500 },
    required: false,
  })
  @IsOptional()
  additionalFees?: Record<string, number>;
}