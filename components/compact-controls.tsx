"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
    <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
      <CardContent className="p-4">
        {/* Integrated Search & Location Bar (Approach A) */}
        <div className="relative group mb-2">
          
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
              h-12 
              pl-12 
              pr-14 
              bg-white 
              text-gray-900 
              placeholder-gray-500 
              rounded-xl 
              border border-gray-200 
              shadow-sm 
              outline-none 
              transition-all 
              duration-200
              focus:border-tfl-blue 
              focus:ring-4 
              focus:ring-blue-500/10
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
                h-9 w-9
                rounded-lg 
                transition-all 
                duration-200
                ${hasLocation 
                  ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700" 
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}
              `}
            >
              {locationLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <MapPin size={20} className={hasLocation ? "fill-current" : ""} />
              )}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {loading && (
          <div className="space-y-2 mt-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto mt-3 pr-1 custom-scrollbar">
            {searchResults.map((stop, index) => (
              <Button
                key={stop.id}
                variant="ghost"
                className="w-full justify-start h-auto p-3 text-left hover:bg-blue-50 transition-all duration-200 transform hover:scale-[1.01] rounded-xl group"
                onClick={() => handleStopSelect(stop)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="p-1.5 bg-blue-100 rounded-full flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <MapPin className="h-3 w-3 text-tfl-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate text-sm">{stop.commonName}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>Stop ID: {stop.id}</span>
                      {stop.distance && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className="text-tfl-blue font-medium">
                            {formatDistance(stop.distance)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span>{calculateWalkingTime(stop.distance)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}