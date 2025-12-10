"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MapPin, Loader2, Bus } from 'lucide-react'

interface BusStop {
  id: string
  commonName: string
  lat: number
  lon: number
  distance ? : number
  indicator ? : string
}

interface CompactControlsProps {
  onLocationUpdate: () => void
  onStopsFound: (stops: BusStop[]) => void
  onStopSelect: (stop: BusStop) => void
  onError: (error: string) => void
  locationLoading: boolean
  hasLocation: boolean
}

export function CompactControls({
  onLocationUpdate,
  onStopsFound,
  onStopSelect,
  onError,
  locationLoading,
  hasLocation,
}: CompactControlsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState < BusStop[] > ([])
  const [loading, setLoading] = useState(false)
  
  // FIX 1: Add a ref to track if we are currently selecting an item
  // This prevents the search from firing again when we click a result
  const isSelectingRef = useRef(false)
  
  const searchBusStops = async (query: string) => {
    // If we are just selecting a result, don't search again
    if (isSelectingRef.current) {
      isSelectingRef.current = false
      return
    }
    
    if (!query.trim()) {
      setSearchResults([])
      onStopsFound([])
      return
    }
    
    setLoading(true)
    onError("")
    
    try {
      const response = await fetch(`/api/tfl/search?query=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error("Failed to search bus stops")
      
      const data = await response.json()
      const stops = data.matches || []
      setSearchResults(stops)
      onStopsFound(stops)
    } catch (err) {
      // Fail silently on search errors to not annoy user
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }
  
  const handleStopSelect = (stop: BusStop) => {
    // FIX 2: Set the flag BEFORE updating state
    isSelectingRef.current = true
    
    // 1. Update the input text to match selection
    setSearchQuery(stop.commonName)
    
    // 2. Clear results immediately to hide dropdown
    setSearchResults([])
    
    // 3. Trigger the actual selection logic (parent component)
    onStopSelect(stop)
  }
  
  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchBusStops(searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Helpers
  const formatDistance = (distance ? : number) => {
    if (!distance) return null
    if (distance < 1000) return `${Math.round(distance)}m`
    return `${(distance / 1000).toFixed(1)}km`
  }
  
  const getStopLetter = (stop: BusStop) => {
    if (stop.indicator) return stop.indicator
    return stop.commonName ? stop.commonName.charAt(0).toUpperCase() : "B"
  }
  
  return (
    <div className="w-full relative z-50 mb-6">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
          <Search size={20} />
        </div>

        <input 
          type="text"
          placeholder="Search for bus stops, routes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 pl-12 pr-14 bg-white text-gray-900 placeholder-gray-500 rounded-2xl border-none shadow-lg outline-none transition-all duration-200 focus:ring-2 focus:ring-tfl-blue/20"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onLocationUpdate}
            disabled={locationLoading}
            className={`h-10 w-10 rounded-xl transition-all duration-200 ${
              hasLocation 
                ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" 
                : "text-gray-400 hover:bg-gray-100"
            }`}
          >
            {locationLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <MapPin size={22} className={hasLocation ? "fill-current" : ""} />
            )}
          </Button>
        </div>
      </div>

      {/* Results Dropdown */}
      {(loading || searchResults.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden p-2 z-50 animate-fade-in">
          
          {loading && (
            <div className="space-y-2 p-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          )}

          {searchResults.length > 0 && !loading && (
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-1">
              {searchResults.map((stop) => (
                <Button
                  key={stop.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 text-left hover:bg-tfl-gray-50 transition-all duration-200 rounded-xl group border border-transparent hover:border-gray-100"
                  onClick={() => handleStopSelect(stop)}
                >
                  <div className="flex items-center gap-4 w-full">
                    
                    {/* Stop Letter Icon */}
                    <div className="flex-shrink-0 relative">
                      <div className="relative w-12 h-12 bg-gradient-to-br from-tfl-red to-red-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                        <span className="text-white font-bold text-xl">
                          {getStopLetter(stop)}
                        </span>
                      </div>
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="font-bold text-tfl-dark text-base truncate leading-tight">
                        {stop.commonName}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-tfl-gray-500 font-medium">
                        {/* Removed generic "Bus Stop" text */}
                        
                        {/* Only show distance if available */}
                        {stop.distance ? (
                          <div className="flex items-center gap-1">
                             <MapPin size={12} className="text-tfl-blue"/>
                             <span>{formatDistance(stop.distance)} away</span>
                          </div>
                        ) : (
                           // Fallback text if no distance (common for search)
                           <span className="text-gray-400">London</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}