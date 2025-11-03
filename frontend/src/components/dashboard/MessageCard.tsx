interface MessageCardProps {
  message: any;
}

export function MessageCard({ message }: MessageCardProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getSenderName = () => {
    if (message.sender) {
      return `${message.sender.firstName} ${message.sender.lastName}`;
    }
    return 'Unknown User';
  };

  const getMessagePreview = () => {
    if (message.messageType === 'QUOTE') {
      return `Quote: ₹${message.quoteAmount?.toLocaleString()}`;
    }
    return message.content.length > 50 
      ? `${message.content.substring(0, 50)}...`
      : message.content;
  };

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
        <span className="text-sm font-medium text-gray-600">
          {getSenderName().charAt(0)}
        </span>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">
          {getSenderName()}
        </p>
        <p className="text-gray-600 text-xs truncate">
          {getMessagePreview()}
        </p>
        <p className="text-gray-500 text-xs mt-1">
          {message.listing?.title}
        </p>
      </div>
      
      <div className="flex flex-col items-end">
        <span className="text-xs text-gray-500">
          {formatTime(message.createdAt)}
        </span>
        {!message.readAt && (
          <div className="w-2 h-2 bg-primary-600 rounded-full mt-1"></div>
        )}
      </div>
    </div>
  );
}