interface QuoteStatusCardProps {
  status: string;
  count: number;
}

export function QuoteStatusCard({ status, count }: QuoteStatusCardProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Pending',
          color: 'text-yellow-600 bg-yellow-50',
          icon: '⏳'
        };
      case 'ACCEPTED':
        return {
          label: 'Accepted',
          color: 'text-green-600 bg-green-50',
          icon: '✅'
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          color: 'text-red-600 bg-red-50',
          icon: '❌'
        };
      case 'COUNTERED':
        return {
          label: 'Countered',
          color: 'text-blue-600 bg-blue-50',
          icon: '🔄'
        };
      default:
        return {
          label: status,
          color: 'text-gray-600 bg-gray-50',
          icon: '📝'
        };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${statusInfo.color}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{statusInfo.icon}</span>
        <span className="font-medium">{statusInfo.label}</span>
      </div>
      <span className="font-bold text-lg">{count}</span>
    </div>
  );
}