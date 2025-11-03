import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { User as UserType } from '@/types'

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  company: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(6, 'Pincode must be 6 digits')
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileManagementProps {
  user: UserType
  onUpdate: (data: Partial<UserType>) => void
}

export function ProfileManagement({ user, onUpdate }: ProfileManagementProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'kyc' | 'security'>('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [kycDocuments, setKycDocuments] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      company: user.company || '',
      city: user.city,
      state: user.state,
      pincode: user.pincode
    }
  })

  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsLoading(true)
    try {
      // TODO: Implement actual profile update API call
      console.log('Profile update data:', data)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onUpdate(data)
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error('Failed to update profile.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKycUpload = async () => {
    if (kycDocuments.length === 0) {
      toast.error('Please select documents to upload.')
      return
    }

    setIsLoading(true)
    try {
      // TODO: Implement actual KYC document upload API call
      console.log('KYC documents:', kycDocuments)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success('KYC documents uploaded successfully! Verification in progress.')
      setKycDocuments([])
    } catch (error) {
      toast.error('Failed to upload KYC documents.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setKycDocuments(prev => [...prev, ...files])
  }

  const removeDocument = (index: number) => {
    setKycDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const getKycStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'PENDING':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'REJECTED':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <User className="h-5 w-5 text-gray-400" />
    }
  }

  const getKycStatusText = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'Verified'
      case 'PENDING':
        return 'Verification Pending'
      case 'REJECTED':
        return 'Verification Rejected'
      default:
        return 'Not Verified'
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 pt-6">
            {[
              { id: 'profile', label: 'Profile Information', icon: User },
              { id: 'kyc', label: 'KYC Verification', icon: FileText },
              { id: 'security', label: 'Security Settings', icon: AlertCircle }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h3>
              <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      {...register('firstName')}
                      type="text"
                      className={`input ${errors.firstName ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      {...register('lastName')}
                      type="text"
                      className={`input ${errors.lastName ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      {...register('phone')}
                      type="tel"
                      className={`input ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company (Optional)
                  </label>
                  <input
                    {...register('company')}
                    type="text"
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      {...register('city')}
                      type="text"
                      className={`input ${errors.city ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      {...register('state')}
                      type="text"
                      className={`input ${errors.state ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode *
                    </label>
                    <input
                      {...register('pincode')}
                      type="text"
                      className={`input ${errors.pincode ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {errors.pincode && (
                      <p className="mt-1 text-sm text-red-600">{errors.pincode.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Profile'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* KYC Tab */}
          {activeTab === 'kyc' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">KYC Verification</h3>
                <div className="flex items-center space-x-2">
                  {getKycStatusIcon(user.kycStatus)}
                  <span className={`text-sm font-medium ${
                    user.kycStatus === 'VERIFIED' ? 'text-green-600' :
                    user.kycStatus === 'PENDING' ? 'text-yellow-600' :
                    user.kycStatus === 'REJECTED' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {getKycStatusText(user.kycStatus)}
                  </span>
                </div>
              </div>

              {user.kycStatus === 'VERIFIED' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-green-800">Your identity has been verified successfully!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Required Documents</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Government-issued ID (Aadhaar, PAN, Passport, or Driver's License)</li>
                      <li>• Business registration certificate (for companies)</li>
                      <li>• Address proof (utility bill, bank statement)</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Documents
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Drag and drop files here, or click to select
                      </p>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="kyc-upload"
                      />
                      <label htmlFor="kyc-upload" className="btn btn-outline cursor-pointer">
                        Select Files
                      </label>
                    </div>
                  </div>

                  {kycDocuments.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Selected Documents</h4>
                      <div className="space-y-2">
                        {kycDocuments.map((file, index) => (
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
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleKycUpload}
                      disabled={isLoading || kycDocuments.length === 0}
                      className="btn btn-primary flex items-center"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Uploading...
                        </>
                      ) : (
                        'Submit for Verification'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h3>
              <div className="space-y-6">
                <div className="card p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Change Password</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Update your password to keep your account secure.
                  </p>
                  <button className="btn btn-outline">Change Password</button>
                </div>

                <div className="card p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Add an extra layer of security to your account.
                  </p>
                  <button className="btn btn-outline">Enable 2FA</button>
                </div>

                <div className="card p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Login Sessions</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Manage your active login sessions across devices.
                  </p>
                  <button className="btn btn-outline">View Sessions</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}