import Joi from 'joi';

/**
 * Validation schemas for API requests
 */

// User validation schemas
export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'any.required': 'Phone number is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required',
  }),
  company: Joi.string().max(100).optional(),
  role: Joi.string().valid('BUYER', 'SELLER', 'BOTH').default('BOTH'),
  city: Joi.string().min(2).max(50).required().messages({
    'any.required': 'City is required',
  }),
  state: Joi.string().min(2).max(50).required().messages({
    'any.required': 'State is required',
  }),
  pincode: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'Please provide a valid 6-digit pincode',
    'any.required': 'Pincode is required',
  }),
});

export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const userUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  company: Joi.string().max(100).optional(),
  city: Joi.string().min(2).max(50).optional(),
  state: Joi.string().min(2).max(50).optional(),
  pincode: Joi.string().pattern(/^\d{6}$/).optional(),
});

// Listing validation schemas
export const listingCreateSchema = Joi.object({
  title: Joi.string().min(10).max(200).required().messages({
    'string.min': 'Title must be at least 10 characters long',
    'string.max': 'Title cannot exceed 200 characters',
    'any.required': 'Title is required',
  }),
  categoryId: Joi.string().required().messages({
    'any.required': 'Category is required',
  }),
  brand: Joi.string().max(50).optional(),
  model: Joi.string().max(50).optional(),
  year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
  condition: Joi.string().valid('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR').required().messages({
    'any.required': 'Condition is required',
  }),
  price: Joi.number().positive().required().messages({
    'number.positive': 'Price must be a positive number',
    'any.required': 'Price is required',
  }),
  negotiable: Joi.boolean().default(true),
  description: Joi.string().min(50).max(2000).required().messages({
    'string.min': 'Description must be at least 50 characters long',
    'string.max': 'Description cannot exceed 2000 characters',
    'any.required': 'Description is required',
  }),
  specifications: Joi.object().optional(),
  city: Joi.string().min(2).max(50).required().messages({
    'any.required': 'City is required',
  }),
  state: Joi.string().min(2).max(50).required().messages({
    'any.required': 'State is required',
  }),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  pickupOnly: Joi.boolean().default(false),
  canArrangeShipping: Joi.boolean().default(true),
});

export const listingUpdateSchema = Joi.object({
  title: Joi.string().min(10).max(200).optional(),
  brand: Joi.string().max(50).optional(),
  model: Joi.string().max(50).optional(),
  year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
  condition: Joi.string().valid('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR').optional(),
  price: Joi.number().positive().optional(),
  negotiable: Joi.boolean().optional(),
  description: Joi.string().min(50).max(2000).optional(),
  specifications: Joi.object().optional(),
  pickupOnly: Joi.boolean().optional(),
  canArrangeShipping: Joi.boolean().optional(),
  status: Joi.string().valid('DRAFT', 'PENDING', 'LIVE', 'SOLD', 'EXPIRED').optional(),
});

// Message validation schemas
export const messageCreateSchema = Joi.object({
  receiverId: Joi.string().required().messages({
    'any.required': 'Receiver ID is required',
  }),
  listingId: Joi.string().required().messages({
    'any.required': 'Listing ID is required',
  }),
  content: Joi.string().min(1).max(1000).required().messages({
    'string.min': 'Message cannot be empty',
    'string.max': 'Message cannot exceed 1000 characters',
    'any.required': 'Message content is required',
  }),
  messageType: Joi.string().valid('TEXT', 'QUOTE', 'SYSTEM').default('TEXT'),
  quoteAmount: Joi.number().positive().when('messageType', {
    is: 'QUOTE',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  quoteTerms: Joi.string().max(500).when('messageType', {
    is: 'QUOTE',
    then: Joi.optional(),
    otherwise: Joi.optional(),
  }),
});

export const quoteResponseSchema = Joi.object({
  quoteStatus: Joi.string().valid('ACCEPTED', 'REJECTED', 'COUNTERED').required(),
  counterAmount: Joi.number().positive().when('quoteStatus', {
    is: 'COUNTERED',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  counterTerms: Joi.string().max(500).optional(),
});

// Search and filter validation schemas
export const listingSearchSchema = Joi.object({
  query: Joi.string().max(100).optional(),
  categoryId: Joi.string().optional(),
  condition: Joi.array().items(Joi.string().valid('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR')).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  negotiable: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sortBy: Joi.string().valid('relevance', 'price_asc', 'price_desc', 'date_desc', 'date_asc').default('relevance'),
});

// Report validation schema
export const reportCreateSchema = Joi.object({
  listingId: Joi.string().optional(),
  userId: Joi.string().optional(),
  reason: Joi.string().valid('SPAM', 'INAPPROPRIATE_CONTENT', 'FAKE_LISTING', 'FRAUD', 'OTHER').required(),
  description: Joi.string().max(500).optional(),
}).or('listingId', 'userId').messages({
  'object.missing': 'Either listing ID or user ID must be provided',
});

// Review validation schema
export const reviewCreateSchema = Joi.object({
  rateeId: Joi.string().required().messages({
    'any.required': 'User to review is required',
  }),
  orderId: Joi.string().optional(),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be between 1 and 5',
    'number.max': 'Rating must be between 1 and 5',
    'any.required': 'Rating is required',
  }),
  comment: Joi.string().max(500).optional(),
});

// Pagination validation
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

/**
 * Validation middleware factory
 */
export function validateRequest(schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: errors,
          timestamp: new Date().toISOString(),
        },
      });
    }

    req[property] = value;
    next();
  };
}