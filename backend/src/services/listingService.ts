import { prisma } from '@/lib/database';
import { uploadService, UploadResult } from './uploadService';
import { Listing, ListingStatus, Condition } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateListingData {
  title: string;
  categoryId: string;
  brand?: string;
  model?: string;
  year?: number;
  condition: Condition;
  price: number;
  negotiable?: boolean;
  description: string;
  specifications?: any;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  pickupOnly?: boolean;
  canArrangeShipping?: boolean;
}

export interface UpdateListingData extends Partial<CreateListingData> {
  status?: ListingStatus;
}

export interface ListingFilters {
  categoryId?: string;
  condition?: Condition;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  state?: string;
  sellerId?: string;
  status?: ListingStatus;
  search?: string;
}

export interface ListingWithDetails extends Listing {
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    company?: string;
    city: string;
    state: string;
    trustScore: number;
    kycStatus: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  _count: {
    messages: number;
    savedBy: number;
  };
}

class ListingService {
  /**
   * Create a new listing
   */
  async createListing(
    sellerId: string,
    data: CreateListingData,
    files?: {
      images?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    }
  ): Promise<Listing> {
    // Validate seller exists
    const seller = await prisma.user.findUnique({
      where: { id: sellerId }
    });

    if (!seller) {
      throw new Error('Seller not found');
    }

    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    let imageUrls: string[] = [];
    let documentUrls: string[] = [];

    try {
      // Upload images if provided
      if (files?.images && files.images.length > 0) {
        const imageUploads = await Promise.all(
          files.images.map(file => 
            uploadService.uploadImage(file, {
              folder: 'listings/images',
              generateThumbnail: true
            })
          )
        );
        imageUrls = imageUploads.map(upload => upload.url);
      }

      // Upload documents if provided
      if (files?.documents && files.documents.length > 0) {
        const documentUploads = await Promise.all(
          files.documents.map(file =>
            uploadService.uploadDocument(file, 'listings/documents')
          )
        );
        documentUrls = documentUploads.map(upload => upload.url);
      }

      // Create listing in database
      const listing = await prisma.listing.create({
        data: {
          sellerId,
          title: data.title,
          categoryId: data.categoryId,
          brand: data.brand,
          model: data.model,
          year: data.year,
          condition: data.condition,
          price: new Decimal(data.price),
          negotiable: data.negotiable ?? true,
          description: data.description,
          specifications: data.specifications,
          images: imageUrls,
          documents: documentUrls,
          city: data.city,
          state: data.state,
          latitude: data.latitude,
          longitude: data.longitude,
          pickupOnly: data.pickupOnly ?? false,
          canArrangeShipping: data.canArrangeShipping ?? true,
          status: ListingStatus.PENDING, // All listings start as pending for review
        }
      });

      return listing;
    } catch (error) {
      // Clean up uploaded files if listing creation fails
      if (imageUrls.length > 0 || documentUrls.length > 0) {
        try {
          const allUrls = [...imageUrls, ...documentUrls];
          const keys = allUrls.map(url => {
            const urlParts = url.split('/');
            return urlParts.slice(-2).join('/'); // Get folder/filename part
          });
          await uploadService.deleteFiles(keys);
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded files:', cleanupError);
        }
      }
      throw error;
    }
  }

