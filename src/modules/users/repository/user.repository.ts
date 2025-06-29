/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Address } from '../address.schema';

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const createdUser = new this.userModel(createUserDto);
      const savedUser = await createdUser.save();
      this.logger.log(`User created with ID: ${savedUser._id}`);
      return savedUser.toJSON();
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all users with pagination
   */
  async findAll(skip: number = 0, limit: number = 10): Promise<User[]> {
    try {
      const users = await this.userModel
        .find({ isActive: true })
        .select('-emailVerificationToken')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      return users.map(user => this.transformUser(user));
    } catch (error) {
      this.logger.error(`Error finding all users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.userModel
        .findOne({ _id: id, isActive: true })
        .select('-emailVerificationToken')
        .lean()
        .exec();

      return user ? this.transformUser(user) : null;
    } catch (error) {
      this.logger.error(`Error finding user by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userModel
        .findOne({ email: email.toLowerCase(), isActive: true })
        .select('-emailVerificationToken')
        .lean()
        .exec();

      return user ? this.transformUser(user) : null;
    } catch (error) {
      this.logger.error(`Error finding user by email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find user by email including verification fields (for auth purposes)
   */
  async findByEmailWithAuth(email: string): Promise<UserDocument | null> {
    try {
      return await this.userModel
        .findOne({ email: email.toLowerCase() })
        .select('+emailVerificationToken')
        .exec();
    } catch (error) {
      this.logger.error(`Error finding user by email with auth: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    try {
      const updatedUser = await this.userModel
        .findOneAndUpdate(
          { _id: id, isActive: true },
          { $set: updateUserDto },
          { new: true, runValidators: true }
        )
        .select('-emailVerificationToken')
        .lean()
        .exec();

      if (updatedUser) {
        this.logger.log(`User updated with ID: ${id}`);
        return this.transformUser(updatedUser);
      }

      return null;
    } catch (error) {
      this.logger.error(`Error updating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Soft delete user (mark as inactive)
   */
  async softDelete(id: string): Promise<boolean> {
    try {
      const result = await this.userModel
        .findOneAndUpdate(
          { _id: id, isActive: true },
          { $set: { isActive: false } },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.log(`User soft deleted with ID: ${id}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error soft deleting user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Hard delete user (permanent deletion)
   */
  async hardDelete(id: string): Promise<boolean> {
    try {
      const result = await this.userModel.findByIdAndDelete(id).exec();
      
      if (result) {
        this.logger.log(`User hard deleted with ID: ${id}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error hard deleting user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add address to user
   */
  async addAddress(userId: string, addressData: Address): Promise<User> {
    try {
      const updatedUser = await this.userModel
        .findOneAndUpdate(
          { _id: userId, isActive: true },
          { $push: { addresses: addressData } },
          { new: true, runValidators: true }
        )
        .select('-emailVerificationToken')
        .lean()
        .exec();

      if (!updatedUser) {
        throw new Error('User not found');
      }

      this.logger.log(`Address added to user: ${userId}`);
      return this.transformUser(updatedUser);
    } catch (error) {
      this.logger.error(`Error adding address: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user address
   */
  async updateAddress(userId: string, addressId: string, updateData: Partial<Address>): Promise<User> {
    try {
      const updatedUser = await this.userModel
        .findOneAndUpdate(
          { 
            _id: userId, 
            isActive: true,
            'addresses._id': addressId
          },
          { 
            $set: Object.keys(updateData).reduce((acc, key) => {
              acc[`addresses.$.${key}`] = updateData[key];
              return acc;
            }, {})
          },
          { new: true, runValidators: true }
        )
        .select('-emailVerificationToken')
        .lean()
        .exec();

      if (!updatedUser) {
        throw new Error('User or address not found');
      }

      this.logger.log(`Address updated for user: ${userId}`);
      return this.transformUser(updatedUser);
    } catch (error) {
      this.logger.error(`Error updating address: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove address from user
   */
  async removeAddress(userId: string, addressId: string): Promise<User> {
    try {
      const updatedUser = await this.userModel
        .findOneAndUpdate(
          { _id: userId, isActive: true },
          { $pull: { addresses: { _id: addressId } } },
          { new: true }
        )
        .select('-emailVerificationToken')
        .lean()
        .exec();

      if (!updatedUser) {
        throw new Error('User not found');
      }

      this.logger.log(`Address removed from user: ${userId}`);
      return this.transformUser(updatedUser);
    } catch (error) {
      this.logger.error(`Error removing address: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search users by criteria
   */
  async search(
    criteria: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      emailVerified?: boolean;
      isActive?: boolean;
    },
    skip: number = 0,
    limit: number = 10
  ): Promise<User[]> {
    try {
      const query: any = { isActive: criteria.isActive ?? true };

      if (criteria.email) {
        query.email = new RegExp(criteria.email, 'i');
      }

      if (criteria.firstName) {
        query.firstName = new RegExp(criteria.firstName, 'i');
      }

      if (criteria.lastName) {
        query.lastName = new RegExp(criteria.lastName, 'i');
      }

      if (criteria.phone) {
        query.phone = new RegExp(criteria.phone, 'i');
      }

      if (criteria.emailVerified !== undefined) {
        query.emailVerified = criteria.emailVerified;
      }

      const users = await this.userModel
        .find(query)
        .select('-emailVerificationToken')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      return users.map(user => this.transformUser(user));
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Count users by criteria
   */
  async count(criteria: any = {}): Promise<number> {
    try {
      const query = { isActive: true, ...criteria };
      return await this.userModel.countDocuments(query).exec();
    } catch (error) {
      this.logger.error(`Error counting users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find users by IDs
   */
  async findByIds(ids: string[]): Promise<User[]> {
    try {
      const objectIds = ids.map(id => new Types.ObjectId(id));
      const users = await this.userModel
        .find({ _id: { $in: objectIds }, isActive: true })
        .select('-emailVerificationToken')
        .lean()
        .exec();

      return users.map(user => this.transformUser(user));
    } catch (error) {
      this.logger.error(`Error finding users by IDs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.userModel
        .findByIdAndUpdate(userId, { lastLogin: new Date() })
        .exec();
      
      this.logger.log(`Last login updated for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error updating last login: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Transform user document for response
   */
  private transformUser(user: any): User {
    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      addresses: user.addresses || [],
      preferences: user.preferences || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    } as User;
  }
}