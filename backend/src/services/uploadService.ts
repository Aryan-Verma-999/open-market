import AWS from 'aws-sdk';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'equipment-marketplace-uploads';
const CDN_URL = process.env.CDN_URL; // CloudFront or other CDN URL
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_PDF_TYPES = ['application/pdf'];

// Image size configurations
const IMAGE_SIZES = {
  thumbnail: { width: 300, height: 300, quality: 80 },
  small: { width: 600, height: 400, quality: 85 },
  medium: { width: 1200, height: 800, quality: 85 },
  large: { width: 1920, height: 1280, quality: 90 }
};

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  webpUrl?: string;
  webpKey?: string;
  sizes?: {
    small: { url: string; key: string };
    medium: { url: string; key: string };
    large: { url: string; key: string };
  };
}

export interface UploadOptions {
  folder?: string;
  generateThumbnail?: boolean;
  generateWebP?: boolean;
  generateSizes?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  enableCDN?: boolean;
}

class UploadService {
  /**
   * Validate file type and size
   */
  validateFile(file: Express.Multer.File, isImage: boolean = true): void {
    const allowedTypes = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_PDF_TYPES;
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_PDF_SIZE;

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }
  }

  /**
   * Generate unique file key for S3
   */
  generateFileKey(originalName: string, folder?: string): string {
    const ext = path.extname(originalName);
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const fileName = `${timestamp}-${uniqueId}${ext}`;
    
    return folder ? `${folder}/${fileName}` : fileName;
  }

  /**
   * Get CDN URL if available, otherwise return S3 URL
   */
  private getCDNUrl(s3Url: string): string {
    if (CDN_URL && s3Url.includes(BUCKET_NAME)) {
      // Replace S3 URL with CDN URL
      const key = s3Url.split(`${BUCKET_NAME}/`)[1];
      return `${CDN_URL}/${key}`;
    }
    return s3Url;
  }

  /**
   * Optimize and resize image with advanced options
   */
  async optimizeImage(
    buffer: Buffer,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'webp' | 'png';
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    } = {}
  ): Promise<Buffer> {
    const {
      width = 1920,
      height = 1280,
      quality = 85,
      format = 'jpeg',
      fit = 'inside'
    } = options;

    let sharpInstance = sharp(buffer)
      .resize(width, height, {
        fit,
        withoutEnlargement: true
      });

    // Apply format-specific optimizations
    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ 
          quality,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ 
          quality,
          effort: 6
        });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ 
          quality,
          compressionLevel: 9,
          progressive: true
        });
        break;
    }

    return await sharpInstance.toBuffer();
  }

  /**
   * Generate multiple image sizes
   */
  async generateImageSizes(buffer: Buffer): Promise<{
    small: Buffer;
    medium: Buffer;
    large: Buffer;
  }> {
    const [small, medium, large] = await Promise.all([
      this.optimizeImage(buffer, {
        width: IMAGE_SIZES.small.width,
        height: IMAGE_SIZES.small.height,
        quality: IMAGE_SIZES.small.quality
      }),
      this.optimizeImage(buffer, {
        width: IMAGE_SIZES.medium.width,
        height: IMAGE_SIZES.medium.height,
        quality: IMAGE_SIZES.medium.quality
      }),
      this.optimizeImage(buffer, {
        width: IMAGE_SIZES.large.width,
        height: IMAGE_SIZES.large.height,
        quality: IMAGE_SIZES.large.quality
      })
    ]);

    return { small, medium, large };
  }

  /**
   * Generate thumbnail from image
   */
  async generateThumbnail(buffer: Buffer): Promise<Buffer> {
    return await this.optimizeImage(buffer, {
      width: IMAGE_SIZES.thumbnail.width,
      height: IMAGE_SIZES.thumbnail.height,
      quality: IMAGE_SIZES.thumbnail.quality,
      fit: 'cover'
    });
  }

  /**
   * Generate WebP version of image
   */
  async generateWebP(buffer: Buffer, width?: number, height?: number): Promise<Buffer> {
    return await this.optimizeImage(buffer, {
      width: width || 1920,
      height: height || 1280,
      quality: 85,
      format: 'webp'
    });
  }

  /**
   * Upload file to S3 with optimized settings
   */
  async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string,
    options: {
      isPublic?: boolean;
      cacheControl?: string;
      metadata?: { [key: string]: string };
    } = {}
  ): Promise<string> {
    const {
      isPublic = true,
      cacheControl = 'public, max-age=31536000', // 1 year cache
      metadata = {}
    } = options;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: cacheControl,
      Metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString()
      }
    };

    if (isPublic) {
      params.ACL = 'public-read';
    }

    const result = await s3.upload(params).promise();
    return this.getCDNUrl(result.Location);
  }

  /**
   * Upload image with comprehensive optimization
   */
  async uploadImage(
    file: Express.Multer.File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    this.validateFile(file, true);

    const {
      folder = 'listings',
      generateThumbnail = true,
      generateWebP = true,
      generateSizes = false,
      maxWidth = 1920,
      maxHeight = 1280,
      quality = 85,
      enableCDN = true
    } = options;

    // Optimize main image
    const optimizedBuffer = await this.optimizeImage(file.buffer, {
      width: maxWidth,
      height: maxHeight,
      quality
    });

    // Generate file keys
    const baseFileName = path.parse(file.originalname).name;
    const mainKey = this.generateFileKey(`${baseFileName}.jpg`, folder);
    
    // Upload main image
    const url = await this.uploadToS3(optimizedBuffer, mainKey, 'image/jpeg', {
      metadata: {
        originalName: file.originalname,
        originalSize: file.size.toString(),
        optimized: 'true'
      }
    });

    const result: UploadResult = {
      url,
      key: mainKey,
      size: optimizedBuffer.length,
      mimeType: 'image/jpeg'
    };

    // Generate and upload thumbnail
    if (generateThumbnail) {
      const thumbnailKey = this.generateFileKey(`${baseFileName}_thumb.jpg`, `${folder}/thumbnails`);
      const thumbnailBuffer = await this.generateThumbnail(optimizedBuffer);
      const thumbnailUrl = await this.uploadToS3(thumbnailBuffer, thumbnailKey, 'image/jpeg');
      
      result.thumbnailUrl = thumbnailUrl;
      result.thumbnailKey = thumbnailKey;
    }

    // Generate and upload WebP version
    if (generateWebP) {
      const webpKey = this.generateFileKey(`${baseFileName}.webp`, `${folder}/webp`);
      const webpBuffer = await this.generateWebP(optimizedBuffer, maxWidth, maxHeight);
      const webpUrl = await this.uploadToS3(webpBuffer, webpKey, 'image/webp');
      
      result.webpUrl = webpUrl;
      result.webpKey = webpKey;
    }

    // Generate multiple sizes
    if (generateSizes) {
      const sizes = await this.generateImageSizes(optimizedBuffer);
      const sizeUploads = await Promise.all([
        this.uploadToS3(
          sizes.small,
          this.generateFileKey(`${baseFileName}_small.jpg`, `${folder}/sizes`),
          'image/jpeg'
        ),
        this.uploadToS3(
          sizes.medium,
          this.generateFileKey(`${baseFileName}_medium.jpg`, `${folder}/sizes`),
          'image/jpeg'
        ),
        this.uploadToS3(
          sizes.large,
          this.generateFileKey(`${baseFileName}_large.jpg`, `${folder}/sizes`),
          'image/jpeg'
        )
      ]);

      result.sizes = {
        small: { url: sizeUploads[0], key: `${folder}/sizes/${baseFileName}_small.jpg` },
        medium: { url: sizeUploads[1], key: `${folder}/sizes/${baseFileName}_medium.jpg` },
        large: { url: sizeUploads[2], key: `${folder}/sizes/${baseFileName}_large.jpg` }
      };
    }

    return result;
  }

  /**
   * Upload PDF document
   */
  async uploadDocument(
    file: Express.Multer.File,
    folder: string = 'documents'
  ): Promise<UploadResult> {
    this.validateFile(file, false);

    const key = this.generateFileKey(file.originalname, folder);
    const url = await this.uploadToS3(file.buffer, key, file.mimetype);

    return {
      url,
      key
    };
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
  }

  /**
   * Delete multiple files from S3
   */
  async deleteFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const params = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map(key => ({ Key: key }))
      }
    };

    await s3.deleteObjects(params).promise();
  }

  /**
   * Get signed URL for private file access
   */
  getSignedUrl(key: string, expiresIn: number = 3600): string {
    return s3.getSignedUrl('getObject', {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    });
  }
}

export const uploadService = new UploadService();