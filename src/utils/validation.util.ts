/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { isEmail, isPhoneNumber, isPostalCode } from 'class-validator';

@Injectable()
export class ValidationUtil {
  // Optimized: Precompiled regex patterns for better performance
  private readonly patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^\+?[\d\s\-\(\)]+$/,
    postalCode: /^[A-Z0-9\s\-]{3,10}$/i,
    name: /^[a-zA-Z\s\-'\.]{2,50}$/,
    address: /^[a-zA-Z0-9\s\-,\.#\/]{5,200}$/,
    strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  };

  // Optimized: Use Set for O(1) country code lookups
  private readonly validCountryCodes = new Set([
    'US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'AU', 'JP', 'CN', 'IN', 'BR',
    'MX', 'KR', 'SG', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
    'IE', 'PT', 'GR', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK',
    'LT', 'LV', 'EE', 'MT', 'CY', 'LU', 'IS', 'LI', 'AD', 'MC', 'SM',
    'VA', 'NZ', 'ZA', 'EG', 'MA', 'TN', 'KE', 'GH', 'NG', 'ET', 'TZ'
  ]);

  /**
   * Optimized email validation with regex first (faster than class-validator)
   * Time Complexity: O(1)
   */
  isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    
    const trimmedEmail = email.trim().toLowerCase();
    
    // Quick regex check first (faster)
    if (!this.patterns.email.test(trimmedEmail)) return false;
    
    // Additional validation for edge cases
    if (trimmedEmail.length > 254) return false;
    if (trimmedEmail.includes('..')) return false;
    
    return isEmail(trimmedEmail);
  }

  /**
   * Enhanced phone validation with country-specific rules
   * Time Complexity: O(1)
   */
  isValidPhone(phone: string, countryCode?: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    
    const cleanPhone = phone.replace(/\s/g, '');
    
    // Basic pattern check
    if (!this.patterns.phone.test(cleanPhone)) return false;
    
    // Length validation
    if (cleanPhone.length < 7 || cleanPhone.length > 15) return false;
    
    // Country-specific validation if provided
    if (countryCode && isPhoneNumber(phone, countryCode as any)) {
      return true;
    }
    
    return this.patterns.phone.test(cleanPhone);
  }

  /**
   * Optimized postal code validation
   * Time Complexity: O(1)
   */
  isValidPostalCode(postalCode: string, countryCode?: string): boolean {
    if (!postalCode || typeof postalCode !== 'string') return false;
    
    const cleanCode = postalCode.trim().toUpperCase();
    
    // Use class-validator for specific countries when available
    if (countryCode && isPostalCode(cleanCode, countryCode as any)) {
      return true;
    }
    
    return this.patterns.postalCode.test(cleanCode);
  }

  /**
   * Validate name fields
   * Time Complexity: O(1)
   */
  isValidName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    
    const trimmedName = name.trim();
    return this.patterns.name.test(trimmedName);
  }

  /**
   * Validate address fields
   * Time Complexity: O(1)
   */
  isValidAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    
    const trimmedAddress = address.trim();
    return this.patterns.address.test(trimmedAddress);
  }

  /**
   * Validate country code
   * Time Complexity: O(1)
   */
  isValidCountryCode(countryCode: string): boolean {
    if (!countryCode || typeof countryCode !== 'string') return false;
    
    return this.validCountryCodes.has(countryCode.toUpperCase());
  }

  /**
   * Comprehensive address validation
   * Time Complexity: O(1)
   */
  validateAddressObject(address: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.isValidName(address.firstName)) {
      errors.push('Invalid first name');
    }

    if (!this.isValidName(address.lastName)) {
      errors.push('Invalid last name');
    }

    if (!this.isValidCountryCode(address.country)) {
      errors.push('Invalid country code');
    }

    if (!this.isValidAddress(address.address)) {
      errors.push('Invalid address format');
    }

    if (!this.isValidPostalCode(address.postalCode, address.country)) {
      errors.push('Invalid postal code');
    }

    if (address.phone && !this.isValidPhone(address.phone, address.country)) {
      errors.push('Invalid phone number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize input to prevent XSS
   * Time Complexity: O(n) where n is string length
   */
  sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  }

  /**
   * Batch validation for performance
   * Time Complexity: O(n) where n is number of fields
   */
  validateBatch(validations: Array<{ value: any; validator: string; options?: any }>): {
    isValid: boolean;
    errors: Array<{ field: string; message: string }>;
  } {
    const errors: Array<{ field: string; message: string }> = [];

    validations.forEach((validation, index) => {
      const { value, validator, options } = validation;
      let isValid = false;

      switch (validator) {
        case 'email':
          isValid = this.isValidEmail(value);
          break;
        case 'phone':
          isValid = this.isValidPhone(value, options?.countryCode);
          break;
        case 'postalCode':
          isValid = this.isValidPostalCode(value, options?.countryCode);
          break;
        case 'name':
          isValid = this.isValidName(value);
          break;
        case 'address':
          isValid = this.isValidAddress(value);
          break;
        case 'countryCode':
          isValid = this.isValidCountryCode(value);
          break;
      }

      if (!isValid) {
        errors.push({
          field: options?.fieldName || `field_${index}`,
          message: `Invalid ${validator}`
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}