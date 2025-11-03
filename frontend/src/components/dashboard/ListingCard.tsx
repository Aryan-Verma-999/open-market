

interface ListingCardProps {
  listing: any; // Using any for now since we have extended listing data
}

export function ListingCard({ listing }: ListingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SOLD':
        return 'bg-blue-100 text-blue-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
        <p className="text-sm text-gray-600 mb-2">
          ₹{listing.price?.toLocaleString()} • {listing.views} views • {listing._count?.messages || 0} messages
        </p>
        <div className="flex items-center gap-2">
          <span className={`inline-block px-2 py-1 text-xs rounded ${getStatusColor(listing.status)}`}>
            {listing.status}
          </span>
          <span className="text-xs text-gray-500">
            Created {formatDate(listing.createdAt)}
          </span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <a 
          href={`/listings/${listing.id}/edit`}
          className="btn btn-outline text-sm"
        >
          Edit
        </a>
        <a 
          href={`/listings/${listing.id}`}
          className="btn btn-secondary text-sm"
        >
          View
        </a>
      </div>
    </div>
  );
}