import React, { useState, useEffect } from 'react';
import { adminService, Report } from '../../services/adminService';

const ReportsTab: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [handlingId, setHandlingId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [page]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await adminService.getReports(page, 20);
      setReports(response.data.data);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to load reports');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (
    reportId: string,
    action: 'RESOLVE' | 'DISMISS',
    adminNotes?: string
  ) => {
    try {
      setHandlingId(reportId);
      await adminService.handleReport(reportId, action, adminNotes);
      
      // Remove the report from the current list
      setReports(prev => prev.filter(report => report.id !== reportId));
      
      // Show success message
      alert(`Report ${action.toLowerCase()}d successfully`);
    } catch (err) {
      console.error('Error handling report:', err);
      alert('Failed to handle report');
    } finally {
      setHandlingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading reports...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">⚠️</div>
        <p className="text-gray-800 mb-4">{error}</p>
        <button
          onClick={loadReports}
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
        <h2 className="text-xl font-semibold text-gray-900">Reports & Flagged Content</h2>
        <button
          onClick={loadReports}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">🚨</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Reports</h3>
          <p className="text-gray-600">All reports have been handled.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onHandle={handleReport}
                isHandling={handlingId === report.id}
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

// Individual Report Card Component
interface ReportCardProps {
  report: Report;
  onHandle: (id: string, action: 'RESOLVE' | 'DISMISS', adminNotes?: string) => void;
  isHandling: boolean;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onHandle, isHandling }) => {
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'RESOLVE' | 'DISMISS' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'SPAM': return 'bg-red-100 text-red-800';
      case 'INAPPROPRIATE_CONTENT': return 'bg-orange-100 text-orange-800';
      case 'FAKE_LISTING': return 'bg-purple-100 text-purple-800';
      case 'FRAUD': return 'bg-red-100 text-red-800';
      case 'OTHER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'SPAM': return '🚫';
      case 'INAPPROPRIATE_CONTENT': return '⚠️';
      case 'FAKE_LISTING': return '🎭';
      case 'FRAUD': return '💰';
      case 'OTHER': return '❓';
      default: return '❓';
    }
  };

  const handleAction = () => {
    if (!selectedAction) return;
    onHandle(report.id, selectedAction, adminNotes.trim() || undefined);
    setShowActionModal(false);
    setSelectedAction(null);
    setAdminNotes('');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getReasonIcon(report.reason)}</span>
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReasonColor(report.reason)}`}>
              {report.reason.replace(/_/g, ' ')}
            </span>
            <p className="text-sm text-gray-600 mt-1">
              Reported {new Date(report.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedAction('RESOLVE');
              setShowActionModal(true);
            }}
            disabled={isHandling}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isHandling ? 'Processing...' : 'Resolve'}
          </button>
          <button
            onClick={() => {
              setSelectedAction('DISMISS');
              setShowActionModal(true);
            }}
            disabled={isHandling}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reporter Info */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Reporter</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">
              {report.reporter.firstName} {report.reporter.lastName}
            </p>
            <p className="text-sm text-gray-600">{report.reporter.email}</p>
          </div>
        </div>

        {/* Reported Content */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Reported Content</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            {report.listing ? (
              <>
                <p className="text-sm font-medium text-gray-900">{report.listing.title}</p>
                <p className="text-sm text-gray-600">
                  by {report.listing.seller.firstName} {report.listing.seller.lastName}
                </p>
                <p className="text-xs text-gray-500">Status: {report.listing.status}</p>
              </>
            ) : (
              <p className="text-sm text-gray-600">User report (no specific listing)</p>
            )}
          </div>
        </div>
      </div>

      {/* Report Description */}
      {report.description && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Description</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700">{report.description}</p>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {selectedAction === 'RESOLVE' ? 'Resolve Report' : 'Dismiss Report'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {selectedAction === 'RESOLVE' 
                  ? 'This will mark the report as resolved and may take action on the reported content.'
                  : 'This will dismiss the report without taking action.'
                }
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about your decision..."
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedAction(null);
                  setAdminNotes('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                className={`px-4 py-2 text-white rounded-md ${
                  selectedAction === 'RESOLVE' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {selectedAction === 'RESOLVE' ? 'Resolve' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;