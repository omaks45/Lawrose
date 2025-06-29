/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AddressSchema, Address } from './address.schema';

export type UserDocument = User & Document;

@Schema({ 
  timestamps: true,
  collection: 'users',
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.emailVerificationToken;
      return ret;
    }
  }
})
export class User {
  @Prop({ 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  })
  email: string;

  @Prop({ 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  })
  firstName: string;

  @Prop({ 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  })
  lastName: string;

  @Prop({ 
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  })
  phone?: string;

  @Prop({ 
    default: false,
    index: true
  })
  emailVerified: boolean;

  @Prop({ 
    select: false // Don't include in queries by default
  })
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  @Prop({ 
    default: true,
    index: true
  })
  isActive: boolean;

  @Prop()
  lastLogin?: Date;

  @Prop({ 
    type: [AddressSchema],
    default: []
  })
  addresses: Address[];

  @Prop({
    type: {
      defaultShippingAddress: { 
        type: Types.ObjectId,
        ref: 'Address'
      },
      preferredShippingMethod: {
        type: String,
        enum: ['dhl_express', 'fedex_international', 'standard'],
        default: 'dhl_express'
      },
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: false
      }
    },
    default: () => ({})
  })
  preferences: {
    defaultShippingAddress?: Types.ObjectId;
    preferredShippingMethod?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
  };

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
  id: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'addresses._id': 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware
UserSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.emailVerified = false;
  }
  next();
});

// Instance methods
UserSchema.methods.getDefaultShippingAddress = function(): Address | null {
  return this.addresses.find((addr: Address) => addr.isDefault && addr.type === 'shipping') || null;
};

UserSchema.methods.addAddress = function(addressData: Partial<Address>): void {
  this.addresses.push(addressData as Address);
};

UserSchema.methods.updateAddress = function(addressId: string, updateData: Partial<Address>): boolean {
  const addressIndex = this.addresses.findIndex(addr => addr._id?.toString() === addressId);
  if (addressIndex !== -1) {
    Object.assign(this.addresses[addressIndex], updateData);
    return true;
  }
  return false;
};