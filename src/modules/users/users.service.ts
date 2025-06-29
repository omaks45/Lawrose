/* eslint-disable prettier/prettier */
import { 
  Injectable, 
  NotFoundException, 
  ConflictException,
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersRepository } from './repository/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';
import { User } from './user.schema';
import { Address } from './address.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.usersRepository.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const user = await this.usersRepository.create(createUserDto);
      this.logger.log(`User created successfully: ${user.email}`);
      
      return user;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create user');
    }
  }

  /**
   * Find all users with pagination
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{
    users: User[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        this.usersRepository.findAll(skip, limit),
        this.usersRepository.count({})
      ]);

      return {
        users,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      };
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch users');
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const user = await this.usersRepository.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error finding user by ID: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to find user');
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.usersRepository.findByEmail(email);
    } catch (error) {
      this.logger.error(`Error finding user by email: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to find user');
    }
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      // Check if email is being updated and if it already exists
      if (updateUserDto.email) {
        const existingUser = await this.usersRepository.findByEmail(updateUserDto.email);
     if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
        }
      }

      const user = await this.usersRepository.update(id, updateUserDto);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`User updated successfully: ${user.email}`);
      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error updating user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update user');
    }
  }

  /**
   * Soft delete user (mark as inactive)
   */
  async remove(id: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const result = await this.usersRepository.softDelete(id);
      if (!result) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`User soft deleted: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error deleting user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to delete user');
    }
  }

  /**
   * Add address to user
   */
  async addAddress(userId: string, createAddressDto: CreateAddressDto): Promise<User> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const user = await this.usersRepository.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // If this is the first address or marked as default, make it default
      const isFirstAddress = user.addresses.length === 0;
      const addressData = {
        ...createAddressDto,
        _id: new Types.ObjectId(),
        isDefault: createAddressDto.isDefault || isFirstAddress,
        isActive: true // Ensure isActive is always set as required by Address type
      };

      // If setting as default, unset other default addresses of the same type
      if (addressData.isDefault) {
        user.addresses.forEach(addr => {
          if (addr.type === addressData.type) {
            addr.isDefault = false;
          }
        });
      }

      const updatedUser = await this.usersRepository.addAddress(userId, addressData);
      this.logger.log(`Address added to user: ${userId}`);
      
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error adding address: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to add address');
    }
  }

  /**
   * Update user address
   */
  async updateAddress(userId: string, addressId: string, updateData: Partial<Address>): Promise<User> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(addressId)) {
        throw new BadRequestException('Invalid ID format');
      }

      const user = await this.usersRepository.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const addressIndex = user.addresses.findIndex(addr => addr._id?.toString() === addressId);
      if (addressIndex === -1) {
        throw new NotFoundException('Address not found');
      }

      // If setting as default, unset other default addresses of the same type
      if (updateData.isDefault) {
        user.addresses.forEach((addr, index) => {
          if (addr.type === user.addresses[addressIndex].type && index !== addressIndex) {
            addr.isDefault = false;
          }
        });
      }

      const updatedUser = await this.usersRepository.updateAddress(userId, addressId, updateData);
      this.logger.log(`Address updated for user: ${userId}`);
      
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error updating address: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update address');
    }
  }

  /**
   * Remove address from user
   */
  async removeAddress(userId: string, addressId: string): Promise<User> {
    try {
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(addressId)) {
        throw new BadRequestException('Invalid ID format');
      }

      const user = await this.usersRepository.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const addressExists = user.addresses.some(addr => addr._id?.toString() === addressId);
      if (!addressExists) {
        throw new NotFoundException('Address not found');
      }

      const updatedUser = await this.usersRepository.removeAddress(userId, addressId);
      this.logger.log(`Address removed from user: ${userId}`);
      
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error removing address: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to remove address');
    }
  }

  /**
   * Get user's default shipping address
   */
  async getDefaultShippingAddress(userId: string): Promise<Address | null> {
    try {
      const user = await this.findById(userId);
      return user.addresses.find(addr => addr.type === 'shipping' && addr.isDefault) || null;
    } catch (error) {
      this.logger.error(`Error getting default shipping address: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get default shipping address');
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: Partial<User['preferences']>): Promise<User> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const user = await this.usersRepository.update(userId, {
        preferences,
        id: function (): void {
          throw new Error('Function not implemented.');
        }
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`Preferences updated for user: ${userId}`);
      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error updating preferences: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update preferences');
    }
  }

  /**
   * Search users by criteria
   */
  async search(criteria: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    emailVerified?: boolean;
    isActive?: boolean;
  }, page: number = 1, limit: number = 10): Promise<{
    users: User[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        this.usersRepository.search(criteria, skip, limit),
        this.usersRepository.count(criteria)
      ]);

      return {
        users,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      };
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to search users');
    }
  }
}