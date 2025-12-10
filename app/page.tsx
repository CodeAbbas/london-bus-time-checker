"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, AlertCircle, Zap, Loader2, Bus } from 'lucide-react'
import dynamic from "next/dynamic"
import { CompactControls } from "@/components/compact-controls"
import { ArrivalsPanel } from "@/components/arrivals-panel"
import { NearbyStopsList } from "@/components/nearby-stops-list"
import { StatsCard } from "@/components/stats-card"
// Import the new skeleton
import { NearbyStopsSkeleton } from "@/components/skeletons"

// LocalStorage cache management
const CACHE_TTL = 60 * 1000 // 60 seconds

// Lazy loaded Leaflet Map
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-tfl-gray-50 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-tfl-red mx-auto mb-2" aria-hidden="true" />
        <p className="text-timing text-tfl-gray-600">Loading map...</p>
      </div>
    </div>
  ),
})

interface BusStop {
  id: string
  commonName: string
  lat: number
  lon: number
  distance?: number
  walkingTime?: number
  indicator?: string
  additionalProperties?: Array<{ key: string; value: string }>
}

interface BusArrival {
  id: string
  lineName: string
  destinationName: string
  timeToStation: number
  expectedArrival: string
  vehicleId: string
}

interface UserLocation {
  lat: number
  lng: number
}

// Cache management functions
const getCachedArrivals = (stopId: string) => {
  if (typeof window === "undefined") return null

  const cached = localStorage.getItem(`arrivals-${stopId}`)
  if (!cached) return null

  try {
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()

    if (now - timestamp < CACHE_TTL) {
      return { data, timestamp: new Date(timestamp) }
    }
  } catch (e) {
    console.error("Error parsing cached data", e)
  }

  return null
}

const setCachedArrivals = (stopId: string, data: BusArrival[]) => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(`arrivals-${stopId}`, JSON.stringify({ data, timestamp: Date.now() }))
  } catch (e) {
    console.error("Error caching arrival data", e)
  }
}

