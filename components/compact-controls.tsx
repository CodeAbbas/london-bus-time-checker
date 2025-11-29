"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react'

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
        {/* Compact Controls Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Location Button */}
          <Button
            onClick={onLocationUpdate}
            disabled={locationLoading}
            className={`flex-shrink-0 transition-all duration-200 transform hover:scale-[1.02] ${
              hasLocation
                ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                : "bg-gradient-to-r from-tfl-red to-red-600 hover:from-red-600 hover:to-red-700"
            }`}
          >
            {locationLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Getting Location...</span>
                <span className="sm:hidden">Loading...</span>
              </>
            ) : hasLocation ? (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Update Location</span>
                <span className="sm:hidden">Update</span>
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Use My Location</span>
                <span className="sm:hidden">Location</span>
              </>
            )}
          </Button>

          {/* Search Bar */}
          <div className="relative flex-1">
            <Input
              placeholder="Search for bus stops, routes, or areas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 border-2 border-gray-200 focus:border-blue-400 transition-colors"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Search Results */}
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {searchResults.map((stop, index) => (
              <Button
                key={stop.id}
                variant="ghost"
                className="w-full justify-start h-auto p-3 text-left hover:bg-blue-50 transition-all duration-200 transform hover:scale-[1.01]"
                onClick={() => handleStopSelect(stop)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="p-1.5 bg-blue-100 rounded-full flex-shrink-0">
                    <MapPin className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate text-sm">{stop.commonName}</div>
                    <div className="text-xs text-gray-500">Stop ID: {stop.id}</div>
                    {stop.distance && (
                      <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
                        <span>{formatDistance(stop.distance)}</span>
                        <span>•</span>
                        <span>{calculateWalkingTime(stop.distance)}</span>
                      </div>
                    )}
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
