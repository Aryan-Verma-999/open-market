import { api } from './api';

export interface DashboardStats {
  totalViews: number;
  totalMessages: number;
  totalSaves: number;
  totalListings: number;
  activeListings: number;
  soldListings: number;
  conversionRate: string;
}

export interface SellerDashboardData {
  statistics: DashboardStats;
  listings: any[];
  recentMessages: any[];
  quotes: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BuyerDashboardData {
  statistics: {
    totalSavedItems: number;
    totalMessages: number;
    totalQuotes: number;
    pendingQuotes: number;
    acceptedQuotes: number;
    rejectedQuotes: number;
  };
  savedListings: any[];
  recentMessages: any[];
  quotesByStatus: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListingAnalytics {
  listing: {
    id: string;
    title: string;
    price: number;
    status: string;
    createdAt: string;
  };
  analytics: {
    views: number;
    saves: number;
    messages: number;
    quotes: number;
    uniqueViewers: number;
    conversionRate: string;
    saveRate: string;
  };
  recentMessages: any[];
}

export interface QuotesResponse {
  quotes: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class DashboardService {
  /**
   * Get seller dashboard data
   */
  async getSellerDashboard(page: number = 1, limit: number = 10): Promise<SellerDashboardData> {
    const response = await api.get(`/dashboard/seller?page=${page}&limit=${limit}`);
    return response.data.data;
  }

  /**
   * Get buyer dashboard data
   */
  async getBuyerDashboard(page: number = 1, limit: number = 10): Promise<BuyerDashboardData> {
    const response = await api.get(`/dashboard/buyer?page=${page}&limit=${limit}`);
    return response.data.data;
  }

  /**
   * Get detailed analytics for a specific listing
   */
  async getListingAnalytics(listingId: string): Promise<ListingAnalytics> {
    const response = await api.get(`/dashboard/analytics/${listingId}`);
    return response.data.data;
  }

  /**
   * Get all quotes (sent and received)
   */
  async getQuotes(
    type: 'all' | 'sent' | 'received' = 'all',
    status?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<QuotesResponse> {
    const params = new URLSearchParams({
      type,
      page: page.toString(),
      limit: limit.toString()
    });

    if (status && status !== 'all') {
      params.append('status', status);
    }

    const response = await api.get(`/dashboard/quotes?${params}`);
    return response.data.data;
  }

  /**
   * Update quote status
   */
  async updateQuoteStatus(
    quoteId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'COUNTERED',
    counterAmount?: number,
    counterTerms?: string
  ): Promise<any> {
    const response = await api.put(`/dashboard/quotes/${quoteId}/status`, {
      status,
      counterAmount,
      counterTerms
    });
    return response.data.data;
  }

  /**
   * Get user profile for dashboard
   */
  async getUserProfile(): Promise<any> {
    const response = await api.get('/auth/me');
    return response.data.user;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(profileData: any): Promise<any> {
    const response = await api.put('/users/profile', profileData);
    return response.data.data.user;
  }

  /**
   * Submit KYC verification
   */
  async submitKYCVerification(documents: any[]): Promise<any> {
    const response = await api.post('/users/kyc-verification', { documents });
    return response.data.data.user;
  }
}

export const dashboardService = new DashboardService();