import { useState } from 'react';

interface SavedListingCardProps {
  listing: any;
  onRemove: () => void;
}

export function SavedListingCard({ listing, onRemove }: SavedListingCardProps) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    try {
      setRemoving(true);
      // TODO: Implement remove from saved listings API call
      // await api.delete(`/listings/${listing.id}/save`);
      onRemove();
    } catch (error) {
      console.error('Failed to remove from saved listings:', error);
    } finally {
      setRemoving(false);
    }
  };

  const getSellerName = () => {
    if (listing.seller) {
      return `${listing.seller.firstName} ${listing.seller.lastName}`;
    }
    return 'Unknown Seller';
  };

  const getTrustBadge = (trustScore: number) => {
    if (trustScore >= 4.5) return '🏆';
    if (trustScore >= 4.0) return '⭐';
    if (trustScore >= 3.5) return '✅';
    return '';
  };

  return (
    <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden">
        {listing.images && listing.images.length > 0 ? (
          <img 
            src={listing.images[0]} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            📦
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 mb-1">{listing.title}</h3>
        <p className="text-lg font-semibold text-primary-600 mb-1">
          ₹{listing.price?.toLocaleString()}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{getSellerName()}</span>
          {listing.seller?.trustScore && (
            <span className="flex items-center gap-1">
              {getTrustBadge(listing.seller.trustScore)}
              <span>{listing.seller.trustScore.toFixed(1)}</span>
            </span>
          )}
          <span>•</span>
          <span>{listing.category?.name}</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleRemove}
          disabled={removing}
          className="btn btn-outline text-sm text-red-600 border-red-200 hover:bg-red-50"
        >
          {removing ? 'Removing...' : 'Remove'}
        </button>
        <a 
          href={`/listings/${listing.id}`}
          className="btn btn-primary text-sm"
        >
          View
        </a>
      </div>
    </div>
  );
}