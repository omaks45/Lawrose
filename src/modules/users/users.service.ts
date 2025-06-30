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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BulkCreateResult {
  created: User[];
  failed: Array<{
    data: CreateUserDto;
    error: string;
  }>;
  summary: {
    totalProcessed: number;
    successCount: number;
    failureCount: number;
  };
}

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
   * Bulk create multiple users
   */
  async bulkCreate(createUserDtos: CreateUserDto[]): Promise<BulkCreateResult> {
    const result: BulkCreateResult = {
      created: [],
      failed: [],
      summary: {
        totalProcessed: createUserDtos.length,
        successCount: 0,
        failureCount: 0
      }
    };

    try {
      // Validate input
      if (!Array.isArray(createUserDtos) || createUserDtos.length === 0) {
        throw new BadRequestException('Invalid input: expected non-empty array of user data');
      }

      // Check for duplicate emails in the batch
      const emails = createUserDtos.map(dto => dto.email.toLowerCase());
      const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
      
      if (duplicateEmails.length > 0) {
        throw new BadRequestException(`Duplicate emails in batch: ${duplicateEmails.join(', ')}`);
      }

      // Check for existing users
      const existingUsers = await this.usersRepository.findByEmails(emails);
      const existingEmailsSet = new Set(existingUsers.map(user => user.email.toLowerCase()));

      // Process each user
      for (const createUserDto of createUserDtos) {
        try {
          // Skip if user already exists
          if (existingEmailsSet.has(createUserDto.email.toLowerCase())) {
            result.failed.push({
              data: createUserDto,
              error: 'User with this email already exists'
            });
            result.summary.failureCount++;
            continue;
          }

          const user = await this.usersRepository.create(createUserDto);
          result.created.push(user);
          result.summary.successCount++;
          
          this.logger.log(`User created in bulk operation: ${user.email}`);
        } catch (error) {
          result.failed.push({
            data: createUserDto,
            error: error.message || 'Unknown error occurred'
          });
          result.summary.failureCount++;
          this.logger.warn(`Failed to create user in bulk: ${createUserDto.email} - ${error.message}`);
        }
      }

      this.logger.log(`Bulk create completed: ${result.summary.successCount} created, ${result.summary.failureCount} failed`);
      return result;
    } catch (error) {
      this.logger.error(`Error in bulk create operation: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process bulk create operation');
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string, verificationToken?: string): Promise<User> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const user = await this.usersRepository.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.emailVerified) {
        throw new ConflictException('Email is already verified');
      }

      // If verification token is provided, validate it
      if (verificationToken && user.emailVerificationToken !== verificationToken) {
        throw new BadRequestException('Invalid verification token');
      }

      const updatedUser = await this.usersRepository.update(userId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null // Clear the token after successful verification
      });

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`Email verified successfully for user: ${user.email}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error verifying email: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to verify email');
    }
  }

  /**
   * Find one user by various criteria
   */
  async findOne(criteria: {
    id?: string;
    email?: string;
    phone?: string;
    verificationToken?: string;
    resetPasswordToken?: string;
  }): Promise<User | null> {
    try {
      // Validate ID format if provided
      if (criteria.id && !Types.ObjectId.isValid(criteria.id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      // Build search criteria
      const searchCriteria: any = {};
      
      if (criteria.id) {
        searchCriteria._id = criteria.id;
      }
      if (criteria.email) {
        searchCriteria.email = criteria.email.toLowerCase();
      }
      if (criteria.phone) {
        searchCriteria.phone = criteria.phone;
      }
      if (criteria.verificationToken) {
        searchCriteria.verificationToken = criteria.verificationToken;
      }
      if (criteria.resetPasswordToken) {
        searchCriteria.resetPasswordToken = criteria.resetPasswordToken;
      }

      // Ensure at least one search criterion is provided
      if (Object.keys(searchCriteria).length === 0) {
        throw new BadRequestException('At least one search criterion must be provided');
      }

      const user = await this.usersRepository.findOne(searchCriteria);
      return user;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error finding user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to find user');
    }
  }

  /**
   * Search users with filters and pagination
   */
  async searchUsers(
    query: string,
    filters: any = {},
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<User>> {
    try {
      const skip = (page - 1) * limit;

      // Merge text query into filters
      const searchCriteria: any = { ...filters };
      if (query) {
        searchCriteria.$or = [
          { firstName: new RegExp(query, 'i') },
          { lastName: new RegExp(query, 'i') },
          { email: new RegExp(query, 'i') },
          { phone: new RegExp(query, 'i') },
        ];
      }

      const [users, total] = await Promise.all([
        this.usersRepository.search(searchCriteria, skip, limit),
        this.usersRepository.count(searchCriteria),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: users,
        total,
        totalPages,
        currentPage: page,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to search users');
    }
  }

  /**
   * Find all users with pagination
   */
  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedResult<User>> {
    try {
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        this.usersRepository.findAll(skip, limit),
        this.usersRepository.count({})
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: users,
        total,
        totalPages,
        currentPage: page,
        hasNext: page < totalPages,
        hasPrev: page > 1
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
        isActive: true
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

      const user = await this.usersRepository.update(userId, { preferences });
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
  }, page: number = 1, limit: number = 10): Promise<PaginatedResult<User>> {
    try {
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        this.usersRepository.search(criteria, skip, limit),
        this.usersRepository.count(criteria)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: users,
        total,
        totalPages,
        currentPage: page,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to search users');
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    verifiedUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    verificationRate: number;
  }> {
    try {
      const [totalUsers, verifiedUsers, activeUsers] = await Promise.all([
        this.usersRepository.count({}),
        this.usersRepository.count({ emailVerified: true }),
        this.usersRepository.count({ isActive: true })
      ]);

      const inactiveUsers = totalUsers - activeUsers;
      const verificationRate = totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;

      return {
        totalUsers,
        verifiedUsers,
        activeUsers,
        inactiveUsers,
        verificationRate: Math.round(verificationRate * 100) / 100
      };
    } catch (error) {
      this.logger.error(`Error getting user stats: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get user statistics');
    }
  }
}