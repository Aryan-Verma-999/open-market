import { useState } from 'react'
import { Heart, MapPin, Clock, Eye, MessageCircle, Share2 } from 'lucide-react'
import { Listing } from '@/types'

interface MobileListingCardProps {
  listing: Listing
  onSave?: (listingId: string) => void
  onContact?: (listingId: string) => void
  onShare?: (listingId: string) => void
  isSaved?: boolean
}

export function MobileListingCard({ 
  listing, 
  onSave, 
  onContact, 
  onShare, 
  isSaved = false 
}: MobileListingCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleImageSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right' && currentImageIndex < listing.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    } else if (direction === 'left' && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays <= 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="listing-card-mobile">
      {/* Image Carousel */}
      <div className="relative">
        <div className="aspect-w-16 aspect-h-12 bg-gray-200 relative overflow-hidden">
          {listing.images.length > 0 ? (
            <>
              <img
                src={listing.images[currentImageIndex]}
                alt={listing.title}
                className={`w-full h-48 object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <div className="w-12 h-12 bg-gray-300 rounded"></div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <div className="w-12 h-12 bg-gray-300 rounded mx-auto mb-2"></div>
                <span className="text-sm">No image</span>
              </div>
            </div>
          )}
          
          {/* Image indicators */}
          {listing.images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {listing.images.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
          
          {/* Navigation areas for swiping */}
          {listing.images.length > 1 && (
            <>
              <button
                className="absolute left-0 top-0 w-1/3 h-full"
                onClick={() => handleImageSwipe('left')}
              />
              <button
                className="absolute right-0 top-0 w-1/3 h-full"
                onClick={() => handleImageSwipe('right')}
              />
            </>
          )}
        </div>
        
        {/* Save button */}
        <button
          onClick={() => onSave?.(listing.id)}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
        >
          <Heart 
            className={`w-4 h-4 ${isSaved ? 'text-red-500 fill-current' : 'text-gray-600'}`} 
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title and Price */}
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 text-base line-clamp-2 mb-1">
            {listing.title}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary-600">
              {formatPrice(listing.price)}
            </span>
            {listing.negotiable && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Negotiable
              </span>
            )}
          </div>
        </div>

        {/* Location and Date */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            <span>{listing.city}, {listing.state}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            <span>{formatDate(listing.createdAt)}</span>
          </div>
        </div>

        {/* Condition and Brand */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
            {listing.condition.replace('_', ' ')}
          </span>
          {listing.brand && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {listing.brand}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <Eye className="w-3 h-3 mr-1" />
              <span>{listing.views}</span>
            </div>
            <div className="flex items-center">
              <Heart className="w-3 h-3 mr-1" />
              <span>{listing.saves}</span>
            </div>
          </div>
          {listing.seller?.kycStatus === 'VERIFIED' && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
              ✓ Verified Seller
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onShare?.(listing.id)}
            className="btn btn-outline flex-1 flex items-center justify-center text-sm"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </button>
          <button
            onClick={() => onContact?.(listing.id)}
            className="btn btn-primary flex-2 flex items-center justify-center text-sm"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Contact Seller
          </button>
        </div>
      </div>
    </div>
  )
}

export function MobileListingGrid({ 
  listings, 
  onSave, 
  onContact, 
  onShare,
  savedListings = []
}: {
  listings: Listing[]
  onSave?: (listingId: string) => void
  onContact?: (listingId: string) => void
  onShare?: (listingId: string) => void
  savedListings?: string[]
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
      {listings.map((listing) => (
        <MobileListingCard
          key={listing.id}
          listing={listing}
          onSave={onSave}
          onContact={onContact}
          onShare={onShare}
          isSaved={savedListings.includes(listing.id)}
        />
      ))}
    </div>
  )
}