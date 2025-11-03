import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Shield, Users, ArrowRight } from 'lucide-react'
import { MobileSearchBar } from '@/components/MobileNavigation'
import { MobileListingCard } from '@/components/MobileListingCard'
import { Listing, Category } from '@/types'

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadHomePageData()
  }, [])

  const loadHomePageData = async () => {
    try {
      // TODO: Replace with actual API calls
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock categories
      setCategories([
        { id: '1', name: 'Food & Beverage', slug: 'food-beverage', isActive: true, sortOrder: 1 },
        { id: '2', name: 'Manufacturing', slug: 'manufacturing', isActive: true, sortOrder: 2 },
        { id: '3', name: 'Office Equipment', slug: 'office', isActive: true, sortOrder: 3 },
        { id: '4', name: 'Technology', slug: 'technology', isActive: true, sortOrder: 4 },
        { id: '5', name: 'Construction', slug: 'construction', isActive: true, sortOrder: 5 },
        { id: '6', name: 'Medical', slug: 'medical', isActive: true, sortOrder: 6 }
      ])

      // Mock featured listings
      setFeaturedListings([
        {
          id: '1',
          sellerId: 'seller1',
          title: 'Industrial Mixer - Model XYZ-2023',
          categoryId: '1',
          brand: 'XYZ Industries',
          model: 'XYZ-2023',
          year: 2020,
          condition: 'GOOD',
          price: 250000,
          negotiable: true,
          description: 'Well-maintained industrial mixer in excellent working condition.',
          images: ['/api/placeholder/400/300'],
          documents: [],
          city: 'Mumbai',
          state: 'Maharashtra',
          pickupOnly: false,
          canArrangeShipping: true,
          status: 'LIVE',
          views: 156,
          saves: 23,
          isActive: true,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
          seller: {
            id: 'seller1',
            email: 'seller@example.com',
            phone: '+91-9876543210',
            firstName: 'ABC',
            lastName: 'Equipment Co.',
            role: 'SELLER',
            company: 'ABC Equipment Co.',
            kycStatus: 'VERIFIED',
            phoneVerified: true,
            emailVerified: true,
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            trustScore: 4.8,
            isActive: true,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z'
          }
        },
        {
          id: '2',
          sellerId: 'seller2',
          title: 'Commercial Oven - Heavy Duty',
          categoryId: '1',
          brand: 'ProBake',
          condition: 'LIKE_NEW',
          price: 180000,
          negotiable: true,
          description: 'Commercial grade oven, barely used.',
          images: ['/api/placeholder/400/300'],
          documents: [],
          city: 'Delhi',
          state: 'Delhi',
          pickupOnly: true,
          canArrangeShipping: false,
          status: 'LIVE',
          views: 89,
          saves: 15,
          isActive: true,
          createdAt: '2024-01-14T15:30:00Z',
          updatedAt: '2024-01-14T15:30:00Z'
        },
        {
          id: '3',
          sellerId: 'seller3',
          title: 'CNC Machine - Precision Tools',
          categoryId: '2',
          brand: 'TechCNC',
          model: 'TC-500',
          year: 2019,
          condition: 'GOOD',
          price: 850000,
          negotiable: false,
          description: 'High precision CNC machine with all accessories.',
          images: ['/api/placeholder/400/300'],
          documents: [],
          city: 'Bangalore',
          state: 'Karnataka',
          pickupOnly: false,
          canArrangeShipping: true,
          status: 'LIVE',
          views: 234,
          saves: 45,
          isActive: true,
          createdAt: '2024-01-13T09:15:00Z',
          updatedAt: '2024-01-13T09:15:00Z'
        }
      ])
    } catch (error) {
      console.error('Failed to load homepage data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    
    navigate(`/browse?${params.toString()}`)
  }

  const handleCategoryClick = (categorySlug: string) => {
    navigate(`/browse?category=${categorySlug}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen">
      {/* Mobile Search Bar */}
      <div className="lg:hidden">
        <MobileSearchBar />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 section-mobile">
        <div className="container-full">
          <div className="text-center">
            <h1 className="text-responsive-xl font-bold text-gray-900 mb-4">
              Buy & Sell Used Equipment
            </h1>
            <p className="text-responsive-base text-gray-600 mb-8 max-w-2xl mx-auto">
              Connect with trusted buyers and sellers in the equipment marketplace. 
              Find quality used equipment or sell your unused assets.
            </p>
            
            {/* Desktop Search */}
            <div className="hidden lg:block max-w-4xl mx-auto mb-12">
              <div className="flex gap-4 bg-white p-2 rounded-lg shadow-sm">
                <input
                  type="text"
                  placeholder="Search equipment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="input flex-1 border-0 focus:ring-0"
                />
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input w-48 border-0 focus:ring-0"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={handleSearch}
                  className="btn btn-primary px-8 flex items-center"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary-600">10K+</div>
                <div className="text-sm text-gray-600">Active Listings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary-600">5K+</div>
                <div className="text-sm text-gray-600">Verified Sellers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary-600">₹50Cr+</div>
                <div className="text-sm text-gray-600">Equipment Value</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="section-mobile-sm bg-white">
        <div className="container-full">
          <h2 className="text-responsive-lg font-bold text-gray-900 mb-6 text-center">
            Browse by Category
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-6 text-center animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.slug)}
                  className="card p-6 text-center hover:shadow-md transition-all duration-200 hover:scale-105 touch-target"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm">{category.name}</h3>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Featured Listings Section */}
      <div className="section-mobile bg-gray-50">
        <div className="container-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-responsive-lg font-bold text-gray-900">
              Featured Listings
            </h2>
            <button 
              onClick={() => navigate('/browse')}
              className="btn btn-outline flex items-center"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2 w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Desktop Grid */}
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredListings.map((listing) => (
                  <div key={listing.id} className="card p-6 hover:shadow-md transition-shadow">
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
                    <p className="text-gray-600 text-sm mb-3">
                      {listing.city}, {listing.state}
                    </p>
                    <div className="flex gap-2">
                      <button className="btn btn-outline flex-1 text-sm">
                        View Details
                      </button>
                      <button className="btn btn-primary flex-1 text-sm">
                        Contact Seller
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden">
                <div className="grid grid-cols-1 gap-4">
                  {featuredListings.map((listing) => (
                    <MobileListingCard
                      key={listing.id}
                      listing={listing}
                      onSave={(id) => console.log('Save listing:', id)}
                      onContact={(id) => console.log('Contact seller:', id)}
                      onShare={(id) => console.log('Share listing:', id)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Trust & Safety Section */}
      <div className="section-mobile bg-white">
        <div className="container-full">
          <h2 className="text-responsive-lg font-bold text-gray-900 mb-8 text-center">
            Why Choose Our Platform?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Verified Sellers</h3>
              <p className="text-gray-600 text-sm">
                All sellers go through KYC verification for your safety and trust.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Trusted Community</h3>
              <p className="text-gray-600 text-sm">
                Join thousands of buyers and sellers in our trusted marketplace.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Best Prices</h3>
              <p className="text-gray-600 text-sm">
                Get competitive prices with our negotiation-friendly platform.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="section-mobile bg-primary-600">
        <div className="container-full text-center">
          <h2 className="text-responsive-lg font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Whether you're looking to buy quality used equipment or sell your unused assets, 
            we're here to help you connect with the right people.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/browse')}
              className="btn bg-white text-primary-600 hover:bg-gray-50 px-8"
            >
              Start Browsing
            </button>
            <button 
              onClick={() => navigate('/sell')}
              className="btn border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8"
            >
              List Your Equipment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}