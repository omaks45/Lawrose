/* eslint-disable prettier/prettier */
import { OmitType } from '@nestjs/swagger';
import { AddressDto, AddressType } from '../../users/dto/address.dto';
import { IsOptional, IsNumber, Min, Max, MaxLength, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShippingAddressDto extends OmitType(AddressDto, ['type'] as const) {
  type: AddressType.SHIPPING = AddressType.SHIPPING;

  @ApiProperty({
    description: 'Delivery instructions',
    example: 'Leave at front door',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Delivery instructions must be a string' })
  @MaxLength(200, { message: 'Delivery instructions must not exceed 200 characters' })
  deliveryInstructions?: string;

  @ApiProperty({
    description: 'Preferred delivery time (0-23 hours)',
    example: 14,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Preferred delivery time must be a number' })
  @Min(0, { message: 'Preferred delivery time must be between 0 and 23' })
  @Max(23, { message: 'Preferred delivery time must be between 0 and 23' })
  preferredDeliveryTime?: number;
}