  /**
   * Update an existing listing
   */
  async updateListing(
    listingId: string,
    sellerId: string,
    data: UpdateListingData,
    files?: {
      images?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    }
  ): Promise<Listing> {
    // Get existing listing
    const existingListing = await prisma.listing.findUnique({
      where: { id: listingId }
    });

    if (!existingListing) {
      throw new Error('Listing not found');
    }

    if (existingListing.sellerId !== sellerId) {
      throw new Error('Unauthorized to update this listing');
    }

    // Validate category if provided
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId }
      });

      if (!category) {
        throw new Error('Category not found');
      }
    }

    let newImageUrls: string[] = [];
    let newDocumentUrls: string[] = [];

    try {
      // Upload new images if provided
      if (files?.images && files.images.length > 0) {
        const imageUploads = await Promise.all(
          files.images.map(file => 
            uploadService.uploadImage(file, {
              folder: 'listings/images',
              generateThumbnail: true
            })
          )
        );
        newImageUrls = imageUploads.map(upload => upload.url);
      }

      // Upload new documents if provided
      if (files?.documents && files.documents.length > 0) {
        const documentUploads = await Promise.all(
          files.documents.map(file =>
            uploadService.uploadDocument(file, 'listings/documents')
          )
        );
        newDocumentUrls = documentUploads.map(upload => upload.url);
      }

      // Prepare update data
      const updateData: any = {
        ...data,
        updatedAt: new Date()
      };

      if (data.price !== undefined) {
        updateData.price = new Decimal(data.price);
      }

      // Add new files to existing ones (don't replace unless explicitly requested)
      if (newImageUrls.length > 0) {
        updateData.images = [...existingListing.images, ...newImageUrls];
      }

      if (newDocumentUrls.length > 0) {
        updateData.documents = [...existingListing.documents, ...newDocumentUrls];
      }

      // Update listing
      const updatedListing = await prisma.listing.update({
        where: { id: listingId },
        data: updateData
      });

      return updatedListing;
    } catch (error) {
      // Clean up newly uploaded files if update fails
      if (newImageUrls.length > 0 || newDocumentUrls.length > 0) {
        try {
          const allUrls = [...newImageUrls, ...newDocumentUrls];
          const keys = allUrls.map(url => {
            const urlParts = url.split('/');
            return urlParts.slice(-2).join('/');
          });
          await uploadService.deleteFiles(keys);
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded files:', cleanupError);
        }
      }
      throw error;
    }
  }

  /**
   * Delete a listing
   */
  async deleteListing(listingId: string, sellerId: string): Promise<void> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new Error('Unauthorized to delete this listing');
    }

    // Delete associated files from S3
    const allUrls = [...listing.images, ...listing.documents];
    if (allUrls.length > 0) {
      try {
        const keys = allUrls.map(url => {
          const urlParts = url.split('/');
          return urlParts.slice(-2).join('/');
        });
        await uploadService.deleteFiles(keys);
      } catch (error) {
        console.error('Failed to delete files from S3:', error);
        // Continue with database deletion even if S3 cleanup fails
      }
    }

    // Delete listing from database
    await prisma.listing.delete({
      where: { id: listingId }
    });
  }

  /**
   * Get listing by ID with full details
   */
  async getListingById(listingId: string, incrementViews: boolean = false): Promise<ListingWithDetails | null> {
    // Increment view count if requested
    if (incrementViews) {
      await prisma.listing.update({
        where: { id: listingId },
        data: { views: { increment: 1 } }
      });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            city: true,
            state: true,
            trustScore: true,
            kycStatus: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            messages: true,
            savedBy: true
          }
        }
      }
    });

    return listing as ListingWithDetails | null;
  }

  /**
   * Get listings with filters and pagination
   */
  async getListings(
    filters: ListingFilters = {},
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{
    listings: ListingWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isActive: true
    };

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.condition) {
      where.condition = filters.condition;
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) {
        where.price.gte = new Decimal(filters.minPrice);
      }
      if (filters.maxPrice) {
        where.price.lte = new Decimal(filters.maxPrice);
      }
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.state) {
      where.state = filters.state;
    }

    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    if (filters.status) {
      where.status = filters.status;
    } else {
      // Default to only show live listings for public queries
      where.status = ListingStatus.LIVE;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const total = await prisma.listing.count({ where });

    // Get listings
    const listings = await prisma.listing.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            city: true,
            state: true,
            trustScore: true,
            kycStatus: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            messages: true,
            savedBy: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit
    });

    return {
      listings: listings as ListingWithDetails[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update listing status (for admin/moderation)
   */
  async updateListingStatus(
    listingId: string,
    status: ListingStatus,
    adminId?: string
  ): Promise<Listing> {
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: { 
        status,
        updatedAt: new Date()
      }
    });

    // TODO: Send notification to seller about status change
    
    return listing;
  }

  /**
   * Remove specific images or documents from a listing
   */
  async removeListingFiles(
    listingId: string,
    sellerId: string,
    filesToRemove: {
      images?: string[];
      documents?: string[];
    }
  ): Promise<Listing> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new Error('Unauthorized to modify this listing');
    }

    let updatedImages = listing.images;
    let updatedDocuments = listing.documents;
    const filesToDelete: string[] = [];

    // Remove specified images
    if (filesToRemove.images) {
      updatedImages = listing.images.filter((url: string) => !filesToRemove.images!.includes(url));
      filesToDelete.push(...filesToRemove.images);
    }

    // Remove specified documents
    if (filesToRemove.documents) {
      updatedDocuments = listing.documents.filter((url: string) => !filesToRemove.documents!.includes(url));
      filesToDelete.push(...filesToRemove.documents);
    }

    // Update listing in database
    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        images: updatedImages,
        documents: updatedDocuments,
        updatedAt: new Date()
      }
    });

    // Delete files from S3
    if (filesToDelete.length > 0) {
      try {
        const keys = filesToDelete.map(url => {
          const urlParts = url.split('/');
          return urlParts.slice(-2).join('/');
        });
        await uploadService.deleteFiles(keys);
      } catch (error) {
        console.error('Failed to delete files from S3:', error);
        // Don't throw error as database update was successful
      }
    }

    return updatedListing;
  }
}

export const listingService = new ListingService();