import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MobileNavigation } from './MobileNavigation'
import { useAuth } from '@/contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, logout, user } = useAuth()
  const location = useLocation()

  const handleSignOut = () => {
    logout()
  }

  const isActivePath = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <header className="hidden lg:block bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Equipment Marketplace
              </Link>
            </div>
            <nav className="flex space-x-8">
              <Link 
                to="/" 
                className={`text-gray-700 hover:text-primary-600 transition-colors ${
                  isActivePath('/') ? 'text-primary-600 font-medium' : ''
                }`}
              >
                Home
              </Link>
              <Link 
                to="/browse" 
                className={`text-gray-700 hover:text-primary-600 transition-colors ${
                  isActivePath('/browse') ? 'text-primary-600 font-medium' : ''
                }`}
              >
                Browse
              </Link>
              <Link 
                to="/sell" 
                className={`text-gray-700 hover:text-primary-600 transition-colors ${
                  isActivePath('/sell') ? 'text-primary-600 font-medium' : ''
                }`}
              >
                Sell
              </Link>
              {isAuthenticated && (
                <Link 
                  to="/messages" 
                  className={`text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/messages') ? 'text-primary-600 font-medium' : ''
                  }`}
                >
                  Messages
                </Link>
              )}
            </nav>
            <div className="flex items-center space-x-4">
              {!isAuthenticated ? (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-primary-600 transition-colors">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    Register
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/dashboard" className="text-gray-700 hover:text-primary-600 transition-colors">
                    Dashboard
                  </Link>
                  <button onClick={handleSignOut} className="btn btn-outline">
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNavigation 
        isAuthenticated={isAuthenticated} 
        onAuthAction={handleSignOut}
      />
      
      <main className="flex-1 pb-16 lg:pb-0">
        {children}
      </main>
      
      {/* Footer - Hidden on mobile to make room for bottom nav, and hidden on messages page */}
      {location.pathname !== '/messages' && (
        <footer className="hidden lg:block bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipment Marketplace</h3>
              <p className="text-gray-600 text-sm">
                Connect with trusted buyers and sellers in the equipment marketplace.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">For Buyers</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/browse" className="hover:text-primary-600">Browse Equipment</Link></li>
                <li><Link to="/categories" className="hover:text-primary-600">Categories</Link></li>
                <li><Link to="/safety" className="hover:text-primary-600">Safety Tips</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">For Sellers</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/sell" className="hover:text-primary-600">List Equipment</Link></li>
                <li><Link to="/seller-guide" className="hover:text-primary-600">Seller Guide</Link></li>
                <li><Link to="/pricing" className="hover:text-primary-600">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/help" className="hover:text-primary-600">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-primary-600">Contact Us</Link></li>
                <li><Link to="/terms" className="hover:text-primary-600">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-primary-600">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; 2024 Equipment Marketplace. All rights reserved.</p>
          </div>
        </div>
      </footer>
      )}
    </div>
  )
}