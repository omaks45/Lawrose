/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShippingOptionDocument = ShippingOption & Document;
export type ShippingRateDocument = ShippingRate & Document;

// Enum for shipping providers
export enum ShippingProvider {
  DHL_EXPRESS = 'dhl_express',
  FEDEX_INTERNATIONAL = 'fedex_international',
  STANDARD = 'standard'
}

// Enum for shipping service types
export enum ShippingServiceType {
  EXPRESS = 'express',
  PRIORITY = 'priority',
  STANDARD = 'standard',
  ECONOMY = 'economy'
}

@Schema({
  timestamps: true,
  collection: 'shipping_options',
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
})
export class ShippingOption {
  @Prop({ 
    required: true,
    enum: ShippingProvider,
    index: true
  })
  provider: ShippingProvider;

  @Prop({ 
    required: true,
    trim: true,
    maxlength: 100
  })
  name: string;

  @Prop({ 
    required: true,
    trim: true,
    maxlength: 200
  })
  description: string;

  @Prop({ 
    required: true,
    enum: ShippingServiceType
  })
  serviceType: ShippingServiceType;

  @Prop({ 
    required: true,
    min: 0
  })
  basePrice: number; // in kobo (Nigerian currency base unit)

  @Prop({ 
    required: true,
    trim: true,
    uppercase: true
  })
  currency: string; // 'NGN'

  @Prop({ 
    required: true,
    min: 1,
    max: 30
  })
  estimatedDays: number;

  @Prop({ 
    required: true,
    min: 1,
    max: 30
  })
  maxDeliveryDays: number;

  @Prop({
    type: {
      minWeight: { type: Number, required: true, min: 0 },
      maxWeight: { type: Number, required: true, min: 0 },
      pricePerKg: { type: Number, required: true, min: 0 }
    },
    required: true
  })
  weightPricing: {
    minWeight: number; // in kg
    maxWeight: number; // in kg
    pricePerKg: number; // additional cost per kg in kobo
  };

  @Prop({
    type: [String],
    default: []
  })
  supportedCountries: string[]; // ISO country codes

  @Prop({
    type: [String],
    default: []
  })
  excludedCountries: string[]; // ISO country codes

  @Prop({ 
    default: true,
    index: true
  })
  isActive: boolean;

  @Prop({ 
    default: false
  })
  requiresSignature: boolean;

  @Prop({ 
    default: true
  })
  trackingAvailable: boolean;

  @Prop({
    type: {
      maxLength: { type: Number, default: 100 },
      maxWidth: { type: Number, default: 100 },
      maxHeight: { type: Number, default: 100 }
    },
    default: () => ({})
  })
  dimensionLimits: {
    maxLength?: number; // in cm
    maxWidth?: number; // in cm
    maxHeight?: number; // in cm
  };

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ShippingOptionSchema = SchemaFactory.createForClass(ShippingOption);

// Indexes for better query performance
ShippingOptionSchema.index({ provider: 1, isActive: 1 });
ShippingOptionSchema.index({ serviceType: 1 });
ShippingOptionSchema.index({ supportedCountries: 1 });

// Schema for shipping rate calculations
@Schema({
  timestamps: true,
  collection: 'shipping_rates',
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
})
export class ShippingRate {
  @Prop({ 
    type: Types.ObjectId,
    ref: 'ShippingOption',
    required: true,
    index: true
  })
  shippingOptionId: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ShippingProvider
  })
  provider: ShippingProvider;

  @Prop({ 
    required: true,
    trim: true
  })
  serviceName: string;

  @Prop({ 
    required: true,
    min: 0
  })
  totalCost: number; // in kobo

  @Prop({ 
    required: true,
    min: 0
  })
  baseCost: number; // in kobo

  @Prop({ 
    required: true,
    min: 0
  })
  weightCost: number; // in kobo

  @Prop({ 
    required: true,
    trim: true,
    uppercase: true
  })
  currency: string; // 'NGN'

  @Prop({ 
    required: true,
    min: 1
  })
  estimatedDays: number;

  @Prop({ 
    required: true,
    min: 1
  })
  maxDeliveryDays: number;

  @Prop({
    type: {
      weight: { type: Number, required: true },
      length: Number,
      width: Number,
      height: Number
    },
    required: true
  })
  packageDetails: {
    weight: number; // in kg
    length?: number; // in cm
    width?: number; // in cm
    height?: number; // in cm
  };

  @Prop({
    type: {
      country: { type: String, required: true },
      state: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true }
    },
    required: true
  })
  destinationAddress: {
    country: string;
    state: string;
    city: string;
    postalCode: string;
  };

  @Prop({ 
    default: true
  })
  trackingAvailable: boolean;

  @Prop()
  trackingNumber?: string;

  @Prop()
  carrierTrackingUrl?: string;

  @Prop({ 
    default: Date.now,
    expires: 3600 // Cache for 1 hour
  })
  calculatedAt: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ShippingRateSchema = SchemaFactory.createForClass(ShippingRate);

// Indexes for shipping rates
ShippingRateSchema.index({ shippingOptionId: 1, calculatedAt: -1 });
ShippingRateSchema.index({ provider: 1 });
ShippingRateSchema.index({ 'destinationAddress.country': 1 });
ShippingRateSchema.index({ calculatedAt: 1 }, { expireAfterSeconds: 3600 }); // TTL index

// Instance methods for ShippingOption
// eslint-disable-next-line @typescript-eslint/no-unused-vars
ShippingOptionSchema.methods.calculateRate = function(weight: number, destination: any): number {
  let totalCost = this.basePrice;
  
  // Add weight-based pricing
  if (weight > this.weightPricing.minWeight) {
    const additionalWeight = weight - this.weightPricing.minWeight;
    totalCost += additionalWeight * this.weightPricing.pricePerKg;
  }
  
  return totalCost;
};

ShippingOptionSchema.methods.isAvailableForCountry = function(countryCode: string): boolean {
  // If no specific countries listed, assume available everywhere
  if (this.supportedCountries.length === 0 && this.excludedCountries.length === 0) {
    return true;
  }
  
  // Check if country is excluded
  if (this.excludedCountries.includes(countryCode)) {
    return false;
  }
  
  // If supported countries are specified, check if country is in the list
  if (this.supportedCountries.length > 0) {
    return this.supportedCountries.includes(countryCode);
  }
  
  return true;
};

ShippingOptionSchema.methods.validatePackageDimensions = function(length: number, width: number, height: number): boolean {
  const limits = this.dimensionLimits;
  
  if (!limits.maxLength && !limits.maxWidth && !limits.maxHeight) {
    return true; // No dimension limits
  }
  
  return (
    (!limits.maxLength || length <= limits.maxLength) &&
    (!limits.maxWidth || width <= limits.maxWidth) &&
    (!limits.maxHeight || height <= limits.maxHeight)
  );
};

// Instance methods for ShippingRate
ShippingRateSchema.methods.getFormattedPrice = function(): string {
  return `₦${(this.totalCost / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
};

ShippingRateSchema.methods.getDeliveryWindow = function(): string {
  if (this.estimatedDays === this.maxDeliveryDays) {
    return `${this.estimatedDays} days`;
  }
  return `${this.estimatedDays}-${this.maxDeliveryDays} days`;
};

ShippingRateSchema.methods.isExpired = function(): boolean {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return this.calculatedAt < oneHourAgo;
};