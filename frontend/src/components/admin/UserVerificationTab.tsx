import React, { useState, useEffect } from 'react';
import { adminService, UserForVerification } from '../../services/adminService';

const UserVerificationTab: React.FC = () => {
  const [users, setUsers] = useState<UserForVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsersForVerification(page, 20);
      setUsers(response.data.data);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to load users for verification');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserVerification = async (
    userId: string,
    kycStatus: 'VERIFIED' | 'REJECTED',
    reason?: string,
    trustBadge?: boolean
  ) => {
    try {
      setVerifyingId(userId);
      await adminService.updateUserVerification(userId, kycStatus, reason, trustBadge);
      
      // Remove the user from the current list
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      // Show success message
      alert(`User verification ${kycStatus.toLowerCase()} successfully`);
    } catch (err) {
      console.error('Error updating user verification:', err);
      alert('Failed to update user verification');
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">⚠️</div>
        <p className="text-gray-800 mb-4">{error}</p>
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">User Verification</h2>
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Verifications</h3>
          <p className="text-gray-600">All user verification requests have been processed.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onVerify={handleUserVerification}
                isVerifying={verifyingId === user.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="flex space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Individual User Card Component
interface UserCardProps {
  user: UserForVerification;
  onVerify: (id: string, status: 'VERIFIED' | 'REJECTED', reason?: string, trustBadge?: boolean) => void;
  isVerifying: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ user, onVerify, isVerifying }) => {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [trustBadge, setTrustBadge] = useState(false);

  const handleVerify = () => {
    onVerify(user.id, 'VERIFIED', undefined, trustBadge);
    setShowVerifyModal(false);
    setTrustBadge(false);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onVerify(user.id, 'REJECTED', rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
  };

  const getVerificationStatus = () => {
    const statuses = [];
    if (user.phoneVerified) statuses.push('Phone ✓');
    if (user.emailVerified) statuses.push('Email ✓');
    return statuses.length > 0 ? statuses.join(', ') : 'No verifications';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-lg">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-600">{user.phone}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowVerifyModal(true)}
            disabled={isVerifying}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isVerifying ? 'Processing...' : 'Verify'}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isVerifying}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Company</p>
          <p className="text-sm text-gray-600">{user.company || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Location</p>
          <p className="text-sm text-gray-600">{user.city}, {user.state}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Trust Score</p>
          <p className="text-sm text-gray-600">{user.trustScore}/100</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-700">Current Verifications</p>
            <p className="text-sm text-gray-600">{getVerificationStatus()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Registered</p>
            <p className="text-sm text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Verify User</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                This will mark the user as KYC verified and update their trust score.
              </p>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={trustBadge}
                  onChange={(e) => setTrustBadge(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Award trust badge (higher trust score)
                </span>
              </label>
              
              {trustBadge && (
                <p className="text-xs text-gray-500 mt-1">
                  Trust badge will set trust score to 85 instead of 70
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setTrustBadge(false);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Verify User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Verification</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={4}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserVerificationTab;