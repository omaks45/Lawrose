/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
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
      const userData = {
        ...createUserDto,
        email: createUserDto.email.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdUser = new this.userModel(userData);
      const savedUser = await createdUser.save();
      this.logger.log(`User created with ID: ${savedUser._id}`);
      return this.transformUser(savedUser.toJSON());
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk create users
   */
  async bulkCreate(createUserDtos: CreateUserDto[]): Promise<User[]> {
    try {
      const userData = createUserDtos.map(dto => ({
        ...dto,
        email: dto.email.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const createdUsers = await this.userModel.insertMany(userData, { 
        ordered: false,
        rawResult: false 
      });

      this.logger.log(`Bulk created ${createdUsers.length} users`);
      return createdUsers.map(user => this.transformUser(user.toJSON()));
    } catch (error) {
      this.logger.error(`Error bulk creating users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find one user by flexible criteria
   */
  async findOne(criteria: FilterQuery<UserDocument>): Promise<User | null> {
    try {
      // Normalize email criteria if provided
      if (criteria.email) {
        criteria.email = criteria.email.toLowerCase();
      }

      const user = await this.userModel
        .findOne(criteria)
        .select('-emailVerificationToken -__v')
        .lean()
        .exec();

      return user ? this.transformUser(user) : null;
    } catch (error) {
      this.logger.error(`Error finding user with criteria: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find users by multiple emails
   */
  async findByEmails(emails: string[]): Promise<User[]> {
    try {
      if (!emails || emails.length === 0) {
        return [];
      }

      // Normalize emails to lowercase
      const normalizedEmails = emails.map(email => email.toLowerCase());

      const users = await this.userModel
        .find({ 
          email: { $in: normalizedEmails },
          isActive: true 
        })
        .select('-emailVerificationToken -__v')
        .lean()
        .exec();

      this.logger.log(`Found ${users.length} users from ${emails.length} email(s)`);
      return users.map(user => this.transformUser(user));
    } catch (error) {
      this.logger.error(`Error finding users by emails: ${error.message}`, error.stack);
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
        .select('-emailVerificationToken -__v')
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
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }

      const user = await this.userModel
        .findOne({ _id: id, isActive: true })
        .select('-emailVerificationToken -__v')
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
      return await this.findOne({ 
        email: email.toLowerCase(), 
        isActive: true 
      });
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
        .select('+emailVerificationToken +verificationToken +resetPasswordToken')
        .exec();
    } catch (error) {
      this.logger.error(`Error finding user by email with auth: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find user by verification token
   */
  async findByVerificationToken(token: string): Promise<User | null> {
    try {
      return await this.findOne({ 
        verificationToken: token,
        emailVerified: false 
      });
    } catch (error) {
      this.logger.error(`Error finding user by verification token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find user by reset password token
   */
  async findByResetPasswordToken(token: string): Promise<User | null> {
    try {
      return await this.findOne({ 
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      });
    } catch (error) {
      this.logger.error(`Error finding user by reset password token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto | Partial<User>): Promise<User | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }

      // Normalize email if being updated
      const updateData = { ...updateUserDto } as any;
      if (updateData.email) {
        updateData.email = updateData.email.toLowerCase();
      }
      updateData.updatedAt = new Date();

      const updatedUser = await this.userModel
        .findOneAndUpdate(
          { _id: id, isActive: true },
          { $set: updateData },
          { new: true, runValidators: true }
        )
        .select('-emailVerificationToken -__v')
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
   * Bulk update users
   */
  async bulkUpdate(
    filter: FilterQuery<UserDocument>, 
    updateData: Partial<User>
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    try {
      const update = { 
        ...updateData, 
        updatedAt: new Date() 
      };

      const result = await this.userModel
        .updateMany(filter, { $set: update })
        .exec();

      this.logger.log(`Bulk updated ${result.modifiedCount} users`);
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      this.logger.error(`Error bulk updating users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Soft delete user (mark as inactive)
   */
  async softDelete(id: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return false;
      }

      const result = await this.userModel
        .findOneAndUpdate(
          { _id: id, isActive: true },
          { 
            $set: { 
              isActive: false,
              updatedAt: new Date()
            } 
          },
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
   * Restore soft deleted user
   */
  async restore(id: string): Promise<User | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }

      const restoredUser = await this.userModel
        .findOneAndUpdate(
          { _id: id, isActive: false },
          { 
            $set: { 
              isActive: true,
              updatedAt: new Date()
            } 
          },
          { new: true }
        )
        .select('-emailVerificationToken -__v')
        .lean()
        .exec();

      if (restoredUser) {
        this.logger.log(`User restored with ID: ${id}`);
        return this.transformUser(restoredUser);
      }

      return null;
    } catch (error) {
      this.logger.error(`Error restoring user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Hard delete user (permanent deletion)
   */
  async hardDelete(id: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return false;
      }

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
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      const addressWithId = {
        ...addressData,
        _id: new Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedUser = await this.userModel
        .findOneAndUpdate(
          { _id: userId, isActive: true },
          { 
            $push: { addresses: addressWithId },
            $set: { updatedAt: new Date() }
          },
          { new: true, runValidators: true }
        )
        .select('-emailVerificationToken -__v')
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
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(addressId)) {
        throw new Error('Invalid ID format');
      }

      const setFields = Object.keys(updateData).reduce((acc, key) => {
        acc[`addresses.$.${key}`] = updateData[key];
        return acc;
      }, {} as any);

      setFields['addresses.$.updatedAt'] = new Date();
      setFields['updatedAt'] = new Date();

      const updatedUser = await this.userModel
        .findOneAndUpdate(
          { 
            _id: userId, 
            isActive: true,
            'addresses._id': addressId
          },
          { $set: setFields },
          { new: true, runValidators: true }
        )
        .select('-emailVerificationToken -__v')
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
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(addressId)) {
        throw new Error('Invalid ID format');
      }

      const updatedUser = await this.userModel
        .findOneAndUpdate(
          { _id: userId, isActive: true },
          { 
            $pull: { addresses: { _id: addressId } },
            $set: { updatedAt: new Date() }
          },
          { new: true }
        )
        .select('-emailVerificationToken -__v')
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
   * Search users by criteria with enhanced filtering
   */
  async search(
    criteria: FilterQuery<UserDocument> | {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      emailVerified?: boolean;
      isActive?: boolean;
      $or?: any[];
      [key: string]: any;
    },
    skip: number = 0,
    limit: number = 10
  ): Promise<User[]> {
    try {
      const query: FilterQuery<UserDocument> = { 
        isActive: criteria.isActive ?? true 
      };

      // Handle different types of criteria
      Object.keys(criteria).forEach(key => {
        if (key === 'isActive') return; // Already handled

        const value = criteria[key];
        
        if (key === 'email' && typeof value === 'string') {
          query.email = new RegExp(value, 'i');
        } else if (key === 'firstName' && typeof value === 'string') {
          query.firstName = new RegExp(value, 'i');
        } else if (key === 'lastName' && typeof value === 'string') {
          query.lastName = new RegExp(value, 'i');
        } else if (key === 'phone' && typeof value === 'string') {
          query.phone = new RegExp(value, 'i');
        } else if (key === 'emailVerified' && typeof value === 'boolean') {
          query.emailVerified = value;
        } else {
          // For other criteria, use direct assignment
          query[key] = value;
        }
      });

      const users = await this.userModel
        .find(query)
        .select('-emailVerificationToken -__v')
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
  async count(criteria: FilterQuery<UserDocument> = {}): Promise<number> {
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
      if (!ids || ids.length === 0) {
        return [];
      }

      // Validate and convert to ObjectIds
      const validIds = ids.filter(id => Types.ObjectId.isValid(id));
      if (validIds.length === 0) {
        return [];
      }

      const objectIds = validIds.map(id => new Types.ObjectId(id));
      const users = await this.userModel
        .find({ _id: { $in: objectIds }, isActive: true })
        .select('-emailVerificationToken -__v')
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
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      await this.userModel
        .findByIdAndUpdate(
          userId, 
          { 
            lastLogin: new Date(),
            updatedAt: new Date()
          }
        )
        .exec();
      
      this.logger.log(`Last login updated for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error updating last login: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
  }> {
    try {
      const [total, active, verified] = await Promise.all([
        this.userModel.countDocuments({}).exec(),
        this.userModel.countDocuments({ isActive: true }).exec(),
        this.userModel.countDocuments({ emailVerified: true }).exec()
      ]);

      return {
        total,
        active,
        inactive: total - active,
        verified,
        unverified: total - verified
      };
    } catch (error) {
      this.logger.error(`Error getting user stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      const query: FilterQuery<UserDocument> = { 
        email: email.toLowerCase() 
      };

      if (excludeUserId && Types.ObjectId.isValid(excludeUserId)) {
        query._id = { $ne: excludeUserId };
      }

      const user = await this.userModel.findOne(query).select('_id').lean().exec();
      return !!user;
    } catch (error) {
      this.logger.error(`Error checking email existence: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Transform user document for response
   */
  private transformUser(user: any): User {
    if (!user) return null;

    return {
      id: user._id?.toString() || user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      emailVerified: user.emailVerified || false,
      emailVerifiedAt: user.emailVerifiedAt,
      isActive: user.isActive !== false,
      lastLogin: user.lastLogin,
      addresses: user.addresses || [],
      preferences: user.preferences || {},
      avatar: user.avatar,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      timezone: user.timezone,
      language: user.language,
      verificationToken: user.verificationToken,
      resetPasswordToken: user.resetPasswordToken,
      resetPasswordExpires: user.resetPasswordExpires,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    } as User;
  }
}