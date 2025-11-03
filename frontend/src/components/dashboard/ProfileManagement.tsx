import { useState, useEffect } from 'react';
import { dashboardService } from '@/services/dashboardService';
import { User } from '@/types';

export function ProfileManagement() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    city: '',
    state: '',
    pincode: ''
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await dashboardService.getUserProfile();
      setUser(userData);
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        company: userData.company || '',
        city: userData.city || '',
        state: userData.state || '',
        pincode: userData.pincode || ''
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updatedUser = await dashboardService.updateUserProfile(formData);
      setUser(updatedUser);
      alert('Profile updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getKYCStatusInfo = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return {
          label: 'Verified',
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: '✅'
        };
      case 'PENDING':
        return {
          label: 'Pending Review',
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          icon: '⏳'
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: '❌'
        };
      default:
        return {
          label: 'Not Submitted',
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: '📄'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) return null;

  const kycInfo = getKYCStatusInfo(user.kycStatus);

  return (
    <div className="space-y-8">
      {/* Profile Information */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company (Optional)
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Account Status */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Status</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Email Verification</h3>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {user.emailVerified ? (
                <span className="text-green-600">✅ Verified</span>
              ) : (
                <span className="text-red-600">❌ Not Verified</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Phone Verification</h3>
              <p className="text-sm text-gray-600">{user.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              {user.phoneVerified ? (
                <span className="text-green-600">✅ Verified</span>
              ) : (
                <span className="text-red-600">❌ Not Verified</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">KYC Verification</h3>
              <p className="text-sm text-gray-600">Identity verification for trust and security</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm border ${kycInfo.color}`}>
                {kycInfo.icon} {kycInfo.label}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Trust Score</h3>
              <p className="text-sm text-gray-600">Based on your activity and reviews</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary-600">
                {user.trustScore.toFixed(1)}
              </span>
              <span className="text-gray-500">/5.0</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}