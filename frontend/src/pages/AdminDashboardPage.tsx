import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import PendingListingsTab from '../components/admin/PendingListingsTab';
import ReportsTab from '../components/admin/ReportsTab';
import UserVerificationTab from '../components/admin/UserVerificationTab';
import ActivityLogsTab from '../components/admin/ActivityLogsTab';

interface ModerationStats {
  pendingListings: number;
  pendingReports: number;
  totalUsers: number;
  verifiedUsers: number;
  totalListings: number;
  activeListings: number;
}

interface AdminTab {
  id: string;
  label: string;
  count?: number;
}

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs: AdminTab[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'listings', label: 'Pending Listings', count: stats?.pendingListings },
    { id: 'reports', label: 'Reports', count: stats?.pendingReports },
    { id: 'users', label: 'User Verification' },
    { id: 'logs', label: 'Activity Logs' }
  ];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminService.getStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load admin statistics');
      console.error('Error loading admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-gray-800 mb-4">{error}</p>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-gray-600">Manage content moderation and user verification</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab stats={stats!} />}
        {activeTab === 'listings' && <PendingListingsTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'users' && <UserVerificationTab />}
        {activeTab === 'logs' && <ActivityLogsTab />}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ stats: ModerationStats }> = ({ stats }) => {
  const statCards = [
    {
      title: 'Pending Listings',
      value: stats.pendingListings,
      color: 'bg-yellow-500',
      icon: '📝'
    },
    {
      title: 'Pending Reports',
      value: stats.pendingReports,
      color: 'bg-red-500',
      icon: '🚨'
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      color: 'bg-blue-500',
      icon: '👥'
    },
    {
      title: 'Verified Users',
      value: stats.verifiedUsers,
      color: 'bg-green-500',
      icon: '✅'
    },
    {
      title: 'Total Listings',
      value: stats.totalListings,
      color: 'bg-purple-500',
      icon: '📋'
    },
    {
      title: 'Active Listings',
      value: stats.activeListings,
      color: 'bg-indigo-500',
      icon: '🔴'
    }
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Platform Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${card.color} rounded-lg p-3 text-white text-xl`}>
                {card.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left">
            <div className="text-yellow-600 text-2xl mb-2">📝</div>
            <div className="font-medium text-gray-900">Review Listings</div>
            <div className="text-sm text-gray-600">{stats.pendingListings} pending</div>
          </button>
          <button className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left">
            <div className="text-red-600 text-2xl mb-2">🚨</div>
            <div className="font-medium text-gray-900">Handle Reports</div>
            <div className="text-sm text-gray-600">{stats.pendingReports} pending</div>
          </button>
          <button className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left">
            <div className="text-green-600 text-2xl mb-2">✅</div>
            <div className="font-medium text-gray-900">Verify Users</div>
            <div className="text-sm text-gray-600">KYC verification</div>
          </button>
          <button className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left">
            <div className="text-blue-600 text-2xl mb-2">📊</div>
            <div className="font-medium text-gray-900">View Logs</div>
            <div className="text-sm text-gray-600">Activity history</div>
          </button>
        </div>
      </div>
    </div>
  );
};





export default AdminDashboardPage;