/* eslint-disable prettier/prettier */
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, KafkaContext, Ctx } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';
import { User } from './user.schema';

// Payload interfaces for microservice communication
interface FindAllUsersPayload {
  page?: number;
  limit?: number;
  filters?: {
    isActive?: boolean;
    emailVerified?: boolean;
    search?: string;
  };
}

interface FindOneUserPayload {
  id: string;
  includeAddresses?: boolean;
}

interface UpdateUserPayload {
  id: string;
  updateUserDto: UpdateUserDto;
}

interface DeleteUserPayload {
  id: string;
  softDelete?: boolean;
}

interface AddAddressPayload {
  userId: string;
  address: CreateAddressDto;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Controller()
export class UsersKafkaController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('user.create')
  async createUserMicroservice(
    @Payload() createUserDto: CreateUserDto,
    @Ctx() context: KafkaContext,
  ): Promise<User> {
    const partition = context.getPartition();
    const offset = context.getMessage().offset;
    const timestamp = context.getMessage().timestamp;
    console.log(`Processing user.create - Partition: ${partition}, Offset: ${offset}, Timestamp: ${timestamp}`);
    
    try {
      const user = await this.usersService.create(createUserDto);
      console.log('User created successfully:', user.id);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  @MessagePattern('user.findAll')
  async findAllUsersMicroservice(
    @Payload() payload: FindAllUsersPayload,
    @Ctx() context: KafkaContext,
  ): Promise<PaginatedResponse<User>> {
    const offset = context.getMessage().offset;
    const partition = context.getPartition();
    console.log(`Processing user.findAll - Partition: ${partition}, Offset: ${offset}`);
    
    const { page = 1, limit = 10 } = payload;
    
    const result = await this.usersService.findAll(page, limit);
    return {
      data: result.data,
      meta: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: limit,
        hasNext: result.currentPage < result.totalPages,
        hasPrev: result.currentPage > 1,
      },
    };
  }

  @MessagePattern('user.findOne')
  async findOneUserMicroservice(
    @Payload() payload: FindOneUserPayload,
    @Ctx() context: KafkaContext,
  ): Promise<User> {
    const partition = context.getPartition();
    const offset = context.getMessage().offset;
    console.log(`Processing user.findOne - Partition: ${partition}, Offset: ${offset}`);
    
    const { id } = payload;
    
    return this.usersService.findOne({ id });
  }

  @MessagePattern('user.update')
  async updateUserMicroservice(
    @Payload() payload: UpdateUserPayload,
    @Ctx() context: KafkaContext,
  ): Promise<User> {
    const offset = context.getMessage().offset;
    const partition = context.getPartition();
    console.log(`Processing user.update - Partition: ${partition}, Offset: ${offset}`);
    
    const { id, updateUserDto } = payload;
    
    try {
      const updatedUser = await this.usersService.update(id, updateUserDto);
      console.log('User updated successfully:', updatedUser.id);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  @MessagePattern('user.delete')
  async deleteUserMicroservice(
    @Payload() payload: DeleteUserPayload,
    @Ctx() context: KafkaContext,
  ): Promise<{ success: boolean; message: string }> {
    const offset = context.getMessage().offset;
    const partition = context.getPartition();
    console.log(`Processing user.delete - Partition: ${partition}, Offset: ${offset}`);
    
    const { id, softDelete = true } = payload;
    
    try {
      await this.usersService.remove(id);
      console.log('User deleted successfully:', id);
      
      return { 
        success: true, 
        message: `User ${softDelete ? 'soft' : 'permanently'} deleted successfully` 
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  @MessagePattern('user.addAddress')
  async addAddressMicroservice(
    @Payload() payload: AddAddressPayload,
    @Ctx() context: KafkaContext,
  ): Promise<User> {
    const offset = context.getMessage().offset;
    const partition = context.getPartition();
    console.log(`Processing user.addAddress - Partition: ${partition}, Offset: ${offset}`);
    
    const { userId, address } = payload;
    
    try {
      const updatedUser = await this.usersService.addAddress(userId, address);
      console.log('Address added successfully for user:', userId);
      return updatedUser;
    } catch (error) {
      console.error('Error adding address:', error);
      throw error;
    }
  }

  @MessagePattern('user.search')
  async searchUsersMicroservice(
    @Payload() payload: { 
      query: string; 
      filters?: any; 
      page?: number; 
      limit?: number; 
    },
    @Ctx() context: KafkaContext,
  ): Promise<PaginatedResponse<User>> {
    const offset = context.getMessage().offset;
    const partition = context.getPartition();
    console.log(`Processing user.search - Partition: ${partition}, Offset: ${offset}`);
    
    const { query, filters = {}, page = 1, limit = 10 } = payload;
    
    const result = await this.usersService.searchUsers(query, filters, page, limit);
    return {
      data: result.data,
      meta: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: limit,
        hasNext: result.currentPage < result.totalPages,
        hasPrev: result.currentPage > 1,
      },
    };
  }

  @MessagePattern('user.bulkCreate')
  async bulkCreateUsersMicroservice(
    @Payload() payload: { users: CreateUserDto[] },
    @Ctx() context: KafkaContext,
  ): Promise<{ success: User[]; failed: any[] }> {
    const offset = context.getMessage().offset;
    const partition = context.getPartition();
    console.log(`Processing user.bulkCreate - Partition: ${partition}, Offset: ${offset}`);
    
    const { users } = payload;
    
    try {
      const result = await this.usersService.bulkCreate(users);
      console.log(`Bulk created ${result.created.length} users, ${result.failed.length} failed`);
      
      return { success: result.created, failed: result.failed };
    } catch (error) {
      console.error('Error in bulk create:', error);
      throw error;
    }
  }

  @MessagePattern('user.verify-email')
  async verifyEmailMicroservice(
    @Payload() payload: { userId: string; token: string },
    @Ctx() context: KafkaContext,
  ): Promise<{ success: boolean; message: string }> {
    const offset = context.getMessage().offset;
    const partition = context.getPartition();
    console.log(`Processing user.verify-email - Partition: ${partition}, Offset: ${offset}`);
    
    const { userId, token } = payload;
    
    try {
      await this.usersService.verifyEmail(userId, token);
      console.log('Email verified successfully for user:', userId);
      
      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  }
}