import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ShippingService } from './shipping.service';
import { CreateShippingDto } from './dto/calculate-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';

@Controller()
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @MessagePattern('createShipping')
  create(@Payload() createShippingDto: CreateShippingDto) {
    return this.shippingService.create(createShippingDto);
  }

  @MessagePattern('findAllShipping')
  findAll() {
    return this.shippingService.findAll();
  }

  @MessagePattern('findOneShipping')
  findOne(@Payload() id: number) {
    return this.shippingService.findOne(id);
  }

  @MessagePattern('updateShipping')
  update(@Payload() updateShippingDto: UpdateShippingDto) {
    return this.shippingService.update(updateShippingDto.id, updateShippingDto);
  }

  @MessagePattern('removeShipping')
  remove(@Payload() id: number) {
    return this.shippingService.remove(id);
  }
}
