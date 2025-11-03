import { useState, useEffect } from 'react';
import { SimpleBuyerDashboard } from '@/components/dashboard/SimpleBuyerDashboard';
import { SimpleSellerDashboard } from '@/components/dashboard/SimpleSellerDashboard';
import { SimpleAdminDashboard } from '@/components/dashboard/SimpleAdminDashboard';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      // Set default tab based on user role
      if (user.role === 'SELLER') {
        setActiveTab('seller');
      } else if (user.role === 'BUYER') {
        setActiveTab('buyer');
      } else if (user.role === 'BOTH') {
        setActiveTab('seller'); // Default to seller view for BOTH
      } else if (user.role === 'ADMIN') {
        setActiveTab('admin');
      }
    }
  }, [user]);

  const tabs = [
    { id: 'seller', label: 'Seller Dashboard', roles: ['SELLER', 'BOTH'] },
    { id: 'buyer', label: 'Buyer Dashboard', roles: ['BUYER', 'BOTH'] },
    { id: 'admin', label: 'Admin Dashboard', roles: ['ADMIN'] },
    { id: 'profile', label: 'Profile', roles: ['BUYER', 'SELLER', 'BOTH', 'ADMIN'] }
  ];

  const availableTabs = tabs.filter(tab => 
    user && tab.roles.includes(user.role)
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'seller' && <SimpleSellerDashboard />}
        {activeTab === 'buyer' && <SimpleBuyerDashboard />}
        {activeTab === 'admin' && <SimpleAdminDashboard />}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Management</h3>
            <p className="text-gray-600">Profile management features coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}