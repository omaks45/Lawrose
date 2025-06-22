/* eslint-disable prettier/prettier */
import { 
  ValidateNested, 
  IsNumber, 
  Min, 
  Max, 
  IsOptional, 
  IsArray, 
  ArrayMinSize,
  IsEnum 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ShippingAddressDto } from '../../addresses/dto/shipping-address.dto';
import { ShippingSpeed } from '../../shipping/dto/shipping-option.dto';

export class PackageDimensionsDto {
  @ApiProperty({
    description: 'Package length in cm',
    example: 30,
  })
  @IsNumber({}, { message: 'Length must be a number' })
  @Min(1, { message: 'Length must be at least 1 cm' })
  @Max(200, { message: 'Length cannot exceed 200 cm' })
  length: number;

  @ApiProperty({
    description: 'Package width in cm',  
    example: 20,
  })
  @IsNumber({}, { message: 'Width must be a number' })
  @Min(1, { message: 'Width must be at least 1 cm' })
  @Max(200, { message: 'Width cannot exceed 200 cm' })
  width: number;

  @ApiProperty({
    description: 'Package height in cm',
    example: 15,
  })
  @IsNumber({}, { message: 'Height must be a number' })
  @Min(1, { message: 'Height must be at least 1 cm' })
  @Max(200, { message: 'Height cannot exceed 200 cm' })
  height: number;

  @ApiProperty({
    description: 'Package weight in kg',
    example: 2.5,
  })
  @IsNumber({}, { message: 'Weight must be a number' })
  @Min(0.1, { message: 'Weight must be at least 0.1 kg' })
  @Max(50, { message: 'Weight cannot exceed 50 kg' })
  weight: number;
}

export class CalculateShippingDto {
  @ApiProperty({
    description: 'Origin address (warehouse/store)',
    type: ShippingAddressDto,
  })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  origin: ShippingAddressDto;

  @ApiProperty({
    description: 'Destination address (customer)',
    type: ShippingAddressDto,
  })
  @ValidateNested()
  @Type(() => ShippingAddressDto) 
  destination: ShippingAddressDto;

  @ApiProperty({
    description: 'Package dimensions and weight',
    type: [PackageDimensionsDto],
  })
  @IsArray({ message: 'Packages must be an array' })
  @ArrayMinSize(1, { message: 'At least one package is required' })
  @ValidateNested({ each: true })
  @Type(() => PackageDimensionsDto)
  packages: PackageDimensionsDto[];

  @ApiProperty({
    description: 'Preferred shipping speeds to calculate',
    enum: ShippingSpeed,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Preferred speeds must be an array' })
  @IsEnum(ShippingSpeed, { each: true, message: 'Invalid shipping speed' })
  preferredSpeeds?: ShippingSpeed[];

  @ApiProperty({
    description: 'Package declared value for insurance',
    example: 100.00,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Declared value must be a number' })
  @Min(0, { message: 'Declared value cannot be negative' })
  @Max(10000, { message: 'Declared value cannot exceed $10,000' })
  declaredValue?: number;
}