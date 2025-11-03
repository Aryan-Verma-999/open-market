import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Home, Search, Plus, MessageCircle, User, Bell } from 'lucide-react'

interface MobileNavigationProps {
  isAuthenticated?: boolean
  onAuthAction?: () => void
}

export function MobileNavigation({ isAuthenticated = false, onAuthAction }: MobileNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const navigationItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Browse', href: '/browse', icon: Search },
    { name: 'Sell', href: '/sell', icon: Plus },
    { name: 'Messages', href: '/messages', icon: MessageCircle, authRequired: true },
    { name: 'Dashboard', href: '/dashboard', icon: User, authRequired: true }
  ]

  const isActivePath = (path: string) => {
    return location.pathname === path
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-4">
          <Link to="/" className="text-xl font-bold text-primary-600">
            Equipment Marketplace
          </Link>
          
          <div className="flex items-center space-x-2">
            {isAuthenticated && (
              <button className="touch-target p-2 text-gray-600 hover:text-primary-600">
                <Bell className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="touch-target p-2 text-gray-600 hover:text-primary-600"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Mobile Menu */}
      <div className={`lg:hidden fixed top-16 right-0 bottom-0 w-80 max-w-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
        isMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <nav className="flex-1 py-4">
            {navigationItems.map((item) => {
              if (item.authRequired && !isAuthenticated) return null
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`mobile-nav-item ${
                    isActivePath(item.href) ? 'text-primary-600 bg-primary-50' : ''
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          <div className="border-t border-gray-200 p-4 space-y-2">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="btn btn-outline w-full"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMenuOpen(false)}
                  className="btn btn-primary w-full"
                >
                  Register
                </Link>
              </>
            ) : (
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  onAuthAction?.()
                }}
                className="btn btn-outline w-full"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-5 h-16">
          {navigationItems.slice(0, 5).map((item) => {
            if (item.authRequired && !isAuthenticated) {
              return (
                <Link
                  key={item.name}
                  to="/login"
                  className="flex flex-col items-center justify-center space-y-1 text-gray-400 hover:text-primary-600"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs">{item.name}</span>
                </Link>
              )
            }
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center space-y-1 ${
                  isActivePath(item.href)
                    ? 'text-primary-600'
                    : 'text-gray-400 hover:text-primary-600'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

export function MobileSearchBar() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="lg:hidden px-4 py-3 bg-gray-50 border-b">
      <div className={`transition-all duration-300 ${isExpanded ? 'space-y-3' : ''}`}>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search equipment..."
            className="input flex-1"
            onFocus={() => setIsExpanded(true)}
            onBlur={() => setIsExpanded(false)}
          />
          <button className="btn btn-primary px-6">
            <Search className="h-4 w-4" />
          </button>
        </div>
        
        {isExpanded && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['Food & Beverage', 'Manufacturing', 'Office', 'Technology'].map((category) => (
              <button
                key={category}
                className="btn btn-outline btn-sm whitespace-nowrap"
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}