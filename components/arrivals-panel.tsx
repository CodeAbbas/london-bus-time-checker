"use client"

import { memo, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bus, RefreshCw, Clock, Zap, MapPin, ArrowLeft, Wind, Heart } from "lucide-react"
// Import the new skeleton
import { ArrivalsSkeleton } from "@/components/skeletons"

// --- INTERFACES ---
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

interface ArrivalsPanelProps {
  selectedStop: BusStop | null
  arrivals: BusArrival[]
  loading: boolean
  lastUpdated: Date | null
  onRefresh: () => void
  onBack?: () => void
  showBackButton?: boolean
}

// --- UTILITY FUNCTIONS ---
const formatArrivalTime = (seconds: number) => {
  if (seconds < 60) return "Due"
  const minutes = Math.floor(seconds / 60)
  return `${minutes}min`
}

const getArrivalColor = (seconds: number) => {
  if (seconds < 120) return "bg-tfl-red"
  if (seconds < 300) return "bg-amber-500"
  return "bg-emerald-500"
}

const getArrivalTextColor = (seconds: number) => {
  if (seconds < 120) return "text-tfl-red"
  if (seconds < 300) return "text-amber-600"
  return "text-emerald-600"
}

const formatDistanceInMiles = (distance?: number) => {
  if (!distance) return "Unknown distance"
  const distanceInMiles = (distance * 0.000621371).toFixed(1)
  return `${distanceInMiles}m away`
}

const getTowardsDestination = (stop: BusStop) => {
  const towardsProperty = stop.additionalProperties?.find((prop) => prop.key.toLowerCase() === "towards")
  return towardsProperty ? `towards ${towardsProperty.value}` : ""
}

const getStopIndicator = (stop: BusStop) => {
  return stop.indicator?.replace("Stop ", "").trim() || "BUS"
}

// --- CUSTOM HOOK FOR FAVORITES ---
const useFavorite = (stopId: string | undefined) => {
  const [isFavorite, setIsFavorite] = useState(false)
  
  useEffect(() => {
    if (!stopId) return
    const favorites = JSON.parse(localStorage.getItem("tfl-favorites") || "[]")
    setIsFavorite(favorites.includes(stopId))
  }, [stopId])
  
  const toggleFavorite = () => {
    if (!stopId) return
    
    const favorites = JSON.parse(localStorage.getItem("tfl-favorites") || "[]")
    let newFavorites
    
    if (favorites.includes(stopId)) {
      newFavorites = favorites.filter((id: string) => id !== stopId)
      setIsFavorite(false)
    } else {
      newFavorites = [...favorites, stopId]
      setIsFavorite(true)
    }
    
    localStorage.setItem("tfl-favorites", JSON.stringify(newFavorites))
    window.dispatchEvent(new Event("favorites-updated")) // Notify other components
  }
  
  return { isFavorite, toggleFavorite }
}
// --- MEMOIZED COMPONENTS ---
const EmptyState = memo(
  ({
    title,
    message,
    icon: Icon = Bus,
  }: {
    title: string
    message: string
    icon?: typeof Bus
  }) => (
    <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-2xl ring-1 ring-tfl-gray-200/50">
      <CardContent className="p-8 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-gradient-to-br from-tfl-gray-100 to-tfl-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Icon className="h-8 w-8 text-tfl-gray-400" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-tfl-dark mb-2">{title}</h3>
        <p className="text-timing text-tfl-gray-600 max-w-xs mx-auto leading-relaxed">{message}</p>
      </CardContent>
    </Card>
  ),
)

EmptyState.displayName = "EmptyState"

