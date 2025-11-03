import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { 
  CheckCircle, Upload, X, FileText, MapPin, 
  DollarSign, Eye, Loader2, ArrowLeft, ArrowRight 
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { CreateListingData } from '@/types'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

const listingSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  categoryId: z.string().min(1, 'Please select a category'),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().min(1900).max(new Date().getFullYear()).optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR']),
  price: z.number().min(1, 'Price must be greater than 0'),
  negotiable: z.boolean(),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pickupOnly: z.boolean(),
  canArrangeShipping: z.boolean()
})

type ListingFormData = z.infer<typeof listingSchema>

const steps = [
  { id: 1, name: 'Details', description: 'Basic information' },
  { id: 2, name: 'Media', description: 'Photos & documents' },
  { id: 3, name: 'Location & Shipping', description: 'Location details' },
  { id: 4, name: 'Pricing', description: 'Price & terms' },
  { id: 5, name: 'Review', description: 'Review & publish' }
]

export function CreateListingPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
    getValues
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      negotiable: true,
      pickupOnly: false,
      canArrangeShipping: true
    }
  })

  const watchedValues = watch()

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 12,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles) => {
      setUploadedImages(prev => [...prev, ...acceptedFiles].slice(0, 12))
    }
  })

  const { getRootProps: getDocRootProps, getInputProps: getDocInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      setUploadedDocuments(prev => [...prev, ...acceptedFiles].slice(0, 5))
    }
  })

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const nextStep = async () => {
    let fieldsToValidate: (keyof ListingFormData)[] = []
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['title', 'categoryId', 'condition', 'description']
        break
      case 3:
        fieldsToValidate = ['city', 'state']
        break
      case 4:
        fieldsToValidate = ['price']
        break
    }
    
    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate)
      if (!isValid) return
    }

    if (currentStep === 2 && uploadedImages.length === 0) {
      toast.error('Please upload at least one image')
      return
    }

    setCurrentStep(prev => Math.min(5, prev + 1))
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1))
  }

  const onSubmit = async (data: ListingFormData) => {
    setIsSubmitting(true)
    try {
      // Prepare listing data for API
      const listingData = {
        title: data.title,
        description: data.description,
        category: data.categoryId, // The backend will handle category lookup
        brand: data.brand,
        model: data.model,
        condition: data.condition,
        price: data.price,
        location: {
          city: data.city,
          state: data.state,
          zipCode: '00000' // Default zipcode for now
        },
        specifications: {
          year: data.year,
          negotiable: data.negotiable,
          pickupOnly: data.pickupOnly,
          canArrangeShipping: data.canArrangeShipping
        },
        images: [] // TODO: Implement image upload
      };

      console.log('Creating listing:', listingData);
      
      const response = await api.post('/listings', listingData);
      
      if (response.data.success) {
        toast.success('Listing created successfully!');
        navigate('/dashboard');
      } else {
        throw new Error('Failed to create listing');
      }
    } catch (error: any) {
      console.error('Create listing error:', error);
      toast.error(error.response?.data?.error || 'Failed to create listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const saveDraft = async () => {
    try {
      // TODO: Implement save draft functionality
      console.log('Saving draft:', getValues())
      toast.success('Draft saved successfully!')
    } catch (error) {
      toast.error('Failed to save draft.')
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  {...register('title')}
                  type="text"
                  className={`input ${errors.title ? 'border-red-500' : ''}`}
                  placeholder="e.g., Industrial Mixer - Model XYZ-2023"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  {...register('categoryId')}
                  className={`input ${errors.categoryId ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Category</option>
                  <option value="food-beverage">Food & Beverage</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="office">Office Equipment</option>
                  <option value="technology">Technology</option>
                  <option value="construction">Construction</option>
                  <option value="medical">Medical Equipment</option>
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <input
                  {...register('brand')}
                  type="text"
                  className="input"
                  placeholder="Equipment brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  {...register('model')}
                  type="text"
                  className="input"
                  placeholder="Model number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input
                  {...register('year', { valueAsNumber: true })}
                  type="number"
                  className="input"
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition *
              </label>
              <select
                {...register('condition')}
                className={`input ${errors.condition ? 'border-red-500' : ''}`}
              >
                <option value="">Select Condition</option>
                <option value="NEW">New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
              </select>
              {errors.condition && (
                <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description')}
                rows={6}
                className={`input ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Describe the equipment condition, features, specifications, and any additional information that would be helpful to buyers..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {watchedValues.description?.length || 0} characters (minimum 50 required)
              </p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipment Photos * (At least 1 required, max 12)
              </label>
              <div
                {...getImageRootProps()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
              >
                <input {...getImageInputProps()} />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop images here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: JPEG, PNG, WebP (max 5MB each)
                </p>
              </div>
              
              {uploadedImages.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Uploaded Images ({uploadedImages.length}/12)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {uploadedImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 bg-primary-600 text-white text-xs px-1 rounded">
                            Main
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documents (Optional - max 5)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Upload manuals, certificates, invoices, or other relevant documents
              </p>
              <div
                {...getDocRootProps()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
              >
                <input {...getDocInputProps()} />
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-1">
                  Drag and drop documents here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: PDF, DOC, DOCX (max 10MB each)
                </p>
              </div>
              
              {uploadedDocuments.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Uploaded Documents ({uploadedDocuments.length}/5)
                  </h4>
                  <div className="space-y-2">
                    {uploadedDocuments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{file.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeDocument(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  {...register('city')}
                  type="text"
                  className={`input ${errors.city ? 'border-red-500' : ''}`}
                  placeholder="City"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <select
                  {...register('state')}
                  className={`input ${errors.state ? 'border-red-500' : ''}`}
                >
                  <option value="">Select State</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="West Bengal">West Bengal</option>
                </select>
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Shipping Options</h3>
              
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    {...register('pickupOnly')}
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Pickup Only</span>
                    <p className="text-sm text-gray-600">
                      Buyers must arrange pickup from your location
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start">
                  <input
                    {...register('canArrangeShipping')}
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Can Arrange Shipping</span>
                    <p className="text-sm text-gray-600">
                      You can help arrange shipping to buyer's location
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (₹) *
                </label>
                <input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  className={`input ${errors.price ? 'border-red-500' : ''}`}
                  placeholder="250000"
                  min="1"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>
              
              <div className="flex items-center pt-8">
                <label className="flex items-center">
                  <input
                    {...register('negotiable')}
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">Price is negotiable</span>
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Pricing Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Research similar equipment prices in the market</li>
                <li>• Consider the equipment's age, condition, and usage</li>
                <li>• Factor in any included accessories or warranties</li>
                <li>• Enabling negotiation can attract more buyers</li>
              </ul>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 mb-4">Review Your Listing</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Equipment Details</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Title:</dt>
                      <dd className="font-medium">{watchedValues.title}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Category:</dt>
                      <dd className="font-medium">{watchedValues.categoryId}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Condition:</dt>
                      <dd className="font-medium">{watchedValues.condition}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Price:</dt>
                      <dd className="font-medium">
                        ₹{watchedValues.price?.toLocaleString()} 
                        {watchedValues.negotiable && ' (Negotiable)'}
                      </dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Location & Media</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Location:</dt>
                      <dd className="font-medium">{watchedValues.city}, {watchedValues.state}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Images:</dt>
                      <dd className="font-medium">{uploadedImages.length} uploaded</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Documents:</dt>
                      <dd className="font-medium">{uploadedDocuments.length} uploaded</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Before Publishing</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Double-check all information for accuracy</li>
                <li>• Ensure images clearly show the equipment</li>
                <li>• Your listing will be reviewed before going live</li>
                <li>• You'll receive notifications about inquiries</li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-full py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Create New Listing
            </h1>
            <p className="text-gray-600">
              List your equipment to connect with potential buyers
            </p>
          </div>

          <div className="card p-6 lg:p-8">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step.id < currentStep 
                          ? 'bg-green-500 text-white' 
                          : step.id === currentStep 
                          ? 'bg-primary-600 text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {step.id < currentStep ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <div className="ml-2 hidden sm:block">
                        <span className={`text-sm font-medium ${
                          step.id <= currentStep ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step.name}
                        </span>
                        <p className="text-xs text-gray-500">{step.description}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-8 lg:w-16 h-0.5 mx-2 ${
                        step.id < currentStep ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <form onSubmit={handleSubmit(onSubmit)}>
              {renderStepContent()}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="btn btn-outline flex items-center"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous
                    </button>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={saveDraft}
                    className="btn btn-outline"
                  >
                    Save Draft
                  </button>
                  
                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="btn btn-primary flex items-center"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-primary flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Publish Listing
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}