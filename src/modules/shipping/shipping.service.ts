/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
//import { CreateShippingDto } from './dto/calculate-shipping.dto';
//import { UpdateShippingDto } from './dto/update-shipping.dto';

@Injectable()
export class ShippingService {
  //create(createShippingDto: CreateShippingDto) {
    //return 'This action adds a new shipping';
  //}

  findAll() {
    return `This action returns all shipping`;
  }

  findOne(id: number) {
    return `This action returns a #${id} shipping`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //update(id: number, updateShippingDto: UpdateShippingDto) {
    //return `This action updates a #${id} shipping`;
  //}

  remove(id: number) {
    return `This action removes a #${id} shipping`;
  }
}