const ArrivalRow = memo(
  ({
    lineName,
    lineArrivals,
    index,
  }: {
    lineName: string
    lineArrivals: BusArrival[]
    index: number
  }) => {
    const nextBus = lineArrivals[0]
    const otherBuses = lineArrivals.slice(1, 3)

    return (
      <div
        className="group flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-white to-tfl-gray-50/50 border border-tfl-gray-200/60 hover:shadow-md hover:border-tfl-blue/20 transition-all duration-200 hover:scale-[1.01]"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="flex-shrink-0">
          <Badge
            variant="secondary"
            className="font-black text-lg w-16 h-12 flex items-center justify-center bg-gradient-to-br from-tfl-red to-tfl-red text-white shadow-lg hover:shadow-xl transition-shadow duration-200 rounded-xl"
          >
            {lineName}
          </Badge>
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-bold text-stop text-tfl-dark truncate group-hover:text-tfl-blue transition-colors duration-200">
            {nextBus.destinationName}
          </p>
          {otherBuses.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-tfl-gray-500">
              <Clock className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
              <span>Also at {otherBuses.map((b) => formatArrivalTime(b.timeToStation)).join(", ")}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className={`w-3 h-3 rounded-full ${getArrivalColor(nextBus.timeToStation)} shadow-sm`}
            role="presentation"
          ></div>
          <div className="text-right">
            <div className={`font-black text-xl ${getArrivalTextColor(nextBus.timeToStation)}`} aria-live="polite">
              {formatArrivalTime(nextBus.timeToStation)}
            </div>
            {nextBus.timeToStation >= 60 && (
              <div className="text-xs text-tfl-gray-500 font-medium">
                {new Date(nextBus.expectedArrival).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  },
)

ArrivalRow.displayName = "ArrivalRow"

// --- MAIN COMPONENT ---
export const ArrivalsPanel = memo(
  ({ selectedStop, arrivals, loading, lastUpdated, onRefresh, onBack, showBackButton }: ArrivalsPanelProps) => {
    const processedData = useMemo(() => {
      if (!selectedStop) return null

      const towardsDestination = getTowardsDestination(selectedStop)
      const stopIndicator = getStopIndicator(selectedStop)

      const groupedArrivals = arrivals.reduce(
        (acc, arrival) => {
          if (!acc[arrival.lineName]) {
            acc[arrival.lineName] = []
          }
          acc[arrival.lineName].push(arrival)
          return acc
        },
        {} as Record<string, BusArrival[]>,
      )

      Object.keys(groupedArrivals).forEach((lineName) => {
        groupedArrivals[lineName].sort((a, b) => a.timeToStation - b.timeToStation)
      })

      const sortedLineNames = Object.keys(groupedArrivals).sort((a, b) => {
        const numA = Number.parseInt(a.replace(/[^0-9]/g, "")) || 999
        const numB = Number.parseInt(b.replace(/[^0-9]/g, "")) || 999
        return numA - numB
      })

      return {
        towardsDestination,
        stopIndicator,
        groupedArrivals,
        sortedLineNames,
      }
    }, [selectedStop, arrivals])

    const handleRefresh = useCallback(() => {
      onRefresh()
    }, [onRefresh])

    const handleBack = useCallback(() => {
      onBack?.()
    }, [onBack])

    if (!selectedStop || !processedData) {
      return (
        <EmptyState
          title="No Stop Selected"
          message="Search for a bus stop or use your location to get started and view live arrival times."
        />
      )
    }

    const { towardsDestination, stopIndicator, groupedArrivals, sortedLineNames } = processedData

    return (
      <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl ring-1 ring-tfl-gray-200/50 overflow-hidden">
        <CardHeader className="p-5 bg-gradient-to-r from-tfl-gray-50 to-blue-50/50 border-b border-tfl-gray-200/80">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {showBackButton && onBack && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleBack}
                  className="flex-shrink-0 h-10 w-10 text-tfl-gray-500 hover:bg-white hover:shadow-md transition-all duration-200 rounded-xl"
                  aria-label="Go back to nearby stops"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Button>
              )}

              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-tfl-red rounded-xl blur-sm opacity-20"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-tfl-red to-tfl-red rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-xl tracking-tighter">{stopIndicator}</span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <CardTitle className="text-header text-tfl-dark truncate mb-1">{selectedStop.commonName}</CardTitle>
                {towardsDestination && (
                  <p className="text-timing text-tfl-gray-600 truncate font-medium">{towardsDestination}</p>
                )}
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefresh}
              disabled={loading}
              className="flex-shrink-0 h-10 w-10 text-tfl-gray-500 hover:bg-white hover:shadow-md transition-all duration-200 rounded-xl"
              aria-label="Refresh arrival times"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              <span className="sr-only">Refresh arrival times</span>
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-tfl-gray-600 mt-4 pt-3 border-t border-tfl-gray-200/50">
            {selectedStop.distance && (
              <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-full">
                <MapPin className="h-3 w-3 text-tfl-blue" aria-hidden="true" />
                <span className="font-medium">
                  {formatDistanceInMiles(selectedStop.distance)} • 🚶{" "}
                  {selectedStop.walkingTime || Math.round((selectedStop.distance || 0) / 1.4 / 60)} min
                </span>
              </div>
            )}

            {lastUpdated && (
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full">
                <Zap className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                <span className="font-medium text-emerald-700">
                  {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {loading ? (
            <ArrivalsSkeleton />
          ) : sortedLineNames.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-tfl-gray-700 uppercase tracking-wide">Live Arrivals</h3>
                <Badge variant="secondary" className="bg-tfl-blue/10 text-tfl-blue font-medium">
                  {sortedLineNames.length} routes
                </Badge>
              </div>

              <div aria-live="polite" className="space-y-3">
                {sortedLineNames.map((lineName, index) => (
                  <ArrivalRow
                    key={lineName}
                    lineName={lineName}
                    lineArrivals={groupedArrivals[lineName]}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-tfl-gray-100 to-tfl-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Wind className="h-10 w-10 text-tfl-gray-400" aria-hidden="true" />
              </div>
              <h3 className="text-header text-tfl-dark mb-3">No Arrivals</h3>
              <p className="text-timing text-tfl-gray-600 max-w-sm mx-auto leading-relaxed">
                No buses are currently scheduled for this stop. Try refreshing or check back later.
              </p>
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="mt-4 bg-tfl-blue/10 hover:bg-tfl-blue/20 border-tfl-blue/30 text-tfl-blue"
              >
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Refresh Arrivals
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  },
)

ArrivalsPanel.displayName = "ArrivalsPanel"