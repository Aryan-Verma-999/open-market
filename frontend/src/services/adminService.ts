import { api } from './api';

export interface ModerationStats {
  pendingListings: number;
  pendingReports: number;
  totalUsers: number;
  verifiedUsers: number;
  totalListings: number;
  activeListings: number;
}

export interface PendingListing {
  id: string;
  title: string;
  price: number;
  condition: string;
  status: string;
  createdAt: string;
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    kycStatus: string;
    trustScore: number;
  };
  category: {
    name: string;
  };
}

export interface Report {
  id: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  listing?: {
    id: string;
    title: string;
    status: string;
    seller: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export interface UserForVerification {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  kycStatus: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  trustScore: number;
  createdAt: string;
  city: string;
  state: string;
}

export interface ModerationLog {
  id: string;
  action: string;
  reason?: string;
  adminNotes?: string;
  createdAt: string;
  admin: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  listing?: {
    id: string;
    title: string;
    status: string;
  };
  report?: {
    id: string;
    reason: string;
    status: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    kycStatus: string;
  };
}

export interface ContentCheckResult {
  listingId: string;
  checks: {
    titleValidation: {
      passed: boolean;
      issues: string[];
      severity: string;
    };
    descriptionValidation: {
      passed: boolean;
      issues: string[];
      severity: string;
    };
    priceValidation: {
      passed: boolean;
      issues: string[];
      severity: string;
    };
    duplicateCheck: {
      passed: boolean;
      issues: string[];
      severity: string;
    };
  };
  overallScore: number;
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  listing: {
    title: string;
    description: string;
    price: number;
    seller: {
      name: string;
      trustScore: number;
      kycStatus: string;
    };
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

class AdminService {
  /**
   * Get moderation dashboard statistics
   */
  async getStats(): Promise<{ success: boolean; data: ModerationStats }> {
    const response = await api.get('/admin/stats');
    return response.data;
  }

  /**
   * Get pending listings for moderation
   */
  async getPendingListings(page: number = 1, limit: number = 20): Promise<{ 
    success: boolean; 
    data: PaginatedResponse<PendingListing> 
  }> {
    const response = await api.get(`/admin/listings/pending?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Moderate a listing (approve/reject)
   */
  async moderateListing(
    listingId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string,
    adminNotes?: string
  ): Promise<{ success: boolean; data: any; message: string }> {
    const response = await api.post(`/admin/listings/${listingId}/moderate`, {
      action,
      reason,
      adminNotes
    });
    return response.data;
  }

  /**
   * Bulk approve listings
   */
  async bulkApproveListings(listingIds: string[]): Promise<{
    success: boolean;
    data: {
      results: Array<{ listingId: string; success: boolean; error?: string }>;
      summary: { total: number; successful: number; failed: number };
    };
    message: string;
  }> {
    const response = await api.post('/admin/listings/bulk-approve', {
      listingIds
    });
    return response.data;
  }

  /**
   * Get flagged content and reports
   */
  async getReports(page: number = 1, limit: number = 20): Promise<{
    success: boolean;
    data: PaginatedResponse<Report>;
  }> {
    const response = await api.get(`/admin/reports?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Handle report (resolve/dismiss)
   */
  async handleReport(
    reportId: string,
    action: 'RESOLVE' | 'DISMISS',
    adminNotes?: string
  ): Promise<{ success: boolean; data: any; message: string }> {
    const response = await api.post(`/admin/reports/${reportId}/handle`, {
      action,
      adminNotes
    });
    return response.data;
  }

  /**
   * Get users pending verification
   */
  async getUsersForVerification(page: number = 1, limit: number = 20): Promise<{
    success: boolean;
    data: PaginatedResponse<UserForVerification>;
  }> {
    const response = await api.get(`/admin/users/verification?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Update user verification status
   */
  async updateUserVerification(
    userId: string,
    kycStatus: 'VERIFIED' | 'REJECTED',
    reason?: string,
    trustBadge?: boolean
  ): Promise<{ success: boolean; data: any; message: string }> {
    const response = await api.post(`/admin/users/${userId}/verify`, {
      kycStatus,
      reason,
      trustBadge
    });
    return response.data;
  }

  /**
   * Get automated content check results
   */
  async getContentCheckResults(listingId: string): Promise<{
    success: boolean;
    data: ContentCheckResult;
  }> {
    const response = await api.get(`/admin/listings/${listingId}/content-check`);
    return response.data;
  }

  /**
   * Get moderation activity logs
   */
  async getModerationLogs(page: number = 1, limit: number = 50): Promise<{
    success: boolean;
    data: PaginatedResponse<ModerationLog>;
  }> {
    const response = await api.get(`/admin/logs?page=${page}&limit=${limit}`);
    return response.data;
  }
}

export const adminService = new AdminService();