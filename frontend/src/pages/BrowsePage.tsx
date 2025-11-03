import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Filter, Grid, List, MapPin, Search } from 'lucide-react'
import { MobileFilters, MobileFilterButton } from '@/components/MobileFilters'
import { MobileListingGrid } from '@/components/MobileListingCard'
import { SearchFilters, Listing, PaginatedResponse } from '@/types'
import toast from 'react-hot-toast'

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [savedListings, setSavedListings] = useState<string[]>([])
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    categoryId: searchParams.get('category') || '',
    page: 1,
    limit: 12,
    sortBy: 'relevance'
  })
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  useEffect(() => {
    loadListings()
  }, [filters])

  useEffect(() => {
    // Update filters from URL params
    setFilters(prev => ({
      ...prev,
      query: searchParams.get('q') || '',
      categoryId: searchParams.get('category') || ''
    }))
  }, [searchParams])

  const loadListings = async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      console.log('Loading listings with filters:', filters)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock listings data
      const mockListings: Listing[] = Array.from({ length: 12 }, (_, i) => ({
        id: `listing-${i + 1}`,
        sellerId: `seller-${i + 1}`,
        title: `Equipment Item ${i + 1} - Professional Grade`,
        categoryId: '1',
        brand: ['XYZ Corp', 'ABC Industries', 'TechPro', 'MegaCorp'][i % 4],
        model: `Model-${2020 + (i % 4)}`,
        year: 2020 + (i % 4),
        condition: ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'][i % 4] as any,
        price: (i + 1) * 25000 + Math.floor(Math.random() * 50000),
        negotiable: i % 2 === 0,
        description: `High-quality equipment in excellent condition. Perfect for professional use.`,
        images: ['/api/placeholder/400/300'],
        documents: [],
        city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'][i % 5],
        state: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Maharashtra'][i % 5],
        pickupOnly: i % 3 === 0,
        canArrangeShipping: i % 3 !== 0,
        status: 'LIVE',
        views: Math.floor(Math.random() * 500) + 50,
        saves: Math.floor(Math.random() * 100) + 10,
        isActive: true,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        seller: {
          id: `seller-${i + 1}`,
          email: `seller${i + 1}@example.com`,
          phone: `+91-98765432${10 + i}`,
          firstName: 'Seller',
          lastName: `${i + 1}`,
          role: 'SELLER',
          kycStatus: i % 3 === 0 ? 'VERIFIED' : 'PENDING',
          phoneVerified: true,
          emailVerified: true,
          city: ['Mumbai', 'Delhi', 'Bangalore'][i % 3],
          state: ['Maharashtra', 'Delhi', 'Karnataka'][i % 3],
          pincode: `40000${i + 1}`,
          trustScore: 3.5 + Math.random() * 1.5,
          isActive: true,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: new Date().toISOString()
        }
      }))
      
      setListings(mockListings)
      setPagination({
        page: 1,
        limit: 12,
        total: 120,
        totalPages: 10,
        hasNext: true,
        hasPrev: false
      })
    } catch (error) {
      console.error('Failed to load listings:', error)
      toast.error('Failed to load listings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters({ ...newFilters, page: 1 })
    
    // Update URL params
    const params = new URLSearchParams()
    if (newFilters.query) params.set('q', newFilters.query)
    if (newFilters.categoryId) params.set('category', newFilters.categoryId)
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice.toString())
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice.toString())
    if (newFilters.condition?.length) params.set('condition', newFilters.condition.join(','))
    if (newFilters.city) params.set('city', newFilters.city)
    if (newFilters.state) params.set('state', newFilters.state)
    if (newFilters.sortBy && newFilters.sortBy !== 'relevance') params.set('sort', newFilters.sortBy)
    
    setSearchParams(params)
  }

  const handleSortChange = (sortBy: string) => {
    handleFiltersChange({ ...filters, sortBy: sortBy as any })
  }

  const handleSaveListing = (listingId: string) => {
    setSavedListings(prev => 
      prev.includes(listingId) 
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    )
    toast.success(
      savedListings.includes(listingId) 
        ? 'Listing removed from saved items' 
        : 'Listing saved successfully'
    )
  }

  const handleContactSeller = (listingId: string) => {
    navigate(`/listings/${listingId}`)
  }

  const handleShareListing = (listingId: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this equipment',
        url: `${window.location.origin}/listings/${listingId}`
      })
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/listings/${listingId}`)
      toast.success('Link copied to clipboard')
    }
  }

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      query: '',
      page: 1,
      limit: 12,
      sortBy: 'relevance'
    }
    setFilters(clearedFilters)
    setSearchParams(new URLSearchParams())
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.categoryId) count++
    if (filters.minPrice || filters.maxPrice) count++
    if (filters.condition?.length) count++
    if (filters.city || filters.state) count++
    if (filters.negotiable) count++
    return count
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-16 lg:top-16 z-40">
        <div className="container-full py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              Browse Equipment
            </h1>
            
            {/* Desktop View Toggle */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={filters.query || ''}
                onChange={(e) => handleFiltersChange({ ...filters, query: e.target.value })}
                className="input pl-10"
              />
            </div>

            {/* Mobile Filter Button */}
            <div className="lg:hidden">
              <MobileFilterButton 
                onOpen={() => setShowMobileFilters(true)}
                activeFiltersCount={getActiveFiltersCount()}
              />
            </div>

            {/* Desktop Sort */}
            <div className="hidden lg:block">
              <select
                value={filters.sortBy || 'relevance'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="input w-48"
              >
                <option value="relevance">Sort by Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>
              {isLoading ? 'Loading...' : `${pagination.total} items found`}
            </span>
            
            {/* Mobile Sort */}
            <div className="lg:hidden">
              <select
                value={filters.sortBy || 'relevance'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="input text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
                <option value="date_desc">Newest</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container-full py-6">
        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="card p-6 sticky top-32">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Filters</h3>
                {getActiveFiltersCount() > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="space-y-6">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select 
                    value={filters.categoryId || ''}
                    onChange={(e) => handleFiltersChange({ ...filters, categoryId: e.target.value || undefined })}
                    className="input"
                  >
                    <option value="">All Categories</option>
                    <option value="food-beverage">Food & Beverage</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="office">Office Equipment</option>
                    <option value="technology">Technology</option>
                  </select>
                </div>
                
                {/* Price Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range
                  </label>
                  <div className="space-y-2">
                    <input 
                      type="number" 
                      placeholder="Min Price" 
                      value={filters.minPrice || ''}
                      onChange={(e) => handleFiltersChange({ 
                        ...filters, 
                        minPrice: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      className="input" 
                    />
                    <input 
                      type="number" 
                      placeholder="Max Price" 
                      value={filters.maxPrice || ''}
                      onChange={(e) => handleFiltersChange({ 
                        ...filters, 
                        maxPrice: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      className="input" 
                    />
                  </div>
                </div>
                
                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="space-y-2">
                    <select 
                      value={filters.state || ''}
                      onChange={(e) => handleFiltersChange({ ...filters, state: e.target.value || undefined })}
                      className="input"
                    >
                      <option value="">All States</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="City" 
                      value={filters.city || ''}
                      onChange={(e) => handleFiltersChange({ ...filters, city: e.target.value || undefined })}
                      className="input" 
                    />
                  </div>
                </div>

                {/* Other Options */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.negotiable || false}
                      onChange={(e) => handleFiltersChange({ ...filters, negotiable: e.target.checked || undefined })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Negotiable price only</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Listings Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded mb-2 w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No equipment found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or browse all categories.
                </p>
                <button onClick={clearFilters} className="btn btn-primary">
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Grid */}
                <div className="lg:hidden">
                  <MobileListingGrid
                    listings={listings}
                    onSave={handleSaveListing}
                    onContact={handleContactSeller}
                    onShare={handleShareListing}
                    savedListings={savedListings}
                  />
                </div>

                {/* Desktop Grid */}
                <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <div key={listing.id} className="card p-4 hover:shadow-md transition-shadow">
                      <div className="bg-gray-200 h-48 rounded-lg mb-4 overflow-hidden">
                        {listing.images[0] && (
                          <img 
                            src={listing.images[0]} 
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {listing.title}
                      </h3>
                      <p className="text-primary-600 font-bold mb-1">
                        ₹{listing.price.toLocaleString()}
                      </p>
                      <div className="flex items-center text-gray-600 text-sm mb-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{listing.city}, {listing.state}</span>
                      </div>
                      <div className="flex gap-2 mb-3">
                        {listing.seller?.kycStatus === 'VERIFIED' && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            Verified
                          </span>
                        )}
                        {listing.negotiable && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            Negotiable
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleSaveListing(listing.id)}
                          className="btn btn-outline flex-1 text-sm"
                        >
                          {savedListings.includes(listing.id) ? 'Saved' : 'Save'}
                        </button>
                        <button 
                          onClick={() => handleContactSeller(listing.id)}
                          className="btn btn-primary flex-1 text-sm"
                        >
                          Contact
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <div className="flex gap-2">
                      <button
                        disabled={!pagination.hasPrev}
                        onClick={() => handleFiltersChange({ ...filters, page: filters.page! - 1 })}
                        className="btn btn-outline disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="flex items-center px-4 text-gray-600">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <button
                        disabled={!pagination.hasNext}
                        onClick={() => handleFiltersChange({ ...filters, page: filters.page! + 1 })}
                        className="btn btn-outline disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      <MobileFilters
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApply={() => loadListings()}
        onClear={clearFilters}
      />
    </div>
  )
}