import { useState, useEffect } from 'react';
import { dashboardService, BuyerDashboardData } from '@/services/dashboardService';
import { StatsCard } from './StatsCard';
import { SavedListingCard } from './SavedListingCard';
import { MessageCard } from './MessageCard';
import { QuoteStatusCard } from './QuoteStatusCard';

export function BuyerDashboard() {
  const [dashboardData, setDashboardData] = useState<BuyerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getBuyerDashboard();
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

  const { statistics, savedListings, recentMessages, quotesByStatus } = dashboardData;

  return (
    <div className="space-y-8">
      {/* Statistics Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Saved Items"
            value={statistics.totalSavedItems.toString()}
            icon="❤️"
          />
          <StatsCard
            title="Messages Sent"
            value={statistics.totalMessages.toString()}
            icon="💬"
          />
          <StatsCard
            title="Quotes Sent"
            value={statistics.totalQuotes.toString()}
            icon="💰"
            subtitle={`${statistics.pendingQuotes} pending`}
          />
          <StatsCard
            title="Accepted Quotes"
            value={statistics.acceptedQuotes.toString()}
            icon="✅"
            subtitle={`${statistics.rejectedQuotes} rejected`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Saved Listings */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">Saved Items</h2>
              <a href="/browse" className="btn btn-primary">Browse More</a>
            </div>
            
            <div className="space-y-4">
              {savedListings.length > 0 ? (
                savedListings.map((listing) => (
                  <SavedListingCard key={listing.id} listing={listing} onRemove={loadDashboardData} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No saved items</p>
                  <a href="/browse" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
                    Start browsing equipment
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quote Status */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quote Status</h2>
            <div className="space-y-3">
              {quotesByStatus.map((status) => (
                <QuoteStatusCard 
                  key={status.quoteStatus} 
                  status={status.quoteStatus} 
                  count={status._count.id} 
                />
              ))}
            </div>
            <a href="/dashboard/quotes" className="block text-center text-primary-600 text-sm mt-4 hover:text-primary-700">
              View All Quotes
            </a>
          </div>

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
        </div>
      </div>
    </div>
  );
}