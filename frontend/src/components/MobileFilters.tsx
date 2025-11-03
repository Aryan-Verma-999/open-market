import { useState } from 'react'
import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { SearchFilters } from '@/types'

interface MobileFiltersProps {
  isOpen: boolean
  onClose: () => void
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onApply: () => void
  onClear: () => void
}

export function MobileFilters({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  onClear
}: MobileFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['category', 'price'])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const categories = [
    { id: 'food-beverage', name: 'Food & Beverage' },
    { id: 'manufacturing', name: 'Manufacturing' },
    { id: 'office', name: 'Office Equipment' },
    { id: 'technology', name: 'Technology' },
    { id: 'construction', name: 'Construction' },
    { id: 'medical', name: 'Medical Equipment' }
  ]

  const conditions = [
    { value: 'NEW', label: 'New' },
    { value: 'LIKE_NEW', label: 'Like New' },
    { value: 'GOOD', label: 'Good' },
    { value: 'FAIR', label: 'Fair' },
    { value: 'POOR', label: 'Poor' }
  ]

  const states = [
    'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan',
    'Uttar Pradesh', 'West Bengal', 'Madhya Pradesh', 'Delhi', 'Punjab'
  ]

  const handleConditionChange = (condition: string, checked: boolean) => {
    const currentConditions = filters.condition || []
    const newConditions = checked
      ? [...currentConditions, condition]
      : currentConditions.filter(c => c !== condition)
    
    onFiltersChange({ ...filters, condition: newConditions })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Filter Panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Category Filter */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('category')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-medium text-gray-900">Category</span>
              {expandedSections.includes('category') ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes('category') && (
              <div className="px-4 pb-4">
                <select
                  value={filters.categoryId || ''}
                  onChange={(e) => onFiltersChange({ ...filters, categoryId: e.target.value || undefined })}
                  className="input"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Price Range Filter */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('price')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-medium text-gray-900">Price Range</span>
              {expandedSections.includes('price') ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes('price') && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Price
                    </label>
                    <input
                      type="number"
                      placeholder="₹ 0"
                      value={filters.minPrice || ''}
                      onChange={(e) => onFiltersChange({ 
                        ...filters, 
                        minPrice: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Price
                    </label>
                    <input
                      type="number"
                      placeholder="₹ Any"
                      value={filters.maxPrice || ''}
                      onChange={(e) => onFiltersChange({ 
                        ...filters, 
                        maxPrice: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      className="input"
                    />
                  </div>
                </div>
                
                {/* Quick Price Ranges */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Under ₹50K', min: 0, max: 50000 },
                    { label: '₹50K - ₹1L', min: 50000, max: 100000 },
                    { label: '₹1L - ₹5L', min: 100000, max: 500000 },
                    { label: 'Above ₹5L', min: 500000, max: undefined }
                  ].map((range) => (
                    <button
                      key={range.label}
                      onClick={() => onFiltersChange({ 
                        ...filters, 
                        minPrice: range.min, 
                        maxPrice: range.max 
                      })}
                      className="btn btn-outline btn-sm text-xs"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Condition Filter */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('condition')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-medium text-gray-900">Condition</span>
              {expandedSections.includes('condition') ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes('condition') && (
              <div className="px-4 pb-4 space-y-2">
                {conditions.map(condition => (
                  <label key={condition.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(filters.condition || []).includes(condition.value)}
                      onChange={(e) => handleConditionChange(condition.value, e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{condition.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Location Filter */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('location')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-medium text-gray-900">Location</span>
              {expandedSections.includes('location') ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes('location') && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <select
                    value={filters.state || ''}
                    onChange={(e) => onFiltersChange({ ...filters, state: e.target.value || undefined })}
                    className="input"
                  >
                    <option value="">All States</option>
                    {states.map(state => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="Enter city name"
                    value={filters.city || ''}
                    onChange={(e) => onFiltersChange({ ...filters, city: e.target.value || undefined })}
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Other Options */}
          <div className="p-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.negotiable || false}
                onChange={(e) => onFiltersChange({ ...filters, negotiable: e.target.checked || undefined })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Negotiable price only</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 flex gap-3">
          <button
            onClick={onClear}
            className="btn btn-outline flex-1"
          >
            Clear All
          </button>
          <button
            onClick={() => {
              onApply()
              onClose()
            }}
            className="btn btn-primary flex-2"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

export function MobileFilterButton({ 
  onOpen, 
  activeFiltersCount = 0 
}: { 
  onOpen: () => void
  activeFiltersCount?: number 
}) {
  return (
    <button
      onClick={onOpen}
      className="btn btn-outline flex items-center relative"
    >
      <Filter className="h-4 w-4 mr-2" />
      Filters
      {activeFiltersCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {activeFiltersCount}
        </span>
      )}
    </button>
  )
}