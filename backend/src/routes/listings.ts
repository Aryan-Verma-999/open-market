import express from 'express';
import { listingService } from '@/services/listingService';
import { searchService } from '@/services/searchService';
import { contentValidationService } from '@/services/contentValidationService';
import { uploadListingFiles, handleUploadError } from '@/middleware/upload';
import { authenticateToken } from '@/middleware/auth';
import { Condition, ListingStatus } from '@prisma/client';

const router = express.Router();

/**
 * Create a new listing
 * POST /api/listings
 */
router.post('/', authenticateToken, uploadListingFiles, handleUploadError, async (req: any, res: any) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const {
      title,
      categoryId,
      brand,
      model,
      year,
      condition,
      price,
      negotiable,
      description,
      specifications,
      city,
      state,
      latitude,
      longitude,
      pickupOnly,
      canArrangeShipping
    } = req.body;

    // Validate required fields
    if (!title || !categoryId || !condition || !price || !description || !city || !state) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Title, category, condition, price, description, city, and state are required'
        }
      });
    }

    // Validate condition enum
    if (!Object.values(Condition).includes(condition)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CONDITION',
          message: 'Invalid condition value'
        }
      });
    }

    // Validate price
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PRICE',
          message: 'Price must be a positive number'
        }
      });
    }

    // Get uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const images = files?.images || [];
    const documents = files?.documents || [];

    // Validate minimum images requirement
    if (images.length < 3) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_IMAGES',
          message: 'Minimum 3 images are required'
        }
      });
    }

    // Perform content validation
    const validationResult = await contentValidationService.validateListing({
      title,
      description,
      price: numericPrice,
      images: images.map(img => img.buffer)
    });

    // Check for duplicates
    const duplicateCheck = await contentValidationService.checkForDuplicates(
      title,
      description,
      sellerId
    );

    // Combine validation results
    const allIssues = [...validationResult.issues, ...duplicateCheck.issues];
    const highestSeverity = validationResult.severity === 'high' || duplicateCheck.severity === 'high' 
      ? 'high' 
      : validationResult.severity === 'medium' || duplicateCheck.severity === 'medium'
      ? 'medium'
      : 'low';

    // If validation fails with high severity, reject the listing
    if (highestSeverity === 'high') {
      return res.status(400).json({
        error: {
          code: 'CONTENT_VALIDATION_FAILED',
          message: 'Listing content failed validation',
          details: allIssues
        }
      });
    }

    // Create listing data
    const listingData = {
      title,
      categoryId,
      brand,
      model,
      year: year ? parseInt(year) : undefined,
      condition,
      price: numericPrice,
      negotiable: negotiable === 'true' || negotiable === true,
      description,
      specifications: specifications ? JSON.parse(specifications) : undefined,
      city,
      state,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      pickupOnly: pickupOnly === 'true' || pickupOnly === true,
      canArrangeShipping: canArrangeShipping !== 'false' && canArrangeShipping !== false
    };

    // Create the listing
    const listing = await listingService.createListing(sellerId, listingData, {
      images,
      documents
    });

    res.status(201).json({
      success: true,
      data: listing,
      validation: {
        issues: allIssues,
        severity: highestSeverity
      }
    });
  } catch (error: any) {
    console.error('Error creating listing:', error);
    res.status(500).json({
      error: {
        code: 'LISTING_CREATION_FAILED',
        message: error.message || 'Failed to create listing'
      }
    });
  }
});

/**
 * Get listings with filters and pagination
 * GET /api/listings
 * Note: For advanced search, use /api/search endpoint
 */
router.get('/', async (req, res) => {
  try {
    const {
      categoryId,
      condition,
      minPrice,
      maxPrice,
      city,
      state,
      sellerId,
      status,
      search,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PAGE',
          message: 'Page must be a positive integer'
        }
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 100'
        }
      });
    }

    // Validate sort order
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      return res.status(400).json({
        error: {
          code: 'INVALID_SORT_ORDER',
          message: 'Sort order must be "asc" or "desc"'
        }
      });
    }

    // If there's a search query or complex filters, use the search service
    if (search || (categoryId && (minPrice || maxPrice || condition))) {
      const filters: any = {};
      
      if (search) filters.query = search as string;
      if (categoryId) filters.categoryId = categoryId as string;
      if (condition && Object.values(Condition).includes(condition as Condition)) {
        filters.condition = condition as Condition;
      }
      if (minPrice) {
        const min = parseFloat(minPrice as string);
        if (!isNaN(min)) filters.minPrice = min;
      }
      if (maxPrice) {
        const max = parseFloat(maxPrice as string);
        if (!isNaN(max)) filters.maxPrice = max;
      }
      if (city) filters.city = city as string;
      if (state) filters.state = state as string;
      if (sellerId) filters.sellerId = sellerId as string;
      if (status && Object.values(ListingStatus).includes(status as ListingStatus)) {
        filters.status = status as ListingStatus;
      }

      const options = {
        page: pageNum,
        limit: limitNum,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await searchService.searchListings(filters, options);
      
      res.json({
        success: true,
        data: result
      });
    } else {
      // Use the original listing service for simple queries
      const filters: any = {};

      if (categoryId) filters.categoryId = categoryId as string;
      if (condition && Object.values(Condition).includes(condition as Condition)) {
        filters.condition = condition as Condition;
      }
      if (minPrice) {
        const min = parseFloat(minPrice as string);
        if (!isNaN(min)) filters.minPrice = min;
      }
      if (maxPrice) {
        const max = parseFloat(maxPrice as string);
        if (!isNaN(max)) filters.maxPrice = max;
      }
      if (city) filters.city = city as string;
      if (state) filters.state = state as string;
      if (sellerId) filters.sellerId = sellerId as string;
      if (status && Object.values(ListingStatus).includes(status as ListingStatus)) {
        filters.status = status as ListingStatus;
      }

      const result = await listingService.getListings(
        filters,
        pageNum,
        limitNum,
        sortBy as string,
        sortOrder as 'asc' | 'desc'
      );

      res.json({
        success: true,
        data: result
      });
    }
  } catch (error: any) {
    console.error('Error fetching listings:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_LISTINGS_FAILED',
        message: error.message || 'Failed to fetch listings'
      }
    });
  }
});

