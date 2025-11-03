import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Heart, Share2, MapPin, Clock, Eye, Star, Shield, 
  Phone, Mail, MessageCircle, ArrowLeft, ChevronLeft, 
  ChevronRight, Loader2, AlertTriangle 
} from 'lucide-react'
import { Listing, SendMessageData } from '@/types'
import toast from 'react-hot-toast'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  quoteAmount: z.number().optional()
})

type ContactFormData = z.infer<typeof contactSchema>

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema)
  })

  useEffect(() => {
    if (id) {
      loadListing(id)
    }
  }, [id])

  const loadListing = async (listingId: string) => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      console.log('Loading listing:', listingId)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock listing data
      const mockListing: Listing = {
        id: listingId,
        sellerId: 'seller1',
        title: 'Industrial Mixer - Model XYZ-2023',
        categoryId: '1',
        brand: 'XYZ Industries',
        model: 'XYZ-2023',
        year: 2020,
        condition: 'GOOD',
        price: 250000,
        negotiable: true,
        description: `Well-maintained industrial mixer in excellent working condition. This professional-grade equipment has been regularly serviced and maintained according to manufacturer specifications.

Key Features:
• Heavy-duty construction for continuous operation
• Variable speed control for different mixing requirements
• Stainless steel mixing bowl and attachments
• Safety interlocks and emergency stop features
• Complete with all original manuals and documentation

Perfect for food processing, pharmaceutical, or chemical applications. The equipment has been used in a clean, controlled environment and shows minimal wear. All safety certifications are up to date.

Reason for sale: Upgrading to larger capacity equipment.`,
        specifications: {
          'Capacity': '50 Liters',
          'Power': '5 HP Motor',
          'Speed Range': '10-200 RPM',
          'Weight': '450 kg',
          'Dimensions': '120 x 80 x 140 cm',
          'Power Supply': '415V, 3 Phase',
          'Material': 'Stainless Steel 316L'
        },
        images: [
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600'
        ],
        documents: ['manual.pdf', 'certificate.pdf'],
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 19.0760,
        longitude: 72.8777,
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
          email: 'contact@abcequipment.com',
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
      }
      
      setListing(mockListing)
    } catch (error) {
      console.error('Failed to load listing:', error)
      toast.error('Failed to load listing details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
    toast.success(isSaved ? 'Listing removed from saved items' : 'Listing saved successfully')
  }

  const handleShare = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.title,
          text: `Check out this equipment: ${listing?.title}`,
          url: url
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
      } catch (error) {
        toast.error('Failed to copy link')
      }
    }
  }

  const onSubmitContact = async (data: ContactFormData) => {
    if (!listing) return
    
    setIsSubmitting(true)
    try {
      // TODO: Replace with actual API call
      console.log('Sending message:', data)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast.success('Message sent successfully! The seller will contact you soon.')
      reset()
      setShowContactForm(false)
    } catch (error) {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
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
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Listing not found</h2>
          <p className="text-gray-600 mb-4">The listing you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/browse')} className="btn btn-primary">
            Browse Equipment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b sticky top-16 z-40">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className="touch-target">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="touch-target">
              <Heart className={`h-5 w-5 ${isSaved ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
            </button>
            <button onClick={handleShare} className="touch-target">
              <Share2 className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="container-full py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Images and Details */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="card overflow-hidden mb-6">
              <div className="relative">
                <div className="aspect-w-16 aspect-h-12 bg-gray-200">
                  <img
                    src={listing.images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-64 sm:h-96 object-cover"
                  />
                </div>
                
                {listing.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                      disabled={currentImageIndex === 0}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(Math.min(listing.images.length - 1, currentImageIndex + 1))}
                      disabled={currentImageIndex === listing.images.length - 1}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                      {listing.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {/* Thumbnail Grid */}
              {listing.images.length > 1 && (
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {listing.images.slice(0, 4).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square bg-gray-200 rounded overflow-hidden ${
                          index === currentImageIndex ? 'ring-2 ring-primary-500' : ''
                        }`}
                      >
                        <img src={image} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Equipment Details */}
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Equipment Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Specifications</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Brand:</span>
                      <span className="font-medium">{listing.brand}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Model:</span>
                      <span className="font-medium">{listing.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Year:</span>
                      <span className="font-medium">{listing.year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Condition:</span>
                      <span className="font-medium">{listing.condition.replace('_', ' ')}</span>
                    </div>
                    {listing.specifications && Object.entries(listing.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Description</h4>
                  <div className="text-gray-600 whitespace-pre-line">
                    {listing.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="card p-6">
              <h3 className="font-medium text-gray-900 mb-4">Shipping & Pickup</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    Located in {listing.city}, {listing.state}
                  </span>
                </div>
                {listing.pickupOnly ? (
                  <p className="text-amber-600 text-sm">⚠️ Pickup only - Shipping not available</p>
                ) : listing.canArrangeShipping ? (
                  <p className="text-green-600 text-sm">✓ Shipping can be arranged</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Price and Actions */}
            <div className="card p-6 mb-6 sticky top-32">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900 line-clamp-2">
                    {listing.title}
                  </h1>
                  <div className="hidden lg:flex items-center gap-2">
                    <button onClick={handleSave} className="touch-target">
                      <Heart className={`h-5 w-5 ${isSaved ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
                    </button>
                    <button onClick={handleShare} className="touch-target">
                      <Share2 className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl lg:text-3xl font-bold text-primary-600">
                      {formatPrice(listing.price)}
                    </p>
                    {listing.negotiable && (
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Negotiable
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center text-gray-600 text-sm mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{listing.city}, {listing.state}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    <span>{listing.views} views</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Listed {formatDate(listing.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div className="border-t pt-6 mb-6">
                <h3 className="font-medium text-gray-900 mb-4">Seller Information</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-primary-600">
                      {listing.seller?.firstName?.[0]}{listing.seller?.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {listing.seller?.company || `${listing.seller?.firstName} ${listing.seller?.lastName}`}
                      </p>
                      {listing.seller?.kycStatus === 'VERIFIED' && (
                        <Shield className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="h-3 w-3 text-yellow-400 mr-1 fill-current" />
                      <span>{listing.seller?.trustScore?.toFixed(1)} rating</span>
                    </div>
                  </div>
                </div>
                
                {listing.seller?.kycStatus === 'VERIFIED' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center text-green-800 text-sm">
                      <Shield className="h-4 w-4 mr-2" />
                      <span>Verified seller with KYC completed</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowContactForm(!showContactForm)}
                  className="btn btn-primary w-full flex items-center justify-center"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {showContactForm ? 'Hide Contact Form' : 'Contact Seller'}
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${listing.seller?.phone}`}
                    className="btn btn-outline flex items-center justify-center text-sm"
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </a>
                  <a
                    href={`mailto:${listing.seller?.email}`}
                    className="btn btn-outline flex items-center justify-center text-sm"
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </a>
                </div>
              </div>

              {/* Contact Form */}
              {showContactForm && (
                <div className="border-t pt-6 mt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Send Message</h4>
                  <form onSubmit={handleSubmit(onSubmitContact)} className="space-y-4">
                    <div>
                      <input
                        {...register('name')}
                        type="text"
                        placeholder="Your Name"
                        className={`input ${errors.name ? 'border-red-500' : ''}`}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="Email"
                        className={`input ${errors.email ? 'border-red-500' : ''}`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <input
                        {...register('phone')}
                        type="tel"
                        placeholder="Phone"
                        className={`input ${errors.phone ? 'border-red-500' : ''}`}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>

                    {listing.negotiable && (
                      <div>
                        <input
                          {...register('quoteAmount', { valueAsNumber: true })}
                          type="number"
                          placeholder="Your offer amount (optional)"
                          className="input"
                        />
                      </div>
                    )}
                    
                    <div>
                      <textarea
                        {...register('message')}
                        rows={4}
                        placeholder="Message (e.g., I'm interested in this equipment...)"
                        className={`input ${errors.message ? 'border-red-500' : ''}`}
                      />
                      {errors.message && (
                        <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-primary w-full flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Sending...
                        </>
                      ) : (
                        'Send Message'
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}