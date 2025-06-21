/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema({ 
  _id: true,
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
})
export class Address {
  _id?: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ['shipping', 'billing'],
    index: true
  })
  type: 'shipping' | 'billing';

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
    required: true,
    trim: true,
    uppercase: true,
    minlength: 2,
    maxlength: 3
  })
  country: string;

  @Prop({ 
    required: true,
    trim: true,
    maxlength: 100
  })
  state: string;

  @Prop({ 
    required: true,
    trim: true,
    maxlength: 100
  })
  city: string;

  @Prop({ 
    required: true,
    trim: true,
    maxlength: 200
  })
  address: string;

  @Prop({ 
    required: true,
    trim: true,
    match: [/^[A-Za-z0-9\s\-]{3,10}$/, 'Please enter a valid postal code']
  })
  postalCode: string;

  @Prop({ 
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  })
  phone?: string;

  @Prop({ 
    default: false,
    index: true
  })
  isDefault: boolean;

  @Prop({ 
    default: true,
    index: true
  })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Indexes
AddressSchema.index({ type: 1, isDefault: 1 });
AddressSchema.index({ isActive: 1 });
AddressSchema.index({ country: 1 });

// Virtual for full name
AddressSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for formatted address
AddressSchema.virtual('formatted').get(function() {
  return `${this.address}, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`;
});

// Pre-save middleware to ensure only one default address per type
AddressSchema.pre('save', function(next) {
  if (this.isDefault && this.$parent) {
    const parent = this.$parent as any;
    if (parent && parent.addresses) {
      parent.addresses.forEach((addr: Address) => {
        if (addr.type === this.type && addr._id?.toString() !== this._id?.toString()) {
          addr.isDefault = false;
        }
      });
    }
  }
  next();
});

// Instance methods
AddressSchema.methods.toShippingFormat = function() {
  return {
    name: this.fullName,
    address1: this.address,
    city: this.city,
    state: this.state,
    postalCode: this.postalCode,
    country: this.country,
    phone: this.phone
  };
};

AddressSchema.methods.validate = function(): boolean {
  const requiredFields = ['firstName', 'lastName', 'country', 'state', 'city', 'address', 'postalCode'];
  return requiredFields.every(field => this[field] && this[field].trim().length > 0);
};