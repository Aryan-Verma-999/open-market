import { useState } from 'react';
import { dashboardService } from '@/services/dashboardService';

interface QuoteCardProps {
  quote: any;
  onStatusUpdate: () => void;
}

export function QuoteCard({ quote, onStatusUpdate }: QuoteCardProps) {
  const [loading, setLoading] = useState(false);
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterTerms, setCounterTerms] = useState('');

  const handleStatusUpdate = async (status: 'ACCEPTED' | 'REJECTED' | 'COUNTERED') => {
    try {
      setLoading(true);
      
      if (status === 'COUNTERED') {
        if (!counterAmount) {
          alert('Please enter a counter amount');
          return;
        }
        
        await dashboardService.updateQuoteStatus(
          quote.id, 
          status, 
          parseFloat(counterAmount),
          counterTerms
        );
      } else {
        await dashboardService.updateQuoteStatus(quote.id, status);
      }
      
      setShowCounterForm(false);
      onStatusUpdate();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to update quote');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600';
      case 'ACCEPTED':
        return 'text-green-600';
      case 'REJECTED':
        return 'text-red-600';
      case 'COUNTERED':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSenderName = () => {
    if (quote.sender) {
      return `${quote.sender.firstName} ${quote.sender.lastName}`;
    }
    return 'Unknown User';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-gray-900 text-sm">
            {getSenderName()}
          </p>
          <p className="text-xs text-gray-500">
            {quote.listing?.title}
          </p>
        </div>
        <span className={`text-xs font-medium ${getStatusColor(quote.quoteStatus)}`}>
          {quote.quoteStatus}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-lg font-semibold text-gray-900">
          ₹{quote.quoteAmount?.toLocaleString()}
        </p>
        {quote.quoteTerms && (
          <p className="text-sm text-gray-600 mt-1">
            {quote.quoteTerms}
          </p>
        )}
      </div>

      {quote.quoteStatus === 'PENDING' && (
        <div className="space-y-2">
          {!showCounterForm ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusUpdate('ACCEPTED')}
                disabled={loading}
                className="btn btn-primary text-xs flex-1"
              >
                Accept
              </button>
              <button
                onClick={() => setShowCounterForm(true)}
                disabled={loading}
                className="btn btn-outline text-xs flex-1"
              >
                Counter
              </button>
              <button
                onClick={() => handleStatusUpdate('REJECTED')}
                disabled={loading}
                className="btn btn-secondary text-xs flex-1"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Counter amount"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <textarea
                placeholder="Terms (optional)"
                value={counterTerms}
                onChange={(e) => setCounterTerms(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusUpdate('COUNTERED')}
                  disabled={loading}
                  className="btn btn-primary text-xs flex-1"
                >
                  Send Counter
                </button>
                <button
                  onClick={() => setShowCounterForm(false)}
                  disabled={loading}
                  className="btn btn-outline text-xs flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}