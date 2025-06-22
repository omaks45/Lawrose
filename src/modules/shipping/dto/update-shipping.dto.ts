import { PartialType } from '@nestjs/mapped-types';
import { CreateShippingDto } from './calculate-shipping.dto';

export class UpdateShippingDto extends PartialType(CreateShippingDto) {
  id: number;
}
