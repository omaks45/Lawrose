import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/shipping-address.dto';

@Controller()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @MessagePattern('createAddress')
  create(@Payload() createAddressDto: CreateAddressDto) {
    return this.addressesService.create(createAddressDto);
  }

  @MessagePattern('findAllAddresses')
  findAll() {
    return this.addressesService.findAll();
  }

  @MessagePattern('findOneAddress')
  findOne(@Payload() id: number) {
    return this.addressesService.findOne(id);
  }

  @MessagePattern('updateAddress')
  update(@Payload() updateAddressDto: UpdateAddressDto) {
    return this.addressesService.update(updateAddressDto.id, updateAddressDto);
  }

  @MessagePattern('removeAddress')
  remove(@Payload() id: number) {
    return this.addressesService.remove(id);
  }
}
