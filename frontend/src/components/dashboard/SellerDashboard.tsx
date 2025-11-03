import { useState, useEffect } from 'react';
import { dashboardService, SellerDashboardData } from '@/services/dashboardService';
import { StatsCard } from './StatsCard';
import { ListingCard } from './ListingCard';
import { MessageCard } from './MessageCard';
import { QuoteCard } from './QuoteCard';

export function SellerDashboard() {
  const [dashboardData, setDashboardData] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getSellerDashboard();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadDashboardData}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { statistics, listings, recentMessages, quotes } = dashboardData;

  return (
    <div className="space-y-8">
      {/* Statistics Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Views"
            value={statistics.totalViews.toLocaleString()}
            icon="👁️"
            trend="+12%"
          />
          <StatsCard
            title="Active Listings"
            value={statistics.activeListings.toString()}
            icon="📦"
            subtitle={`${statistics.totalListings} total`}
          />
          <StatsCard
            title="Messages"
            value={statistics.totalMessages.toString()}
            icon="💬"
            trend="+5%"
          />
          <StatsCard
            title="Conversion Rate"
            value={`${statistics.conversionRate}%`}
            icon="📈"
            subtitle={`${statistics.soldListings} sold`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Listings */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">My Listings</h2>
              <a href="/sell" className="btn btn-primary">Create New Listing</a>
            </div>
            
            <div className="space-y-4">
              {listings.length > 0 ? (
                listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No listings found</p>
                  <a href="/sell" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
                    Create your first listing
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Messages */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Messages</h2>
            <div className="space-y-3">
              {recentMessages.length > 0 ? (
                recentMessages.map((message) => (
                  <MessageCard key={message.id} message={message} />
                ))
              ) : (
                <p className="text-gray-500 text-sm">No recent messages</p>
              )}
            </div>
            <a href="/messages" className="block text-center text-primary-600 text-sm mt-4 hover:text-primary-700">
              View All Messages
            </a>
          </div>

          {/* Recent Quotes */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Quotes</h2>
            <div className="space-y-3">
              {quotes.length > 0 ? (
                quotes.slice(0, 3).map((quote) => (
                  <QuoteCard key={quote.id} quote={quote} onStatusUpdate={loadDashboardData} />
                ))
              ) : (
                <p className="text-gray-500 text-sm">No recent quotes</p>
              )}
            </div>
            <a href="/dashboard/quotes" className="block text-center text-primary-600 text-sm mt-4 hover:text-primary-700">
              View All Quotes
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}