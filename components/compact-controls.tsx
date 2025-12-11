"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MapPin, Loader2, Navigation } from 'lucide-react'

// Updated Interface to match rich API data
interface BusStop {
  id: string
  commonName: string
  lat: number
  lon: number
  distance?: number
  indicator?: string
  towards?: string
  lines?: string[]
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
  const [searchResults, setSearchResults] = useState<BusStop[]>([])
  const [loading, setLoading] = useState(false)
  const isSelectingRef = useRef(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const searchBusStops = async (query: string) => {
    if (isSelectingRef.current) return // Don't search if we just clicked

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
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleStopSelect = (stop: BusStop) => {
    isSelectingRef.current = true
    setSearchQuery(stop.commonName)
    setSearchResults([]) // Force close dropdown
    onStopSelect(stop)
    
    // Reset selection lock after a short delay
    setTimeout(() => {
      isSelectingRef.current = false
    }, 500)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      searchBusStops(searchQuery)
    }, 400) // Slightly longer debounce for the heavier API call
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSearchResults([])
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getStopLetter = (stop: BusStop) => {
    // Prioritize the API indicator, fallback to first letter of name
    return stop.indicator || (stop.commonName ? stop.commonName.charAt(0).toUpperCase() : "B")
  }

  return (
    <div className="w-full relative z-50 mb-6" ref={dropdownRef}>
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
          <Search size={20} />
        </div>

        <input 
          type="text"
          placeholder="Search for bus stops, routes..."
          value={searchQuery}
          onChange={(e) => {
             isSelectingRef.current = false // Unlock on typing
             setSearchQuery(e.target.value)
          }}
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
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
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
                  <div className="flex items-start gap-3 w-full">
                    
                    {/* Stop Letter Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-tfl-red to-red-600 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-lg">
                          {getStopLetter(stop)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name */}
                      <div className="font-bold text-tfl-dark text-base truncate">
                        {stop.commonName}
                      </div>
                      
                      {/* Towards Information (The missing link!) */}
                      {stop.towards && (
                        <div className="flex items-center gap-1.5 text-sm text-tfl-gray-600 mt-0.5">
                          <Navigation size={12} className="text-tfl-gray-400 rotate-90" />
                          <span className="truncate font-medium">
                            towards {stop.towards}
                          </span>
                        </div>
                      )}

                      {/* Bus Lines Row */}
                      {stop.lines && stop.lines.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {stop.lines.map((line) => (
                            <span 
                              key={line}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-tfl-blue border border-blue-100"
                            >
                              {line}
                            </span>
                          ))}
                        </div>
                      )}
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