/**
 * Get listing by ID
 * GET /api/listings/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { incrementViews = 'true' } = req.query;

    const listing = await listingService.getListingById(
      id,
      incrementViews === 'true'
    );

    if (!listing) {
      return res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found'
        }
      });
    }

    res.json({
      success: true,
      data: listing
    });
  } catch (error: any) {
    console.error('Error fetching listing:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_LISTING_FAILED',
        message: error.message || 'Failed to fetch listing'
      }
    });
  }
});

/**
 * Update listing
 * PUT /api/listings/:id
 */
router.put('/:id', authenticateToken, uploadListingFiles, handleUploadError, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const sellerId = req.user?.id;

    if (!sellerId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const {
      title,
      categoryId,
      brand,
      model,
      year,
      condition,
      price,
      negotiable,
      description,
      specifications,
      city,
      state,
      latitude,
      longitude,
      pickupOnly,
      canArrangeShipping,
      status
    } = req.body;

    // Build update data
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (brand !== undefined) updateData.brand = brand;
    if (model !== undefined) updateData.model = model;
    if (year !== undefined) updateData.year = year ? parseInt(year) : null;
    if (condition !== undefined) {
      if (!Object.values(Condition).includes(condition)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CONDITION',
            message: 'Invalid condition value'
          }
        });
      }
      updateData.condition = condition;
    }
    if (price !== undefined) {
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PRICE',
            message: 'Price must be a positive number'
          }
        });
      }
      updateData.price = numericPrice;
    }
    if (negotiable !== undefined) updateData.negotiable = negotiable === 'true' || negotiable === true;
    if (description !== undefined) updateData.description = description;
    if (specifications !== undefined) {
      updateData.specifications = specifications ? JSON.parse(specifications) : null;
    }
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    if (pickupOnly !== undefined) updateData.pickupOnly = pickupOnly === 'true' || pickupOnly === true;
    if (canArrangeShipping !== undefined) {
      updateData.canArrangeShipping = canArrangeShipping !== 'false' && canArrangeShipping !== false;
    }
    if (status !== undefined) {
      if (!Object.values(ListingStatus).includes(status)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid status value'
          }
        });
      }
      updateData.status = status;
    }

    // Get uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const images = files?.images || [];
    const documents = files?.documents || [];

    // Update the listing
    const listing = await listingService.updateListing(id, sellerId, updateData, {
      images,
      documents
    });

    res.json({
      success: true,
      data: listing
    });
  } catch (error: any) {
    console.error('Error updating listing:', error);
    
    if (error.message === 'Listing not found') {
      return res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found'
        }
      });
    }

    if (error.message === 'Unauthorized to update this listing') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to update this listing'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'LISTING_UPDATE_FAILED',
        message: error.message || 'Failed to update listing'
      }
    });
  }
});

/**
 * Delete listing
 * DELETE /api/listings/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user?.id;

    if (!sellerId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    await listingService.deleteListing(id, sellerId);

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting listing:', error);
    
    if (error.message === 'Listing not found') {
      return res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found'
        }
      });
    }

    if (error.message === 'Unauthorized to delete this listing') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to delete this listing'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'LISTING_DELETE_FAILED',
        message: error.message || 'Failed to delete listing'
      }
    });
  }
});

/**
 * Remove specific files from listing
 * DELETE /api/listings/:id/files
 */
router.delete('/:id/files', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user?.id;
    const { images, documents } = req.body;

    if (!sellerId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!images && !documents) {
      return res.status(400).json({
        error: {
          code: 'NO_FILES_SPECIFIED',
          message: 'No files specified for removal'
        }
      });
    }

    const listing = await listingService.removeListingFiles(id, sellerId, {
      images,
      documents
    });

    res.json({
      success: true,
      data: listing
    });
  } catch (error: any) {
    console.error('Error removing listing files:', error);
    
    if (error.message === 'Listing not found') {
      return res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found'
        }
      });
    }

    if (error.message === 'Unauthorized to modify this listing') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to modify this listing'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'FILE_REMOVAL_FAILED',
        message: error.message || 'Failed to remove files'
      }
    });
  }
});

/**
 * Update listing status (admin only)
 * PATCH /api/listings/:id/status
 */
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Check if user is admin (you might want to add role checking middleware)
    // For now, we'll allow any authenticated user to update status
    // In production, add proper admin role checking

    if (!status || !Object.values(ListingStatus).includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Valid status is required'
        }
      });
    }

    const listing = await listingService.updateListingStatus(id, status, adminId);

    res.json({
      success: true,
      data: listing
    });
  } catch (error: any) {
    console.error('Error updating listing status:', error);
    res.status(500).json({
      error: {
        code: 'STATUS_UPDATE_FAILED',
        message: error.message || 'Failed to update listing status'
      }
    });
  }
});

export default router;