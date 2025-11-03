import sharp from 'sharp';
import { prisma } from '@/lib/database';

// Simple profanity word list (in production, use a more comprehensive service)
const PROFANITY_WORDS = [
  'spam', 'scam', 'fake', 'fraud', 'cheat', 'steal', 'stolen',
  // Add more words as needed
];

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface ImageValidationResult extends ValidationResult {
  imageInfo?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

class ContentValidationService {
  /**
   * Validate image quality and content
   */
  async validateImage(buffer: Buffer): Promise<ImageValidationResult> {
    const issues: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      const imageInfo = {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length
      };

      // Check minimum dimensions
      if (imageInfo.width < 300 || imageInfo.height < 300) {
        issues.push('Image resolution is too low (minimum 300x300 pixels)');
        severity = 'medium';
      }

      // Check maximum dimensions (very large images might be suspicious)
      if (imageInfo.width > 5000 || imageInfo.height > 5000) {
        issues.push('Image resolution is unusually high');
        severity = 'low';
      }

      // Check aspect ratio (extremely wide or tall images might be banners/spam)
      const aspectRatio = imageInfo.width / imageInfo.height;
      if (aspectRatio > 5 || aspectRatio < 0.2) {
        issues.push('Unusual image aspect ratio detected');
        severity = 'medium';
      }

      // Check file size
      if (buffer.length < 10000) { // Less than 10KB
        issues.push('Image file size is suspiciously small');
        severity = 'medium';
      }

      // Basic image corruption check
      try {
        await image.jpeg().toBuffer();
      } catch (error) {
        issues.push('Image appears to be corrupted or invalid');
        severity = 'high';
      }

      return {
        isValid: issues.length === 0 || severity === 'low',
        issues,
        severity,
        imageInfo
      };
    } catch (error) {
      return {
        isValid: false,
        issues: ['Failed to process image'],
        severity: 'high'
      };
    }
  }

  /**
   * Validate text content for profanity and spam
   */
  validateText(text: string): ValidationResult {
    const issues: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (!text || text.trim().length === 0) {
      return {
        isValid: false,
        issues: ['Text content is empty'],
        severity: 'high'
      };
    }

    const lowerText = text.toLowerCase();

    // Check for profanity
    const foundProfanity = PROFANITY_WORDS.filter(word => 
      lowerText.includes(word.toLowerCase())
    );

    if (foundProfanity.length > 0) {
      issues.push(`Potentially inappropriate content detected: ${foundProfanity.join(', ')}`);
      severity = 'high';
    }

    // Check for excessive capitalization (spam indicator)
    const capitalLetters = text.match(/[A-Z]/g) || [];
    const totalLetters = text.match(/[A-Za-z]/g) || [];
    if (totalLetters.length > 0 && capitalLetters.length / totalLetters.length > 0.5) {
      issues.push('Excessive use of capital letters detected');
      severity = 'medium';
    }

    // Check for excessive punctuation (spam indicator)
    const punctuation = text.match(/[!?]{2,}/g);
    if (punctuation && punctuation.length > 3) {
      issues.push('Excessive punctuation detected');
      severity = 'medium';
    }

    // Check for repeated characters (spam indicator)
    const repeatedChars = text.match(/(.)\1{4,}/g);
    if (repeatedChars && repeatedChars.length > 0) {
      issues.push('Repeated character patterns detected');
      severity = 'medium';
    }

    // Check for phone numbers in inappropriate places (basic pattern)
    const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phoneMatches = text.match(phonePattern);
    if (phoneMatches && phoneMatches.length > 2) {
      issues.push('Multiple phone numbers detected');
      severity = 'low';
    }

    // Check for email addresses in inappropriate places
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = text.match(emailPattern);
    if (emailMatches && emailMatches.length > 1) {
      issues.push('Multiple email addresses detected');
      severity = 'low';
    }

    // Check for URLs (might be spam)
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urlMatches = text.match(urlPattern);
    if (urlMatches && urlMatches.length > 0) {
      issues.push('External URLs detected');
      severity = 'medium';
    }

    // Check text length
    if (text.length < 20) {
      issues.push('Description is too short');
      severity = 'medium';
    }

    if (text.length > 5000) {
      issues.push('Description is unusually long');
      severity = 'low';
    }

    return {
      isValid: issues.length === 0 || severity === 'low',
      issues,
      severity
    };
  }

  /**
   * Validate listing title
   */
  validateTitle(title: string): ValidationResult {
    const issues: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (!title || title.trim().length === 0) {
      return {
        isValid: false,
        issues: ['Title is required'],
        severity: 'high'
      };
    }

    const trimmedTitle = title.trim();

    // Check title length
    if (trimmedTitle.length < 5) {
      issues.push('Title is too short (minimum 5 characters)');
      severity = 'high';
    }

    if (trimmedTitle.length > 100) {
      issues.push('Title is too long (maximum 100 characters)');
      severity = 'medium';
    }

    // Check for profanity
    const textValidation = this.validateText(trimmedTitle);
    if (!textValidation.isValid) {
      issues.push(...textValidation.issues);
      if (textValidation.severity === 'high') {
        severity = 'high';
      } else if (textValidation.severity === 'medium' && severity !== 'high') {
        severity = 'medium';
      }
    }

    // Check for all caps (spam indicator)
    if (trimmedTitle === trimmedTitle.toUpperCase() && trimmedTitle.length > 10) {
      issues.push('Title should not be in all capital letters');
      severity = 'medium';
    }

    return {
      isValid: issues.length === 0 || severity === 'low',
      issues,
      severity
    };
  }

  /**
   * Validate price
   */
  validatePrice(price: number): ValidationResult {
    const issues: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (price <= 0) {
      issues.push('Price must be greater than 0');
      severity = 'high';
    }

    if (price > 10000000) { // 10 million
      issues.push('Price seems unusually high');
      severity = 'medium';
    }

    if (price < 1) {
      issues.push('Price seems unusually low');
      severity = 'medium';
    }

    return {
      isValid: issues.length === 0 || severity === 'low',
      issues,
      severity
    };
  }

  /**
   * Comprehensive listing validation
   */
  async validateListing(data: {
    title: string;
    description: string;
    price: number;
    images?: Buffer[];
  }): Promise<{
    isValid: boolean;
    issues: string[];
    severity: 'low' | 'medium' | 'high';
    details: {
      title: ValidationResult;
      description: ValidationResult;
      price: ValidationResult;
      images: ImageValidationResult[];
    };
  }> {
    const titleValidation = this.validateTitle(data.title);
    const descriptionValidation = this.validateText(data.description);
    const priceValidation = this.validatePrice(data.price);
    
    const imageValidations: ImageValidationResult[] = [];
    if (data.images) {
      for (const imageBuffer of data.images) {
        const imageValidation = await this.validateImage(imageBuffer);
        imageValidations.push(imageValidation);
      }
    }

    // Collect all issues
    const allIssues: string[] = [
      ...titleValidation.issues,
      ...descriptionValidation.issues,
      ...priceValidation.issues,
      ...imageValidations.flatMap(iv => iv.issues)
    ];

    // Determine overall severity
    let overallSeverity: 'low' | 'medium' | 'high' = 'low';
    const validations = [titleValidation, descriptionValidation, priceValidation, ...imageValidations];
    
    for (const validation of validations) {
      if (validation.severity === 'high') {
        overallSeverity = 'high';
        break;
      } else if (validation.severity === 'medium' && overallSeverity === 'low') {
        overallSeverity = 'medium';
      }
    }

    // Check if we have minimum required images
    if (!data.images || data.images.length < 3) {
      allIssues.push('Minimum 3 images required');
      if (overallSeverity !== 'high') {
        overallSeverity = 'medium';
      }
    }

    return {
      isValid: allIssues.length === 0 || overallSeverity === 'low',
      issues: allIssues,
      severity: overallSeverity,
      details: {
        title: titleValidation,
        description: descriptionValidation,
        price: priceValidation,
        images: imageValidations
      }
    };
  }

  /**
   * Check for duplicate content (basic implementation)
   */
  async checkForDuplicates(
    title: string,
    description: string,
    sellerId: string
  ): Promise<ValidationResult> {
    const issues: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    try {
      // Check for similar titles from the same seller
      const similarListings = await prisma.listing.findMany({
        where: {
          sellerId,
          title: {
            contains: title.substring(0, 20), // Check first 20 characters
            mode: 'insensitive'
          },
          isActive: true
        },
        select: { id: true, title: true }
      });

      if (similarListings.length > 0) {
        issues.push('Similar listing title found from the same seller');
        severity = 'medium';
      }

      // Check for exact description matches
      const exactDescriptionMatch = await prisma.listing.findFirst({
        where: {
          description: {
            equals: description,
            mode: 'insensitive'
          },
          isActive: true
        }
      });

      if (exactDescriptionMatch) {
        issues.push('Identical description found in another listing');
        severity = 'high';
      }

    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // Don't fail validation due to database errors
    }

    return {
      isValid: issues.length === 0 || severity === 'low',
      issues,
      severity
    };
  }
}

export const contentValidationService = new ContentValidationService();