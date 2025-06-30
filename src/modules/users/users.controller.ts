/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  ClassSerializerInterceptor
} from '@nestjs/common';
import { MessagePattern, Payload, KafkaContext, Ctx } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  //ApiBearerAuth,
  ApiExtraModels
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';
import { User } from './user.schema';
import { Address } from './address.schema';

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

@ApiTags('Users')
@ApiExtraModels(CreateUserDto, UpdateUserDto, CreateAddressDto, User, Address)
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // HTTP ENDPOINTS FOR DEVELOPMENT TESTING

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new user',
    description: 'Creates a new user account with the provided information. This endpoint is available for development testing and direct API access.'
  })
  @ApiBody({ 
    type: CreateUserDto,
    description: 'User creation data',
    examples: {
      example1: {
        summary: 'Basic user creation',
        value: {
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          preferences: {
            notifications: true,
            theme: 'light'
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User has been successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '64f5c8e8b1234567890abcde' },
        email: { type: 'string', example: 'john.doe@example.com' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        phone: { type: 'string', example: '+1234567890' },
        emailVerified: { type: 'boolean', example: false },
        isActive: { type: 'boolean', example: true },
        addresses: { type: 'array', items: {} },
        preferences: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - validation failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - user already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'User with this email already exists' },
        error: { type: 'string', example: 'Conflict' }
      }
    }
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all users',
    description: 'Retrieves a paginated list of users with optional filtering. This endpoint supports pagination and various filters for development testing.'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: Number, 
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10
  })
  @ApiQuery({ 
    name: 'isActive', 
    required: false, 
    type: Boolean, 
    description: 'Filter by active status',
    example: true
  })
  @ApiQuery({ 
    name: 'emailVerified', 
    required: false, 
    type: Boolean, 
    description: 'Filter by email verification status',
    example: true
  })
  @ApiQuery({ 
    name: 'search', 
    required: false, 
    type: String, 
    description: 'Search in name, email, or phone',
    example: 'john'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved users with pagination info',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              phone: { type: 'string' },
              emailVerified: { type: 'boolean' },
              isActive: { type: 'boolean' },
              addresses: { type: 'array' },
              preferences: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 10 },
            currentPage: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false }
          }
        }
      }
    }
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('isActive') isActive?: boolean,
    @Query('emailVerified') emailVerified?: boolean,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<User>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const filters = { isActive, emailVerified, search };
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

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Retrieves a single user by their unique identifier'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'User unique identifier',
    example: '64f5c8e8b1234567890abcde'
  })
  @ApiQuery({ 
    name: 'includeAddresses', 
    required: false, 
    type: Boolean, 
    description: 'Include user addresses in response',
    example: true
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User found successfully',
    type: User
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<User> {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update user',
    description: 'Updates user information with the provided data'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'User unique identifier',
    example: '64f5c8e8b1234567890abcde'
  })
  @ApiBody({ 
    type: UpdateUserDto,
    description: 'User update data'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User updated successfully',
    type: User
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found'
  })
  async update(
    @Param('id') id: string, 
    @Body() updateUserDto: UpdateUserDto
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete user',
    description: 'Deletes a user account (soft delete by default)'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'User unique identifier',
    example: '64f5c8e8b1234567890abcde'
  })
  @ApiQuery({ 
    name: 'permanent', 
    required: false, 
    type: Boolean, 
    description: 'Permanently delete user (default: false for soft delete)',
    example: false
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found'
  })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }

  @Post(':id/addresses')
  @ApiOperation({ 
    summary: 'Add address to user',
    description: 'Adds a new address to the specified user'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'User unique identifier',
    example: '64f5c8e8b1234567890abcde'
  })
  @ApiBody({ 
    type: CreateAddressDto,
    description: 'Address data to add'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Address added successfully',
    type: User
  })
  async addAddress(
    @Param('id') userId: string,
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<User> {
    return this.usersService.addAddress(userId, createAddressDto);
  }

  // ========================================
  // KAFKA MESSAGE PATTERNS FOR MICROSERVICES
  // ========================================

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
      
      // Publish user created event
      // Note: You would typically inject a Kafka client here to publish events
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
      
      // Publish user updated event
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
      
      // Publish user deleted event
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
      
      // Publish address added event
      console.log('Address added successfully for user:', userId);
      
      return updatedUser;
    } catch (error) {
      console.error('Error adding address:', error);
      throw error;
    }
  }

  // Additional microservice patterns for more complex operations
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
      
      // Publish bulk users created event
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