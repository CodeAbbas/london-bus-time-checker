"use client"

import { useState, useCallback, useMemo, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, ChevronDown, ChevronUp, Bus, Zap } from "lucide-react"

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

interface NearbyStopsListProps {
  stops: BusStop[]
  onStopSelect: (stop: BusStop) => void
}

// --- MEMOIZED COMPACT STOP CARD COMPONENT ---
const StopCard = memo(
  ({ stop, index, onSelect }: { stop: BusStop; index: number; onSelect: (stop: BusStop) => void }) => {
    // Memoized formatted data
    const stopIndicator = useMemo(
      () => stop.indicator?.replace("Stop ", "").trim() || "B",
      [stop.indicator]
    )
    
    const distanceText = useMemo(
      () => (stop.distance ? `${(stop.distance * 0.000621371).toFixed(1)}m` : null),
      [stop.distance]
    )
    
    const walkingTime = useMemo(
      () => stop.walkingTime || Math.round((stop.distance || 0) / 1.4 / 60),
      [stop.walkingTime, stop.distance]
    )

    // Extract "Towards" cleanly
    const towards = useMemo(() => {
      const prop = stop.additionalProperties?.find((p) => p.key.toLowerCase() === "towards")
      return prop ? prop.value : null
    }, [stop.additionalProperties])

    return (
      <button
        onClick={() => onSelect(stop)}
        className="group w-full relative pl-3 pr-4 py-3 bg-white hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-all active:bg-blue-50/50 flex items-center gap-3 text-left"
        aria-label={`View arrivals for ${stop.commonName}`}
      >
        {/* Compact Themed Icon (40x40px) */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 bg-tfl-red rounded-lg shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all flex items-center justify-center border border-white/10">
            <span className="text-white font-black text-lg leading-none font-sans">
              {stopIndicator}
            </span>
          </div>
        </div>

        {/* Dense Content Layout */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex justify-between items-baseline mb-0.5">
            <h3 className="font-bold text-tfl-dark text-[1.2rem] truncate pr-2 group-hover:text-tfl-blue transition-colors">
              {stop.commonName}
            </h3>
            {/* Distance Pill - Top Right */}
            {distanceText && (
              <span className="shrink-0 text-[10px] font-bold text-tfl-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md group-hover:bg-blue-100 group-hover:text-tfl-blue transition-colors">
                {distanceText}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center">
            {/* Direction - Truncated */}
            <div className="flex items-center gap-1.5 text-xs text-tfl-gray-500 max-w-[75%]">
              {towards ? (
                <>
                  <span className="text-[9px] uppercase font-bold text-tfl-gray-400 tracking-wider shrink-0">
                    To
                  </span>
                  <span className="truncate font-medium">{towards}</span>
                </>
              ) : (
                <span className="text-gray-300 italic text-[10px]">No direction</span>
              )}
            </div>

            {/* Walking Time - Bottom Right */}
            <div className="flex items-center gap-1 text-[10px] font-bold text-tfl-blue">
              <span>🚶 {walkingTime} min</span>
            </div>
          </div>
        </div>
      </button>
    )
  }
)

StopCard.displayName = "StopCard"

// --- ENHANCED EMPTY STATE ---
const EmptyState = memo(() => (
  <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl ring-1 ring-tfl-gray-200/50">
    <CardContent className="p-12 text-center flex flex-col items-center justify-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-tfl-gray-100 to-tfl-gray-200 rounded-2xl flex items-center justify-center shadow-inner">
          <Bus className="h-10 w-10 text-tfl-gray-400" aria-hidden="true" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-tfl-red/20 rounded-full flex items-center justify-center">
          <span className="text-tfl-red text-xl">!</span>
        </div>
      </div>
      <h3 className="text-header text-tfl-dark mb-3">No Nearby Stops</h3>
      <p className="text-timing text-tfl-gray-600 max-w-sm mx-auto leading-relaxed">
        We couldn't find any bus stops within 500m of your location. Try moving to a different area
        or expanding your search radius.
      </p>
    </CardContent>
  </Card>
))

EmptyState.displayName = "EmptyState"

// --- MAIN COMPONENT ---
export const NearbyStopsList = memo(({ stops, onStopSelect }: NearbyStopsListProps) => {
  const [visibleCount, setVisibleCount] = useState(5)

  // Memoized callbacks
  const handleShowMore = useCallback(() => {
    setVisibleCount((prevCount) => Math.min(prevCount + 5, stops.length))
  }, [stops.length])

  const handleShowAll = useCallback(() => {
    setVisibleCount(stops.length)
  }, [stops.length])

  const handleShowLess = useCallback(() => {
    setVisibleCount(5)
  }, [])

  // Memoized calculations
  const displayedStops = useMemo(() => stops.slice(0, visibleCount), [stops, visibleCount])
  const hasMoreStops = visibleCount < stops.length
  const isShowingAll = visibleCount >= stops.length

  // Stats calculations
  const stats = useMemo(() => {
    const avgDistance = stops.reduce((sum, stop) => sum + (stop.distance || 0), 0) / stops.length
    const closestStop = stops[0]
    return {
      // Convert to miles and format consistently
      avgDistance: closestStop?.distance ? (avgDistance * 0.000621371).toFixed(1) : "0.0",
      closestDistance: closestStop?.distance
        ? (closestStop.distance * 0.000621371).toFixed(1)
        : "0.0",
    }
  }, [stops])

  if (!stops.length) {
    return <EmptyState />
  }

  return (
    <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl ring-1 ring-tfl-gray-200/50 overflow-hidden">
      {/* Enhanced Header */}
      <CardHeader className="p-5 bg-gradient-to-r from-tfl-gray-50 to-blue-50/50 border-b border-tfl-gray-200/80">
        <CardTitle className="flex items-center gap-4 text-header">
          <div className="relative">
            <div className="p-3 bg-gradient-to-br from-tfl-red to-tfl-red rounded-2xl shadow-lg">
              <MapPin className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div
              className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1">
            <span className="font-black text-tfl-dark">Nearby Stops</span>
            <p className="text-timing text-tfl-gray-600 font-normal mt-0.5">
              Within 500m of your location
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-tfl-blue/10 text-tfl-blue border-tfl-blue/20 font-bold px-2 py-1.5 text-sm"
          >
            {stops.length} found
          </Badge>
        </CardTitle>

        {/* Quick stats */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-tfl-gray-200/50">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" aria-hidden="true" />
            <span className="text-tfl-gray-600">
              Closest: <span className="font-bold text-emerald-700">{stats.closestDistance}m</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-tfl-blue rounded-full" aria-hidden="true" />
            <span className="text-tfl-gray-600">
              Average: <span className="font-bold text-tfl-blue">{stats.avgDistance}m</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2">
        {/* Compact List Container: No spacing, unified border */}
        <div
          className="flex flex-col rounded-t-xl overflow-hidden border border-b-0 border-gray-200 bg-white"
          aria-label="Nearby bus stops"
        >
          {displayedStops.map((stop, index) => (
            <StopCard key={stop.id} stop={stop} index={index} onSelect={onStopSelect} />
          ))}
        </div>

        {/* Sticky Footer Actions */}
        <div className="bg-gray-50 border border-gray-200 p-2 rounded-b-xl flex items-center justify-between gap-2 shadow-sm">
          <div className="px-3 text-xs font-medium text-gray-500">
            Showing <span className="text-tfl-dark font-bold">{displayedStops.length}</span> /{" "}
            {stops.length}
          </div>

          {hasMoreStops ? (
            <div className="flex ">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowMore}
                className="h-8 text-xs font-bold border-gray-200 rounded-l-lg rounded-r-none hover:bg-white hover:text-tfl-blue hover:border-blue-200 transition-all"
              >
                <ChevronDown className="h-3 w-3 mr-1.5" />
                Load 5
              </Button>

              {!isShowingAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowAll}
                  className="h-8 text-xs font-bold border-gray-200 rounded-r-lg rounded-l-none hover:bg-white text-tfl-red hover:bg-red-50 hover:border-blue-200 transition-all"
                >
                  <Zap className="h-3 w-3 mr-1.5" />
                  Show All
                </Button>
              )}
            </div>
          ) : (
             /* Option to collapse if showing all and list is long */
             isShowingAll && stops.length > 5 && (
               <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShowLess}
                  className="h-8 text-xs font-bold text-tfl-gray-600 hover:bg-gray-100"
               >
                 <ChevronUp className="h-3 w-3 mr-1.5" />
                 Show Less
               </Button>
             )
          )}
        </div>
      </CardContent>
    </Card>
  )
})

NearbyStopsList.displayName = "NearbyStopsList"