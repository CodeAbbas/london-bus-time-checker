"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MapPin, Loader2 } from 'lucide-react'

interface BusStop {
  id: string
  commonName: string
  lat: number
  lon: number
  distance?: number
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

  const searchBusStops = async (query: string) => {
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
      onError("Failed to search for bus stops. Please try again.")
      setSearchResults([])
      onStopsFound([])
    } finally {
      setLoading(false)
    }
  }

  const handleStopSelect = (stop: BusStop) => {
    onStopSelect(stop)
    setSearchResults([])
    setSearchQuery(stop.commonName)
  }

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchBusStops(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const formatDistance = (distance?: number) => {
    if (!distance) return null
    if (distance < 1000) {
      return `${Math.round(distance)}m away`
    } else {
      return `${(distance / 1000).toFixed(1)}km away`
    }
  }

  const calculateWalkingTime = (distance?: number) => {
    if (!distance) return null
    // Average walking speed: ~5 km/h = ~84 m/min
    const walkingTimeMinutes = Math.ceil(distance / 84)
    return `🚶 ${walkingTimeMinutes}min`
  }

  return (
    <div className="w-full relative z-50 mb-6">
      {/* Integrated Search & Location Bar (Standalone) */}
      <div className="relative group">
        
        {/* Left Icon (Search visual cue) */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
          <Search size={20} />
        </div>

        {/* Main Input Field */}
        <input 
          type="text"
          placeholder="Search for bus stops, routes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="
            w-full 
            h-14 
            pl-12 
            pr-14 
            bg-white 
            text-gray-900 
            placeholder-gray-500 
            rounded-2xl 
            border-none 
            
            outline-none 
            transition-all 
            duration-200
            focus:ring-2 
            focus:ring-tfl-blue/20
          "
        />

        {/* Right Action (Location Button) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onLocationUpdate}
            disabled={locationLoading}
            aria-label={hasLocation ? "Update location" : "Use current location"}
            className={`
              h-10 w-10
              rounded-xl 
              transition-all 
              duration-200
              ${hasLocation 
                ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700" 
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}
            `}
          >
            {locationLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <MapPin size={22} className={hasLocation ? "fill-current" : ""} />
            )}
          </Button>
        </div>
      </div>

      {/* Dropdown Results Container - Only renders when needed */}
      {(loading || searchResults.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden p-2 z-50">
          
          {loading && (
            <div className="space-y-2 p-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          )}

          {searchResults.length > 0 && !loading && (
            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
              {searchResults.map((stop, index) => (
                <Button
                  key={stop.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 text-left hover:bg-blue-50 transition-all duration-200 rounded-xl group"
                  onClick={() => handleStopSelect(stop)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="p-2 bg-blue-50 rounded-full flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                      <MapPin className="h-4 w-4 text-tfl-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate text-sm">{stop.commonName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span className="truncate">Stop ID: {stop.id}</span>
                        {stop.distance && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0"></span>
                            <span className="text-tfl-blue font-medium whitespace-nowrap">
                              {formatDistance(stop.distance)}
                            </span>
                          </>
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
