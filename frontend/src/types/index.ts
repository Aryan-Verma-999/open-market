export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: 'BUYER' | 'SELLER' | 'BOTH' | 'ADMIN';
  company?: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  phoneVerified: boolean;
  emailVerified: boolean;
  city: string;
  state: string;
  pincode: string;
  trustScore: number;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
  children?: Category[];
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  categoryId: string;
  brand?: string;
  model?: string;
  year?: number;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
  price: number;
  negotiable: boolean;
  description: string;
  specifications?: Record<string, any>;
  images: string[];
  documents: string[];
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  pickupOnly: boolean;
  canArrangeShipping: boolean;
  status: 'DRAFT' | 'PENDING' | 'LIVE' | 'SOLD' | 'EXPIRED' | 'REJECTED';
  views: number;
  saves: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  seller?: User;
  category?: Category;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  listingId: string;
  content: string;
  attachments: string[];
  messageType: 'TEXT' | 'QUOTE' | 'SYSTEM';
  quoteAmount?: number;
  quoteTerms?: string;
  quoteStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  readAt?: string;
  createdAt: string;
  sender?: User;
  receiver?: User;
  listing?: Listing;
}

export interface SavedListing {
  id: string;
  userId: string;
  listingId: string;
  createdAt: string;
  listing?: Listing;
}

export interface Review {
  id: string;
  raterId: string;
  rateeId: string;
  orderId?: string;
  rating: number;
  comment?: string;
  isActive: boolean;
  createdAt: string;
  rater?: User;
  ratee?: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'MESSAGE' | 'QUOTE' | 'LISTING_APPROVED' | 'LISTING_REJECTED' | 'ORDER_UPDATE' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export interface SearchFilters {
  query?: string;
  categoryId?: string;
  condition?: string[];
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  state?: string;
  negotiable?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  role: 'BUYER' | 'SELLER' | 'BOTH';
  city: string;
  state: string;
  pincode: string;
}

export interface CreateListingData {
  title: string;
  categoryId: string;
  brand?: string;
  model?: string;
  year?: number;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
  price: number;
  negotiable: boolean;
  description: string;
  specifications?: Record<string, any>;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  pickupOnly: boolean;
  canArrangeShipping: boolean;
}

export interface SendMessageData {
  receiverId: string;
  listingId: string;
  content: string;
  messageType?: 'TEXT' | 'QUOTE';
  quoteAmount?: number;
  quoteTerms?: string;
}