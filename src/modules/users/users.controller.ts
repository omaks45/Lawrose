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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiExtraModels
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';
import { User } from './user.schema';
import { Address } from './address.schema';

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
  ): Promise<PaginatedResponse<User>> {
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
}