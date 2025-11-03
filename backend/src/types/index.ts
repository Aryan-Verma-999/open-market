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
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
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
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
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
  readAt?: Date;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description: string;
  iconUrl?: string;
  listingCount: number;
  isActive: boolean;
}

export interface SavedListing {
  id: string;
  userId: string;
  listingId: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  raterId: string;
  rateeId: string;
  orderId?: string;
  rating: number;
  comment?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  listingId?: string;
  userId?: string;
  reason: 'SPAM' | 'INAPPROPRIATE_CONTENT' | 'FAKE_LISTING' | 'FRAUD' | 'OTHER';
  description?: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  agreedPrice: number;
  escrowStatus: 'INITIATED' | 'PAYMENT_PENDING' | 'PAYMENT_RECEIVED' | 'GOODS_SHIPPED' | 'GOODS_DELIVERED' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED';
  paymentMethod?: string;
  shippingAddress?: Record<string, any>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'MESSAGE' | 'QUOTE' | 'LISTING_APPROVED' | 'LISTING_REJECTED' | 'ORDER_UPDATE' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}