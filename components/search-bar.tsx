"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MapPin } from "lucide-react"

interface BusStop {
  id: string
  commonName: string
  lat: number
  lon: number
  distance?: number
}

interface SearchBarProps {
  onStopsFound: (stops: BusStop[]) => void
  onStopSelect: (stop: BusStop) => void
  onError: (error: string) => void
}

export function SearchBar({ onStopsFound, onStopSelect, onError }: SearchBarProps) {
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
    <div className="space-y-3">
      <div className="relative">
        <Input
          placeholder="Search for bus stops, routes, or areas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4 py-3 text-base border-gray-200 transition-colors"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      {/* Search Results */}
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {searchResults.map((stop, index) => (
            <Button
              key={stop.id}
              variant="ghost"
              className="w-full justify-start h-auto p-4 text-left hover:bg-blue-50 transition-all duration-200 transform hover:scale-[1.02]"
              onClick={() => handleStopSelect(stop)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{stop.commonName}</div>
                  <div className="text-sm text-gray-500">Stop ID: {stop.id}</div>
                  {stop.distance && (
                    <div className="text-sm text-blue-600 font-medium flex items-center gap-2">
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
    </div>
  )
}
