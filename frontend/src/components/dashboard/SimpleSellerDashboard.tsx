import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Listing {
  id: string;
  title: string;
  price: number;
  condition: string;
  status: string;
  views?: number;
  createdAt: string;
  images: string[];
}

export function SimpleSellerDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Add a refresh function that can be called when returning from listing creation
  useEffect(() => {
    const handleFocus = () => {
      // Refresh data when window regains focus (user returns from creating listing)
      loadDashboardData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get user's listings
      try {
        const listingsResponse = await api.get('/listings?seller=me');
        const userListings = listingsResponse.data.listings || [];
        console.log('User listings:', userListings); // Debug log
        setListings(userListings);
      } catch (listingError) {
        console.error('Failed to load user listings:', listingError);
        setListings([]);
      }
      
      // Get messages
      try {
        const messagesResponse = await api.get('/messages');
        setMessages(messagesResponse.data.conversations || []);
      } catch (msgError) {
        console.log('Messages not available yet');
        setMessages([]);
      }
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadDashboardData}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Seller Dashboard - Welcome, {user?.firstName}!
        </h2>
        <p className="text-gray-600">
          Manage your equipment listings and track your sales performance.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <span className="text-green-600 text-lg">📦</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Listings</p>
              <p className="text-2xl font-semibold text-gray-900">{listings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <span className="text-blue-600 text-lg">💬</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Messages</p>
              <p className="text-2xl font-semibold text-gray-900">{messages.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                <span className="text-yellow-600 text-lg">👁️</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Views</p>
              <p className="text-2xl font-semibold text-gray-900">
                {listings.reduce((total, listing) => total + (listing.views || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <span className="text-purple-600 text-lg">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${listings.reduce((total, listing) => {
                  const price = typeof listing.price === 'number' ? listing.price : parseFloat(listing.price) || 0;
                  return total + price;
                }, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Listings Management */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Your Listings</h3>
            <div className="flex gap-2">
              <button
                onClick={loadDashboardData}
                className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 text-sm"
              >
                🔄 Refresh
              </button>
              <a 
                href="/sell" 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                + Add Listing
              </a>
            </div>
          </div>
          <div className="p-6">
            {listings.length > 0 ? (
              <div className="space-y-4">
                {listings.slice(0, 5).map((listing) => (
                  <div key={listing.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {listing.images && listing.images.length > 0 ? (
                        <img 
                          src={listing.images[0]} 
                          alt={listing.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-2xl">📦</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {listing.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        ${listing.price.toLocaleString()} • {listing.condition}
                      </p>
                      <p className="text-xs text-gray-400">
                        Listed {new Date(listing.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        listing.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {listing.status}
                      </span>
                    </div>
                  </div>
                ))}
                {listings.length > 5 && (
                  <div className="text-center">
                    <a 
                      href="/dashboard/listings" 
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View all {listings.length} listings →
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No listings yet</p>
                <a 
                  href="/sell" 
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create Your First Listing
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Messages */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Inquiries</h3>
            </div>
            <div className="p-6">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.slice(0, 3).map((conversation, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-medium">
                            {conversation.otherUser?.firstName?.[0] || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.otherUser?.firstName} {conversation.otherUser?.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          Interested in: {conversation.listing?.title}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="text-center">
                    <a 
                      href="/messages" 
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View all messages →
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No messages yet</p>
                  <p className="text-sm text-gray-400">
                    Messages from interested buyers will appear here
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <a 
                  href="/sell" 
                  className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📝 List New Equipment
                </a>
                <a 
                  href="/messages" 
                  className="block w-full bg-green-600 text-white text-center py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  💬 Check Messages
                </a>
                <a 
                  href="/browse" 
                  className="block w-full bg-purple-600 text-white text-center py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  🔍 Browse Market
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}