export default function TfLBusTracker() {
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null)
  const [busStops, setBusStops] = useState<BusStop[]>([])
  const [nearbyStops, setNearbyStops] = useState<BusStop[]>([])
  const [arrivals, setArrivals] = useState<BusArrival[]>([])
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [arrivalsLoading, setArrivalsLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showNearbyList, setShowNearbyList] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser")
      return
    }

    setLocationLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000, // Optimized timeout
          maximumAge: 300000, // Optimized cache
        })
      })

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }

      setUserLocation(location)
      setBusStops([])
      setSelectedStop(null)
      setArrivals([])

      await findNearbyStops(location.lat, location.lng)
    } catch (err) {
      setError("Unable to get your location. Please enable location services.")
      console.error("Geolocation error:", err)
    } finally {
      setLocationLoading(false)
    }
  }, [])

  const findNearbyStops = useCallback(async (lat: number, lng: number) => {
    setLoading(true)
    setError(null)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch(`/api/tfl/nearby?lat=${lat}&lng=${lng}&radius=500`, {
        signal: controller.signal,
        headers: {
          "Cache-Control": "max-age=300",
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.stopPoints || data.stopPoints.length === 0) {
        setError("No bus stops were found within 500m of your location.")
        setNearbyStops([])
        setShowNearbyList(false)
        return
      }

      setNearbyStops(data.stopPoints)
      setShowNearbyList(true)
      setSelectedStop(null)
      setArrivals([])
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Error finding nearby stops:", err)
        setError("Failed to find nearby bus stops. Please try again.")
        setNearbyStops([])
        setShowNearbyList(false)
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
        setLoading(false)
      }
    }

    return () => controller.abort()
  }, [])

  const getArrivals = useCallback(async (stopId: string) => {
    const cached = getCachedArrivals(stopId)
    if (cached) {
      setArrivals(cached.data)
      setLastUpdated(cached.timestamp)
      fetchFreshArrivals(stopId, true)
      return
    }
    fetchFreshArrivals(stopId)
  }, [])

  const fetchFreshArrivals = useCallback(async (stopId: string, isBackground = false) => {
    if (!isBackground) {
      setArrivalsLoading(true)
      setError(null)
    }

    try {
      const response = await fetch(`/api/tfl/arrivals?stopId=${stopId}`, {
        headers: {
          "Cache-Control": "max-age=30",
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Stop not found")
        }
        throw new Error("Failed to get arrivals")
      }

      const data = await response.json()
      const sortedData = data.sort((a: BusArrival, b: BusArrival) => a.timeToStation - b.timeToStation)

      setArrivals(sortedData)
      setLastUpdated(new Date())
      setCachedArrivals(stopId, sortedData)
    } catch (err) {
      console.error("Error getting arrivals:", err)
      if (!isBackground) {
        setError("Failed to get arrival times. Please try again.")
        setArrivals([])
      }
    } finally {
      if (!isBackground) {
        setArrivalsLoading(false)
      }
    }
  }, [])

  const handleStopSelect = useCallback(
    (stop: BusStop) => {
      setSelectedStop(stop)
      setShowNearbyList(false)
      getArrivals(stop.id)
    },
    [getArrivals],
  )

  const handleBackToNearby = useCallback(() => {
    setSelectedStop(null)
    setArrivals([])
    setShowNearbyList(true)
  }, [])

  const handleSearchResults = useCallback((stops: BusStop[]) => {
    setBusStops(stops)
    setShowNearbyList(false)
  }, [])

  const stats = useMemo(
    () => ({
      totalStops: nearbyStops.length,
    }),
    [nearbyStops.length],
  )

  const allStops = useMemo(
    () => [...nearbyStops, ...busStops.filter((stop) => !nearbyStops.find((ns) => ns.id === stop.id))],
    [nearbyStops, busStops],
  )

  useEffect(() => {
    if (!selectedStop) return
    const interval = setInterval(() => {
      fetchFreshArrivals(selectedStop.id)
    }, 30000)
    return () => clearInterval(interval)
  }, [selectedStop, fetchFreshArrivals])

  useEffect(() => {
    getCurrentLocation()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [getCurrentLocation])

  return (
    <div className="min-h-screen bg-tfl-gray-50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-tfl-red/10 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob will-change-transform"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-tfl-blue/10 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000 will-change-transform"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-tfl-dark/10 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000 will-change-transform"></div>
      </div>

      <div className="relative z-10 p-4 max-w-7xl mx-auto">
        <header className="text-center mb-6 animate-fade-in" role="banner">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 bg-tfl-red rounded-2xl shadow-lg">
              <Bus className="h-8 w-8 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-title text-tfl-dark">
              London Live
              <span className="sr-only">London Bus Tracker</span>
            </h1>
          </div>
        </header>

        <div className="mb-6 space-y-4">
          <CompactControls
            onLocationUpdate={getCurrentLocation}
            onStopsFound={handleSearchResults}
            onStopSelect={handleStopSelect}
            onError={setError}
            locationLoading={locationLoading}
            hasLocation={!!userLocation}
          />

          {error && (
            <Alert variant="destructive" className="animate-slide-in" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* New Skeleton Loader */}
          {loading && <NearbyStopsSkeleton />}

          {!loading && showNearbyList && nearbyStops.length > 0 && (
            <NearbyStopsList stops={nearbyStops} onStopSelect={handleStopSelect} />
          )}

          {!loading && selectedStop && (
            <ArrivalsPanel
              selectedStop={selectedStop}
              arrivals={arrivals}
              loading={arrivalsLoading}
              lastUpdated={lastUpdated}
              onRefresh={() => selectedStop && getArrivals(selectedStop.id)}
              onBack={handleBackToNearby}
              showBackButton={nearbyStops.length > 0}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <StatsCard icon={MapPin} title="Nearby Stops" value={stats.totalStops} subtitle="Within 500m" color="red" />
        </div>

        <Card className="h-[600px] backdrop-blur-sm bg-white/95 border-0 shadow-xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-header">
              <MapPin className="h-5 w-5 text-tfl-red" aria-hidden="true" />
              {selectedStop ? "Live Bus Map" : "Interactive Map"}
              {userLocation && (
                <Badge variant="secondary" className="ml-auto">
                  <Zap className="h-3 w-3 mr-1" aria-hidden="true" />
                  Live
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <LeafletMap
              busStops={allStops}
              selectedStop={selectedStop}
              userLocation={userLocation}
              onStopSelect={handleStopSelect}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}