import { useState, useEffect, useRef } from 'react'
import { Search, Send, Paperclip, MoreVertical, Phone, Video, ArrowLeft } from 'lucide-react'
import { Message, Listing } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface Conversation {
  id: string
  listingId: string
  otherUserId: string
  otherUserName: string
  otherUserAvatar?: string
  listingTitle: string
  lastMessage: Message
  unreadCount: number
  isOnline: boolean
}

export function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [showConversationList, setShowConversationList] = useState(true)
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [quoteAmount, setQuoteAmount] = useState('')
  const [quoteTerms, setQuoteTerms] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/messages')
      const apiConversations = response.data.conversations || []
      
      // Transform API data to match our interface
      const transformedConversations: Conversation[] = apiConversations.map((conv: any) => ({
        id: conv.id,
        listingId: conv.listingId,
        otherUserId: conv.otherUser?.id,
        otherUserName: `${conv.otherUser?.firstName} ${conv.otherUser?.lastName}`,
        listingTitle: conv.listing?.title || 'Unknown Listing',
        lastMessage: conv.lastMessage || {
          id: 'no-msg',
          conversationId: conv.id,
          senderId: conv.otherUser?.id,
          receiverId: user?.id,
          listingId: conv.listingId,
          content: 'No messages yet',
          attachments: [],
          messageType: 'TEXT',
          createdAt: new Date().toISOString()
        },
        unreadCount: 0, // TODO: Implement unread count in backend
        isOnline: false // TODO: Implement online status
      }))
      
      // Always show demo conversations for development
      if (user) {
        const demoConversations = getDemoConversations(user.role)
        console.log('Loading demo conversations for role:', user.role) // Debug log
        setConversations(demoConversations)
      } else {
        setConversations(transformedConversations)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
      // Show role-specific demo conversations as fallback
      if (user) {
        const demoConversations = getDemoConversations(user.role)
        setConversations(demoConversations)
      } else {
        setConversations([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getDemoConversations = (userRole: string): Conversation[] => {
    const baseTime = Date.now()
    
    if (userRole === 'BUYER') {
      return [
        {
          id: 'demo-conv-1',
          listingId: 'demo-listing-1',
          otherUserId: 'demo-seller-1',
          otherUserName: 'Rajesh Kumar (ABC Equipment Co.)',
          listingTitle: 'Industrial Mixer - Model XYZ-2023',
          lastMessage: {
            id: 'demo-msg-1',
            conversationId: 'demo-conv-1',
            senderId: 'demo-seller-1',
            receiverId: user?.id || '',
            listingId: 'demo-listing-1',
            content: 'Thanks for your interest! I can do ₹2,35,000 as my final price.',
            attachments: [],
            messageType: 'TEXT',
            createdAt: new Date(baseTime - 2 * 60 * 60 * 1000).toISOString()
          },
          unreadCount: 1,
          isOnline: true
        },
        {
          id: 'demo-conv-2',
          listingId: 'demo-listing-2',
          otherUserId: 'demo-seller-2',
          otherUserName: 'Priya Sharma (XYZ Industries)',
          listingTitle: 'CNC Milling Machine - Haas VF-2',
          lastMessage: {
            id: 'demo-msg-2',
            conversationId: 'demo-conv-2',
            senderId: 'demo-seller-2',
            receiverId: user?.id || '',
            listingId: 'demo-listing-2',
            content: 'Machine is in Delhi, you can inspect anytime. Still has 1 year warranty.',
            attachments: [],
            messageType: 'TEXT',
            createdAt: new Date(baseTime - 4 * 60 * 60 * 1000).toISOString()
          },
          unreadCount: 0,
          isOnline: false
        },
        {
          id: 'demo-conv-3',
          listingId: 'demo-listing-3',
          otherUserId: 'demo-seller-3',
          otherUserName: 'Amit Patel (Tech Solutions)',
          listingTitle: 'Dell PowerEdge Server R740',
          lastMessage: {
            id: 'demo-msg-3',
            conversationId: 'demo-conv-3',
            senderId: user?.id || '',
            receiverId: 'demo-seller-3',
            listingId: 'demo-listing-3',
            content: 'Great! Can you include installation and setup support?',
            attachments: [],
            messageType: 'TEXT',
            createdAt: new Date(baseTime - 6 * 60 * 60 * 1000).toISOString()
          },
          unreadCount: 0,
          isOnline: true
        }
      ]
    } else if (userRole === 'SELLER') {
      return [
        {
          id: 'demo-conv-s1',
          listingId: 'demo-listing-s1',
          otherUserId: 'demo-buyer-1',
          otherUserName: 'Suresh Gupta (Food Processing Co.)',
          listingTitle: 'Your Industrial Mixer - ₹2,50,000',
          lastMessage: {
            id: 'demo-msg-s1',
            conversationId: 'demo-conv-s1',
            senderId: 'demo-buyer-1',
            receiverId: user?.id || '',
            listingId: 'demo-listing-s1',
            content: 'I can offer ₹2,25,000 for it.',
            attachments: [],
            messageType: 'QUOTE',
            quoteAmount: 225000,
            quoteStatus: 'PENDING',
            quoteTerms: 'Cash payment, pickup within 7 days',
            createdAt: new Date(baseTime - 2 * 60 * 60 * 1000).toISOString()
          },
          unreadCount: 1,
          isOnline: true
        },
        {
          id: 'demo-conv-s2',
          listingId: 'demo-listing-s2',
          otherUserId: 'demo-buyer-2',
          otherUserName: 'Meera Singh (Manufacturing Hub)',
          listingTitle: 'Your CNC Machine - ₹15,00,000',
          lastMessage: {
            id: 'demo-msg-s2',
            conversationId: 'demo-conv-s2',
            senderId: 'demo-buyer-2',
            receiverId: user?.id || '',
            listingId: 'demo-listing-s2',
            content: 'I can offer ₹14,50,000. Is that acceptable?',
            attachments: [],
            messageType: 'QUOTE',
            quoteAmount: 1450000,
            quoteStatus: 'PENDING',
            quoteTerms: 'Bank transfer, 15 days for pickup',
            createdAt: new Date(baseTime - 3 * 60 * 60 * 1000).toISOString()
          },
          unreadCount: 1,
          isOnline: false
        },
        {
          id: 'demo-conv-s3',
          listingId: 'demo-listing-s3',
          otherUserId: 'demo-buyer-3',
          otherUserName: 'Ravi Agarwal (Tech Startup)',
          listingTitle: 'Your Office Equipment Listing',
          lastMessage: {
            id: 'demo-msg-s3',
            conversationId: 'demo-conv-s3',
            senderId: 'demo-buyer-3',
            receiverId: user?.id || '',
            listingId: 'demo-listing-s3',
            content: 'I can offer ₹1,60,000 for the server.',
            attachments: [],
            messageType: 'QUOTE',
            quoteAmount: 160000,
            quoteStatus: 'ACCEPTED',
            quoteTerms: 'Immediate payment, pickup this weekend',
            createdAt: new Date(baseTime - 5 * 60 * 60 * 1000).toISOString()
          },
          unreadCount: 0,
          isOnline: true
        }
      ]
    } else if (userRole === 'ADMIN') {
      return [
        {
          id: 'demo-conv-a1',
          listingId: 'demo-listing-a1',
          otherUserId: 'demo-user-report',
          otherUserName: 'System Alert: Flagged Conversation',
          listingTitle: 'Reported: Suspicious Activity',
          lastMessage: {
            id: 'demo-msg-a1',
            conversationId: 'demo-conv-a1',
            senderId: 'system',
            receiverId: user?.id || '',
            listingId: 'demo-listing-a1',
            content: 'This conversation has been flagged for review. User reported inappropriate pricing.',
            attachments: [],
            messageType: 'SYSTEM',
            createdAt: new Date(baseTime - 30 * 60 * 1000).toISOString()
          },
          unreadCount: 3,
          isOnline: false
        },
        {
          id: 'demo-conv-a2',
          listingId: 'demo-listing-a2',
          otherUserId: 'demo-dispute',
          otherUserName: 'Dispute Resolution: Case #1234',
          listingTitle: 'Payment Dispute - CNC Machine Sale',
          lastMessage: {
            id: 'demo-msg-a2',
            conversationId: 'demo-conv-a2',
            senderId: 'system',
            receiverId: user?.id || '',
            listingId: 'demo-listing-a2',
            content: 'Buyer claims machine condition different from listing. Requires admin intervention.',
            attachments: [],
            messageType: 'SYSTEM',
            createdAt: new Date(baseTime - 2 * 60 * 60 * 1000).toISOString()
          },
          unreadCount: 1,
          isOnline: false
        },
        {
          id: 'demo-conv-a3',
          listingId: 'demo-listing-a3',
          otherUserId: 'demo-verification',
          otherUserName: 'KYC Verification: Pending Review',
          listingTitle: 'New Seller Verification Required',
          lastMessage: {
            id: 'demo-msg-a3',
            conversationId: 'demo-conv-a3',
            senderId: 'system',
            receiverId: user?.id || '',
            listingId: 'demo-listing-a3',
            content: 'New seller "TechCorp Industries" submitted documents for verification.',
            attachments: [],
            messageType: 'SYSTEM',
            createdAt: new Date(baseTime - 4 * 60 * 60 * 1000).toISOString()
          },
          unreadCount: 0,
          isOnline: false
        }
      ]
    }
    
    return []
  }

  const loadMessages = async (conversationId: string) => {
    try {
      // Try to load real messages from API first
      try {
        const response = await api.get(`/messages/conversation/${conversationId}`)
        const apiMessages = response.data.messages || []
        
        if (apiMessages.length > 0) {
          setMessages(apiMessages)
          // Mark messages as read
          setConversations(prev => 
            prev.map(conv => 
              conv.id === conversationId 
                ? { ...conv, unreadCount: 0 }
                : conv
            )
          )
          return
        }
      } catch (apiError) {
        console.log('API messages not available, using demo messages')
      }
      
      // Fallback to demo messages based on conversation and user role
      const demoMessages = getDemoMessages(conversationId, user?.role || 'BUYER')
      setMessages(demoMessages)
      
      // Mark messages as read
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      )
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const getDemoMessages = (conversationId: string, userRole: string): Message[] => {
    const baseTime = Date.now()
    const currentUserId = user?.id || 'current-user'
    
    if (userRole === 'BUYER') {
      if (conversationId === 'demo-conv-1') {
        return [
          {
            id: 'demo-msg-1-1',
            conversationId,
            senderId: currentUserId,
            receiverId: 'demo-seller-1',
            listingId: 'demo-listing-1',
            content: 'Hi! I\'m interested in your industrial mixer. Is it still available?',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-1-2',
            conversationId,
            senderId: 'demo-seller-1',
            receiverId: currentUserId,
            listingId: 'demo-listing-1',
            content: 'Yes, it\'s still available! It\'s in excellent working condition. Would you like to schedule an inspection?',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-1-3',
            conversationId,
            senderId: currentUserId,
            receiverId: 'demo-seller-1',
            listingId: 'demo-listing-1',
            content: 'That sounds great! What\'s your best price? The listing shows ₹2,50,000.',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-1-4',
            conversationId,
            senderId: currentUserId,
            receiverId: 'demo-seller-1',
            listingId: 'demo-listing-1',
            content: 'I can offer ₹2,25,000 for it.',
            attachments: [],
            messageType: 'QUOTE',
            quoteAmount: 225000,
            quoteStatus: 'PENDING',
            quoteTerms: 'Cash payment, pickup within 7 days',
            createdAt: new Date(baseTime - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-1-5',
            conversationId,
            senderId: 'demo-seller-1',
            receiverId: currentUserId,
            listingId: 'demo-listing-1',
            content: 'Thanks for your interest! I can do ₹2,35,000 as my final price. The machine is really well-maintained.',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 2 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    } else if (userRole === 'SELLER') {
      if (conversationId === 'demo-conv-s1') {
        return [
          {
            id: 'demo-msg-s1-1',
            conversationId,
            senderId: 'demo-buyer-1',
            receiverId: currentUserId,
            listingId: 'demo-listing-s1',
            content: 'Hi! I\'m interested in your industrial mixer. Is it still available?',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-s1-2',
            conversationId,
            senderId: currentUserId,
            receiverId: 'demo-buyer-1',
            listingId: 'demo-listing-s1',
            content: 'Yes, it\'s still available! It\'s in excellent working condition. Would you like to schedule an inspection?',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-s1-3',
            conversationId,
            senderId: 'demo-buyer-1',
            receiverId: currentUserId,
            listingId: 'demo-listing-s1',
            content: 'That sounds great! What\'s your best price? The listing shows ₹2,50,000.',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-s1-4',
            conversationId,
            senderId: currentUserId,
            receiverId: 'demo-buyer-1',
            listingId: 'demo-listing-s1',
            content: 'I can do ₹2,35,000 as my final price. The machine is really well-maintained.',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 1 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-s1-5',
            conversationId,
            senderId: 'demo-buyer-1',
            receiverId: currentUserId,
            listingId: 'demo-listing-s1',
            content: 'I can offer ₹2,25,000 for it.',
            attachments: [],
            messageType: 'QUOTE',
            quoteAmount: 225000,
            quoteStatus: 'PENDING',
            quoteTerms: 'Cash payment, pickup within 7 days',
            createdAt: new Date(baseTime - 2 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
      
      if (conversationId === 'demo-conv-s2') {
        return [
          {
            id: 'demo-msg-s2-1',
            conversationId,
            senderId: 'demo-buyer-2',
            receiverId: currentUserId,
            listingId: 'demo-listing-s2',
            content: 'Hello! I\'m very interested in your CNC machine. Can we discuss the price?',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-s2-2',
            conversationId,
            senderId: currentUserId,
            receiverId: 'demo-buyer-2',
            listingId: 'demo-listing-s2',
            content: 'Sure! The machine is in excellent condition. Listed price is ₹15,00,000. What did you have in mind?',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 2 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-s2-3',
            conversationId,
            senderId: 'demo-buyer-2',
            receiverId: currentUserId,
            listingId: 'demo-listing-s2',
            content: 'I can offer ₹14,50,000. Is that acceptable?',
            attachments: [],
            messageType: 'QUOTE',
            quoteAmount: 1450000,
            quoteStatus: 'PENDING',
            quoteTerms: 'Bank transfer, 15 days for pickup',
            createdAt: new Date(baseTime - 3 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
      if (conversationId === 'demo-conv-1') {
        return [
          {
            id: 'demo-msg-1-1',
            conversationId,
            senderId: currentUserId,
            receiverId: 'demo-seller-1',
            listingId: 'demo-listing-1',
            content: 'Hi! I\'m interested in your industrial mixer. Is it still available?',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-1-2',
            conversationId,
            senderId: 'demo-seller-1',
            receiverId: currentUserId,
            listingId: 'demo-listing-1',
            content: 'Yes, it\'s still available! It\'s in excellent working condition. Would you like to schedule an inspection?',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-1-3',
            conversationId,
            senderId: currentUserId,
            receiverId: 'demo-seller-1',
            listingId: 'demo-listing-1',
            content: 'That sounds great! What\'s your best price? The listing shows ₹2,50,000.',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-1-4',
            conversationId,
            senderId: 'demo-seller-1',
            receiverId: currentUserId,
            listingId: 'demo-listing-1',
            content: 'I can do ₹2,35,000 as my final price. The machine is really well-maintained.',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 1 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-1-5',
            conversationId,
            senderId: currentUserId,
            receiverId: 'demo-seller-1',
            listingId: 'demo-listing-1',
            content: 'I can offer ₹2,25,000 for it.',
            attachments: [],
            messageType: 'QUOTE',
            quoteAmount: 225000,
            quoteStatus: 'PENDING',
            quoteTerms: 'Cash payment, pickup within 7 days',
            createdAt: new Date(baseTime - 2 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
      
      if (conversationId === 'demo-conv-2') {
        return [
          {
            id: 'demo-msg-2-1',
            conversationId,
            senderId: currentUserId,
            receiverId: 'demo-seller-2',
            listingId: 'demo-listing-2',
            content: 'I\'m interested in the CNC machine. Can you tell me more about its condition?',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 1 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-2-2',
            conversationId,
            senderId: 'demo-seller-2',
            receiverId: currentUserId,
            listingId: 'demo-listing-2',
            content: 'Machine is in Delhi, you can inspect anytime. Still has 1 year warranty. Very well maintained.',
            attachments: [],
            messageType: 'TEXT',
            readAt: new Date().toISOString(),
            createdAt: new Date(baseTime - 4 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    } else if (userRole === 'ADMIN') {
      if (conversationId === 'demo-conv-a1') {
        return [
          {
            id: 'demo-msg-a1-1',
            conversationId,
            senderId: 'system',
            receiverId: currentUserId,
            listingId: 'demo-listing-a1',
            content: 'SYSTEM ALERT: User reported suspicious pricing activity in conversation between buyer_id_123 and seller_id_456.',
            attachments: [],
            messageType: 'SYSTEM',
            createdAt: new Date(baseTime - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-a1-2',
            conversationId,
            senderId: 'system',
            receiverId: currentUserId,
            listingId: 'demo-listing-a1',
            content: 'Reported Issue: Seller asking for payment outside platform. Requires immediate review.',
            attachments: [],
            messageType: 'SYSTEM',
            createdAt: new Date(baseTime - 1 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-msg-a1-3',
            conversationId,
            senderId: 'system',
            receiverId: currentUserId,
            listingId: 'demo-listing-a1',
            content: 'Action Required: Please review conversation logs and take appropriate action.',
            attachments: [],
            messageType: 'SYSTEM',
            createdAt: new Date(baseTime - 30 * 60 * 1000).toISOString()
          }
        ]
      }
    }
    
    // Default fallback messages
    return [
      {
        id: 'fallback-1',
        conversationId,
        senderId: 'other-user',
        receiverId: currentUserId,
        listingId: 'demo-listing',
        content: 'Hello! I\'m interested in your listing.',
        attachments: [],
        messageType: 'TEXT',
        readAt: new Date().toISOString(),
        createdAt: new Date(baseTime - 60 * 60 * 1000).toISOString()
      },
      {
        id: 'fallback-2',
        conversationId,
        senderId: currentUserId,
        receiverId: 'other-user',
        listingId: 'demo-listing',
        content: 'Thanks for your interest! Let me know if you have any questions.',
        attachments: [],
        messageType: 'TEXT',
        readAt: new Date().toISOString(),
        createdAt: new Date(baseTime - 30 * 60 * 1000).toISOString()
      }
    ]
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation,
      senderId: user?.id || 'current-user',
      receiverId: 'other-user',
      listingId: 'listing-1',
      content: newMessage,
      attachments: [],
      messageType: 'TEXT',
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Update the temporary message with real ID
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, id: `msg-${Date.now()}` }
            : msg
        )
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
    }
  }

  const sendQuote = async () => {
    if (!quoteAmount || !selectedConversation) return

    const tempQuote: Message = {
      id: `temp-quote-${Date.now()}`,
      conversationId: selectedConversation,
      senderId: user?.id || 'current-user',
      receiverId: 'other-user',
      listingId: 'listing-1',
      content: `Quote: ₹${parseInt(quoteAmount).toLocaleString()}`,
      attachments: [],
      messageType: 'QUOTE',
      quoteAmount: parseInt(quoteAmount),
      quoteStatus: 'PENDING',
      quoteTerms: quoteTerms || undefined,
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, tempQuote])
    setQuoteAmount('')
    setQuoteTerms('')
    setShowQuoteForm(false)

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Update the temporary message with real ID
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempQuote.id 
            ? { ...msg, id: `quote-${Date.now()}` }
            : msg
        )
      )
    } catch (error) {
      console.error('Failed to send quote:', error)
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempQuote.id))
    }
  }

  const handleQuoteAction = async (messageId: string, action: 'accept' | 'reject' | 'counter') => {
    try {
      // TODO: Implement quote action API call
      console.log('Quote action:', { messageId, action })
      
      // Update message status
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, quoteStatus: action === 'accept' ? 'ACCEPTED' : 'REJECTED' }
            : msg
        )
      )
    } catch (error) {
      console.error('Failed to handle quote action:', error)
    }
  }

  const handleQuoteResponse = async (messageId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      // Update the quote status locally
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, quoteStatus: status }
            : msg
        )
      )
      
      // Add a system message about the response
      const responseMessage: Message = {
        id: `response-${Date.now()}`,
        conversationId: selectedConversation || '',
        senderId: user?.id || 'current-user',
        receiverId: 'other-user',
        listingId: 'listing-1',
        content: status === 'ACCEPTED' 
          ? `Quote accepted! Let's proceed with the transaction.` 
          : `Quote declined. Feel free to make another offer.`,
        attachments: [],
        messageType: 'TEXT',
        createdAt: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, responseMessage])
      
      // Update conversation last message
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation
            ? { ...conv, lastMessage: responseMessage, unreadCount: 0 }
            : conv
        )
      )
      
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error('Failed to respond to quote:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const filteredConversations = conversations.filter(conv =>
    conv.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.listingTitle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedConv = conversations.find(conv => conv.id === selectedConversation)

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const renderMessage = (message: Message) => {
    const currentUserId = user?.id || 'current-user';
    
    // Fix user ID matching for demo messages
    let isOwn = false;
    if (message.senderId === currentUserId || message.senderId === user?.id) {
      isOwn = true;
    } else if (message.senderId === 'current-user' && user?.id) {
      isOwn = true;
    }
    
    if (message.messageType === 'QUOTE') {
      // Show accept/decline buttons to sellers for pending quotes they didn't send
      const showAcceptDecline = user?.role === 'SELLER' && 
        message.quoteStatus === 'PENDING' && 
        !isOwn;

      return (
        <div key={message.id} className="flex justify-center mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-900 mb-1">
                {isOwn ? 'Your Quote' : 'Quote Request'}
              </p>
              <p className="text-lg font-bold text-blue-800">
                ₹{message.quoteAmount?.toLocaleString()}
              </p>
              {message.quoteTerms && (
                <p className="text-sm text-blue-700 mt-1">{message.quoteTerms}</p>
              )}
              
              {showAcceptDecline && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleQuoteResponse(message.id, 'ACCEPTED')}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    ✓ Accept ₹{message.quoteAmount?.toLocaleString()}
                  </button>
                  <button
                    onClick={() => handleQuoteResponse(message.id, 'DECLINED')}
                    className="btn btn-outline btn-sm flex-1"
                  >
                    ✗ Decline
                  </button>
                </div>
              )}
              
              {message.quoteStatus === 'ACCEPTED' && (
                <div className="mt-2 text-green-600 text-sm font-medium">✅ Accepted</div>
              )}
              
              {message.quoteStatus === 'DECLINED' && (
                <div className="mt-2 text-red-600 text-sm font-medium">❌ Declined</div>
              )}
              
              {message.quoteStatus === 'PENDING' && !showAcceptDecline && (
                <div className="mt-2 text-yellow-600 text-sm font-medium">⏳ Pending Response</div>
              )}
            </div>
            <div className="text-center mt-2">
              <span className="text-xs text-gray-500">
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div key={message.id} className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn 
            ? 'bg-primary-600 text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <p className="text-sm">{message.content}</p>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xs ${
              isOwn ? 'text-primary-200' : 'text-gray-500'
            }`}>
              {formatMessageTime(message.createdAt)}
            </span>
            {isOwn && message.readAt && (
              <span className="text-xs text-primary-200">✓✓</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isMobile && selectedConversation && !showConversationList) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-white">
        {/* Mobile Chat Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedConversation(null)
              setShowConversationList(true)
            }}
            className="touch-target"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="font-medium text-primary-600 text-sm">
                  {selectedConv?.otherUserName.charAt(0)}
                </span>
              </div>
              {selectedConv?.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{selectedConv?.otherUserName}</p>
              <p className="text-xs text-gray-600 truncate">{selectedConv?.listingTitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="touch-target">
              <Phone className="h-5 w-5 text-gray-600" />
            </button>
            <button className="touch-target">
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t bg-white p-4">
          <div className="flex gap-2 mb-2">
            <button className="touch-target">
              <Paperclip className="h-5 w-5 text-gray-600" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="input flex-1"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="btn btn-primary px-4"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {/* Quick Actions for Buyers */}
          {user?.role === 'BUYER' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowQuoteForm(!showQuoteForm)}
                className="btn btn-outline btn-sm"
              >
                💰 Make Offer
              </button>
              <button className="btn btn-outline btn-sm">
                📅 Schedule Visit
              </button>
            </div>
          )}
          {/* Quote Form */}
          {showQuoteForm && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Make an Offer</h4>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="input flex-1"
                />
                <span className="flex items-center text-gray-600">₹</span>
              </div>
              <input
                type="text"
                placeholder="Terms (optional)"
                value={quoteTerms}
                onChange={(e) => setQuoteTerms(e.target.value)}
                className="input w-full mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={sendQuote}
                  disabled={!quoteAmount}
                  className="btn btn-primary btn-sm flex-1"
                >
                  Send Offer
                </button>
                <button
                  onClick={() => setShowQuoteForm(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container-full py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Messages</h1>
        <p className="text-gray-600">
          {user?.role === 'SELLER' && 'Manage inquiries about your equipment listings'}
          {user?.role === 'BUYER' && 'Your conversations with equipment sellers'}
          {user?.role === 'BOTH' && 'All your buying and selling conversations'}
          {user?.role === 'ADMIN' && 'Monitor platform communications'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <div className={`card flex flex-col ${isMobile && selectedConversation ? 'hidden' : ''}`}>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation.id)
                    if (isMobile) setShowConversationList(false)
                  }}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedConversation === conversation.id ? 'bg-primary-50 border-primary-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="font-medium text-primary-600 text-sm">
                          {conversation.otherUserName.charAt(0)}
                        </span>
                      </div>
                      {conversation.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {conversation.otherUserName}
                        </p>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs truncate mb-1">
                        {conversation.listingTitle}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {conversation.lastMessage.messageType === 'QUOTE' 
                          ? `Quote: ₹${conversation.lastMessage.quoteAmount?.toLocaleString()}`
                          : conversation.lastMessage.content
                        }
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Chat Area */}
        <div className={`lg:col-span-2 card flex flex-col ${isMobile && !selectedConversation ? 'hidden' : ''}`}>
          {selectedConversation && selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="font-medium text-primary-600">
                          {selectedConv.otherUserName.charAt(0)}
                        </span>
                      </div>
                      {selectedConv.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedConv.otherUserName}</p>
                      <p className="text-sm text-gray-600">{selectedConv.listingTitle}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className="touch-target">
                      <Phone className="h-5 w-5 text-gray-600" />
                    </button>
                    <button className="touch-target">
                      <Video className="h-5 w-5 text-gray-600" />
                    </button>
                    <button className="touch-target">
                      <MoreVertical className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2 mb-2">
                  <button className="touch-target">
                    <Paperclip className="h-5 w-5 text-gray-600" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="input flex-1"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="btn btn-primary"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {/* Quick Actions for Buyers */}
                {user?.role === 'BUYER' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowQuoteForm(!showQuoteForm)}
                      className="btn btn-outline btn-sm"
                    >
                      💰 Make Offer
                    </button>
                    <button className="btn btn-outline btn-sm">
                      📅 Schedule Visit
                    </button>
                  </div>
                )}
                {/* Quote Form */}
                {showQuoteForm && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Make an Offer</h4>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        className="input flex-1"
                      />
                      <span className="flex items-center text-gray-600">₹</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Terms (optional)"
                      value={quoteTerms}
                      onChange={(e) => setQuoteTerms(e.target.value)}
                      className="input w-full mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={sendQuote}
                        disabled={!quoteAmount}
                        className="btn btn-primary btn-sm flex-1"
                      >
                        Send Offer
                      </button>
                      <button
                        onClick={() => setShowQuoteForm(false)}
                        className="btn btn-outline btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2">No conversation selected</p>
                <p className="text-sm">Choose a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}