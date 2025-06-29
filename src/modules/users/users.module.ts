/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { Address, AddressSchema } from './address.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './repository/user.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Address.name, schema: AddressSchema }
    ])
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository
  ],
  exports: [
    UsersService,
    UsersRepository,
    MongooseModule
  ]
})
export class UsersModule {}