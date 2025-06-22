/* eslint-disable prettier/prettier */
import { AddressDto } from '../../modules/users/dto/address.dto';
import { IsString, IsDateString, ValidateNested, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class AddressUpdatedEvent {
  @ApiProperty({
    description: 'Event type identifier',
    example: 'address.updated',
  })
  @IsString()
  eventType: string = 'address.updated';

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
    description: 'Address ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  addressId: string;

  @ApiProperty({
    description: 'Updated address data',
    type: AddressDto,
  })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiProperty({
    description: 'Type of update performed',
    example: 'created',
  })
  @IsString()
  @IsIn(['created', 'updated', 'deleted', 'set_default'])
  updateType: 'created' | 'updated' | 'deleted' | 'set_default';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Type(arg0: () => typeof AddressDto): (target: AddressUpdatedEvent, propertyKey: "address") => void {
    throw new Error('Function not implemented.');
}
