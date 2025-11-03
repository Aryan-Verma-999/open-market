import React, { useState, useEffect } from 'react';
import { adminService, PendingListing, ContentCheckResult } from '../../services/adminService';

const PendingListingsTab: React.FC = () => {
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [contentCheck, setContentCheck] = useState<ContentCheckResult | null>(null);
  const [showContentCheck, setShowContentCheck] = useState(false);

  useEffect(() => {
    loadListings();
  }, [page]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const response = await adminService.getPendingListings(page, 20);
      setListings(response.data.data);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to load pending listings');
      console.error('Error loading listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModerateListing = async (
    listingId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string
  ) => {
    try {
      setModeratingId(listingId);
      await adminService.moderateListing(listingId, action, reason);
      
      // Remove the listing from the current list
      setListings(prev => prev.filter(listing => listing.id !== listingId));
      setSelectedListings(prev => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
      
      // Show success message (you might want to use a toast notification)
      alert(`Listing ${action.toLowerCase()}d successfully`);
    } catch (err) {
      console.error('Error moderating listing:', err);
      alert('Failed to moderate listing');
    } finally {
      setModeratingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedListings.size === 0) {
      alert('Please select listings to approve');
      return;
    }

    try {
      setBulkApproving(true);
      const listingIds = Array.from(selectedListings);
      const response = await adminService.bulkApproveListings(listingIds);
      
      // Remove approved listings from the list
      setListings(prev => prev.filter(listing => !selectedListings.has(listing.id)));
      setSelectedListings(new Set());
      
      alert(`Bulk approval completed: ${response.data.summary.successful} successful, ${response.data.summary.failed} failed`);
    } catch (err) {
      console.error('Error in bulk approval:', err);
      alert('Failed to perform bulk approval');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleSelectListing = (listingId: string) => {
    setSelectedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedListings.size === listings.length) {
      setSelectedListings(new Set());
    } else {
      setSelectedListings(new Set(listings.map(listing => listing.id)));
    }
  };

  const showContentCheckModal = async (listingId: string) => {
    try {
      const response = await adminService.getContentCheckResults(listingId);
      setContentCheck(response.data);
      setShowContentCheck(true);
    } catch (err) {
      console.error('Error loading content check:', err);
      alert('Failed to load content check results');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading pending listings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">⚠️</div>
        <p className="text-gray-800 mb-4">{error}</p>
        <button
          onClick={loadListings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Pending Listings</h2>
        <div className="flex space-x-3">
          {selectedListings.size > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={bulkApproving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {bulkApproving ? 'Approving...' : `Approve Selected (${selectedListings.size})`}
            </button>
          )}
          <button
            onClick={loadListings}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Listings</h3>
          <p className="text-gray-600">All listings have been reviewed.</p>
        </div>
      ) : (
        <>
          {/* Bulk Actions */}
          <div className="bg-white rounded-lg shadow mb-4 p-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedListings.size === listings.length && listings.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Select All</span>
              </label>
              <span className="text-sm text-gray-600">
                {selectedListings.size} of {listings.length} selected
              </span>
            </div>
          </div>

          {/* Listings Grid */}
          <div className="space-y-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSelected={selectedListings.has(listing.id)}
                onSelect={() => handleSelectListing(listing.id)}
                onModerate={handleModerateListing}
                onShowContentCheck={() => showContentCheckModal(listing.id)}
                isModeratingId={moderatingId}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="flex space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}

      {/* Content Check Modal */}
      {showContentCheck && contentCheck && (
        <ContentCheckModal
          contentCheck={contentCheck}
          onClose={() => setShowContentCheck(false)}
          onModerate={handleModerateListing}
        />
      )}
    </div>
  );
};

// Individual Listing Card Component
interface ListingCardProps {
  listing: PendingListing;
  isSelected: boolean;
  onSelect: () => void;
  onModerate: (id: string, action: 'APPROVE' | 'REJECT', reason?: string) => void;
  onShowContentCheck: () => void;
  isModeratingId: string | null;
}

const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isSelected,
  onSelect,
  onModerate,
  onShowContentCheck,
  isModeratingId
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onModerate(listing.id, 'REJECT', rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
  };

  const isLoading = isModeratingId === listing.id;

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-start space-x-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        
        <div className="flex-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{listing.title}</h3>
              <p className="text-sm text-gray-600">{listing.category.name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">₹{listing.price.toLocaleString()}</p>
              <p className="text-sm text-gray-600">{listing.condition}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Seller</p>
              <p className="text-sm text-gray-600">
                {listing.seller.firstName} {listing.seller.lastName}
              </p>
              <p className="text-xs text-gray-500">{listing.seller.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Trust Score</p>
              <p className="text-sm text-gray-600">{listing.seller.trustScore}/100</p>
              <p className="text-xs text-gray-500">KYC: {listing.seller.kycStatus}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={onShowContentCheck}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
              >
                Content Check
              </button>
              <span className="text-xs text-gray-500">
                Submitted {new Date(listing.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => onModerate(listing.id, 'APPROVE')}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Listing</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={4}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Content Check Modal Component
interface ContentCheckModalProps {
  contentCheck: ContentCheckResult;
  onClose: () => void;
  onModerate: (id: string, action: 'APPROVE' | 'REJECT', reason?: string) => void;
}

const ContentCheckModal: React.FC<ContentCheckModalProps> = ({
  contentCheck,
  onClose,
  onModerate
}) => {
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'APPROVE': return 'text-green-600 bg-green-100';
      case 'REVIEW': return 'text-yellow-600 bg-yellow-100';
      case 'REJECT': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Content Validation Results</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Listing Info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Listing Information</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p><span className="font-medium">Title:</span> {contentCheck.listing.title}</p>
              <p><span className="font-medium">Price:</span> ₹{contentCheck.listing.price.toLocaleString()}</p>
              <p><span className="font-medium">Seller:</span> {contentCheck.listing.seller.name}</p>
              <p><span className="font-medium">Trust Score:</span> {contentCheck.listing.seller.trustScore}/100</p>
              <p><span className="font-medium">KYC Status:</span> {contentCheck.listing.seller.kycStatus}</p>
            </div>
          </div>

          {/* Overall Results */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Overall Assessment</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Overall Score:</span>
                <span className="text-lg font-bold">{Math.round(contentCheck.overallScore * 100)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Recommendation:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRecommendationColor(contentCheck.recommendation)}`}>
                  {contentCheck.recommendation}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Checks */}
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-4">Validation Checks</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(contentCheck.checks).map(([checkName, result]) => (
              <div key={checkName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 capitalize">
                    {checkName.replace(/([A-Z])/g, ' $1').trim()}
                  </h5>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${getSeverityColor(result.severity)}`}>
                      {result.severity.toUpperCase()}
                    </span>
                    <span className={`text-sm ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {result.passed ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
                {result.issues.length > 0 && (
                  <ul className="text-sm text-gray-600 space-y-1">
                    {result.issues.map((issue, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={() => {
              const issues = Object.values(contentCheck.checks)
                .flatMap(check => check.issues)
                .join('; ');
              onModerate(contentCheck.listingId, 'REJECT', issues);
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Reject
          </button>
          <button
            onClick={() => {
              onModerate(contentCheck.listingId, 'APPROVE');
              onClose();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingListingsTab;