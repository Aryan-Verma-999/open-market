import { useState, useEffect } from 'react';
import { dashboardService, QuotesResponse } from '@/services/dashboardService';
import { QuoteCard } from '@/components/dashboard/QuoteCard';

export function QuotesPage() {
  const [quotes, setQuotes] = useState<QuotesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'sent' | 'received',
    status: 'all',
    page: 1
  });

  useEffect(() => {
    loadQuotes();
  }, [filters]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getQuotes(
        filters.type,
        filters.status === 'all' ? undefined : filters.status,
        filters.page
      );
      setQuotes(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'COUNTERED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Quotes Management</h1>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Quotes</option>
              <option value="received">Received</option>
              <option value="sent">Sent</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="COUNTERED">Countered</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={loadQuotes}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      ) : quotes ? (
        <div>
          {quotes.quotes.length > 0 ? (
            <div className="space-y-6">
              {/* Quotes List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quotes.quotes.map((quote) => (
                  <div key={quote.id} className="card p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {filters.type === 'sent' ? 
                            `${quote.receiver.firstName} ${quote.receiver.lastName}` :
                            `${quote.sender.firstName} ${quote.sender.lastName}`
                          }
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {quote.listing.title}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(quote.quoteStatus)}`}>
                        {quote.quoteStatus}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{quote.quoteAmount?.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Original: ₹{quote.listing.price?.toLocaleString()}
                      </p>
                    </div>

                    {quote.quoteTerms && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          <strong>Terms:</strong> {quote.quoteTerms}
                        </p>
                      </div>
                    )}

                    <div className="mb-4">
                      <p className="text-xs text-gray-500">
                        {new Date(quote.createdAt).toLocaleDateString()} at{' '}
                        {new Date(quote.createdAt).toLocaleTimeString()}
                      </p>
                    </div>

                    {/* Actions for received quotes */}
                    {filters.type !== 'sent' && quote.quoteStatus === 'PENDING' && (
                      <QuoteCard quote={quote} onStatusUpdate={loadQuotes} />
                    )}

                    <div className="flex gap-2 mt-4">
                      <a 
                        href={`/listings/${quote.listing.id}`}
                        className="btn btn-outline text-sm flex-1"
                      >
                        View Listing
                      </a>
                      <a 
                        href={`/messages?conversation=${quote.conversationId}`}
                        className="btn btn-primary text-sm flex-1"
                      >
                        Message
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {quotes.pagination.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-8">
                  <button
                    onClick={() => handlePageChange(quotes.pagination.page - 1)}
                    disabled={!quotes.pagination.hasPrev}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {quotes.pagination.page} of {quotes.pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(quotes.pagination.page + 1)}
                    disabled={!quotes.pagination.hasNext}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
              <p className="text-gray-600 mb-4">
                {filters.type === 'sent' 
                  ? "You haven't sent any quotes yet."
                  : "You haven't received any quotes yet."
                }
              </p>
              <a href="/browse" className="btn btn-primary">
                Browse Equipment
              </a>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}