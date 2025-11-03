import React, { useState, useEffect } from 'react';
import { adminService, ModerationLog } from '../../services/adminService';

const ActivityLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await adminService.getModerationLogs(page, 50);
      setLogs(response.data.data);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to load activity logs');
      console.error('Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading activity logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">⚠️</div>
        <p className="text-gray-800 mb-4">{error}</p>
        <button
          onClick={loadLogs}
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
        <h2 className="text-xl font-semibold text-gray-900">Activity Logs</h2>
        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Logs</h3>
          <p className="text-gray-600">No moderation activities have been recorded yet.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
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

// Individual Log Row Component
interface LogRowProps {
  log: ModerationLog;
}

const LogRow: React.FC<LogRowProps> = ({ log }) => {
  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'APPROVE':
        return 'bg-green-100 text-green-800';
      case 'REJECT':
        return 'bg-red-100 text-red-800';
      case 'RESOLVE':
        return 'bg-blue-100 text-blue-800';
      case 'DISMISS':
        return 'bg-gray-100 text-gray-800';
      case 'VERIFIED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'APPROVE':
        return '✅';
      case 'REJECT':
        return '❌';
      case 'RESOLVE':
        return '🔧';
      case 'DISMISS':
        return '🚫';
      case 'VERIFIED':
        return '✅';
      default:
        return '📝';
    }
  };

  const getTargetInfo = () => {
    if (log.listing) {
      return {
        type: 'Listing',
        title: log.listing.title,
        status: log.listing.status
      };
    }
    if (log.report) {
      return {
        type: 'Report',
        title: `${log.report.reason} Report`,
        status: log.report.status
      };
    }
    if (log.user) {
      return {
        type: 'User',
        title: `${log.user.firstName} ${log.user.lastName}`,
        status: log.user.kycStatus
      };
    }
    return {
      type: 'System',
      title: 'General Action',
      status: ''
    };
  };

  const targetInfo = getTargetInfo();

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div>
          <div className="font-medium">
            {new Date(log.createdAt).toLocaleDateString()}
          </div>
          <div className="text-gray-500">
            {new Date(log.createdAt).toLocaleTimeString()}
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div>
          <div className="font-medium">
            {log.admin.firstName} {log.admin.lastName}
          </div>
          <div className="text-gray-500 text-xs">
            {log.admin.email}
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getActionIcon(log.action)}</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
            {log.action}
          </span>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div>
          <div className="font-medium">{targetInfo.type}</div>
          <div className="text-gray-500 truncate max-w-xs" title={targetInfo.title}>
            {targetInfo.title}
          </div>
          {targetInfo.status && (
            <div className="text-xs text-gray-400">
              Status: {targetInfo.status}
            </div>
          )}
        </div>
      </td>
      
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="max-w-xs">
          {log.reason && (
            <div className="mb-1">
              <span className="font-medium text-gray-700">Reason:</span>
              <span className="ml-1 text-gray-600">{log.reason}</span>
            </div>
          )}
          {log.adminNotes && (
            <div>
              <span className="font-medium text-gray-700">Notes:</span>
              <span className="ml-1 text-gray-600">{log.adminNotes}</span>
            </div>
          )}
          {!log.reason && !log.adminNotes && (
            <span className="text-gray-400 italic">No additional details</span>
          )}
        </div>
      </td>
    </tr>
  );
};

export default ActivityLogsTab;