"use client"

import { useState, useCallback, useMemo, memo, useEffect, useRef } from "react"
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

// --- MEMOIZED STOP CARD COMPONENT ---
const StopCard = memo(
  ({ stop, index, onSelect }: { stop: BusStop; index: number; onSelect: (stop: BusStop) => void }) => {
    const [shouldAnimate, setShouldAnimate] = useState(false)
    const [animationReady, setAnimationReady] = useState(false)
    const textRef = useRef<HTMLParagraphElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Memoized calculations for performance
    const towardsDestination = useMemo(() => {
      const towardsProperty = stop.additionalProperties?.find((prop) => prop.key.toLowerCase() === "towards")
      return towardsProperty ? `towards ${towardsProperty.value}` : null
    }, [stop.additionalProperties])

    const stopIndicator = useMemo(() => {
      return stop.indicator?.replace("Stop ", "").trim() || "BUS"
    }, [stop.indicator])

    const formattedDistance = useMemo(() => {
      if (stop.distance === undefined) return null
      // Match arrivals panel format: convert meters to miles
      const distanceInMiles = (stop.distance * 0.000621371).toFixed(1)
      return `${distanceInMiles}m`
    }, [stop.distance])

    const walkingTime = useMemo(() => {
      return stop.walkingTime || Math.round((stop.distance || 0) / 1.4 / 60)
    }, [stop.walkingTime, stop.distance])

    const handleClick = useCallback(() => {
      onSelect(stop)
    }, [onSelect, stop])

    // Deferred animation setup for performance
    useEffect(() => {
      if (!towardsDestination) return

      // Defer animation check to prevent impact on initial load
      const deferredCheck = setTimeout(
        () => {
          requestAnimationFrame(() => {
            if (textRef.current && containerRef.current) {
              const textWidth = textRef.current.scrollWidth
              const containerWidth = containerRef.current.clientWidth

              if (textWidth > containerWidth) {
                setShouldAnimate(true)
                // Additional delay before starting animation for smooth UX
                setTimeout(() => setAnimationReady(true), 500)
              }
            }
          })
        },
        1000 + index * 100,
      ) // Stagger animation checks

      return () => clearTimeout(deferredCheck)
    }, [towardsDestination, index])

    return (
      <div
        className="group relative will-change-transform"
        style={{
          animationDelay: `${index * 60}ms`,
          transform: "translateZ(0)", // Force hardware acceleration
        }}
      >
        <button
          onClick={handleClick}
          className="w-full text-left p-4 rounded-2xl bg-white hover:bg-gradient-to-r hover:from-tfl-gray-50 hover:to-blue-50/30 border border-tfl-gray-200/60 transition-all duration-300 shadow-sm hover:shadow-xl hover:border-tfl-blue/30 focus-visible-ring group-hover:scale-[1.02] will-change-transform"
          aria-label={`View arrivals for ${stop.commonName}`}
        >
          <div className="flex items-center gap-4">
            {/* Enhanced Stop Indicator without position badge */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-tfl-red rounded-2xl blur-sm opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-tfl-red to-tfl-red rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <span className="text-white font-black text-2xl tracking-tighter drop-shadow-sm">
                    {stopIndicator}
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced Stop Information - now takes full width */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Stop name with enhanced typography */}
              <h3 className="font-bold text-stop text-tfl-dark leading-tight group-hover:text-tfl-blue transition-colors duration-300 line-clamp-2">
                {stop.commonName}
              </h3>

              {/* Direction with improved styling and infinite scroll animation */}
              {towardsDestination && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-tfl-gray-400 rounded-full flex-shrink-0" aria-hidden="true" />
                  <div
                    ref={containerRef}
                    className="flex-1 min-w-0 overflow-hidden"
                    style={{
                      maskImage: shouldAnimate
                        ? "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)"
                        : "none",
                      WebkitMaskImage: shouldAnimate
                        ? "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)"
                        : "none",
                    }}
                  >
                    <p
                      ref={textRef}
                      className={`text-timing text-tfl-gray-600 font-medium whitespace-nowrap ${
                        shouldAnimate && animationReady
                          ? "animate-infinite-scroll"
                          : shouldAnimate
                            ? "transform translate-x-0"
                            : ""
                      }`}
                      style={{
                        animationDuration: shouldAnimate
                          ? `${Math.max(8, towardsDestination.length * 0.15)}s`
                          : undefined,
                      }}
                      aria-label={shouldAnimate ? towardsDestination : undefined}
                    >
                      {shouldAnimate
                        ? `${towardsDestination} • ${towardsDestination} • ${towardsDestination}`
                        : towardsDestination}
                    </p>
                  </div>
                </div>
              )}

              {/* Distance and time info - matching arrivals panel format */}
              <div className="flex items-center gap-2 text-xs text-tfl-gray-600 pt-1">
                {formattedDistance && (
                  <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1.5 rounded-full border border-tfl-gray-200/50">
                    <MapPin className="h-3 w-3 text-tfl-blue" aria-hidden="true" />
                    <span className="font-medium">
                      {formattedDistance} • 🚶 {walkingTime} min
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>
    )
  },
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
        We couldn't find any bus stops within 500m of your location. Try moving to a different area or expanding your
        search radius.
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
  const remainingCount = stops.length - visibleCount

  // Stats calculations
  const stats = useMemo(() => {
    const avgDistance = stops.reduce((sum, stop) => sum + (stop.distance || 0), 0) / stops.length
    const closestStop = stops[0]
    return {
      // Convert to miles and format consistently
      avgDistance: closestStop?.distance ? (avgDistance * 0.000621371).toFixed(1) : "0.0",
      closestDistance: closestStop?.distance ? (closestStop.distance * 0.000621371).toFixed(1) : "0.0",
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
            <p className="text-timing text-tfl-gray-600 font-normal mt-0.5">Within 500m of your location</p>
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

      <CardContent className="p-5">
        {/* Enhanced stops list */}
        <div className="space-y-3" aria-label="Nearby bus stops">
          {displayedStops.map((stop, index) => (
            <StopCard key={stop.id} stop={stop} index={index} onSelect={onStopSelect} />
          ))}
        </div>

        {/* Enhanced action buttons */}
        {hasMoreStops && (
          <div className="mt-6 space-y-3">
            {!isShowingAll && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleShowMore}
                  className="bg-gradient-to-r from-tfl-blue/5 to-blue-50 hover:from-tfl-blue/10 hover:to-blue-100 border-tfl-blue/20 text-tfl-blue font-bold py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md"
                >
                  <ChevronDown className="h-4 w-4 mr-2" aria-hidden="true" />
                  Show 5 More
                </Button>

                <Button
                  variant="outline"
                  onClick={handleShowAll}
                  className="bg-gradient-to-r from-tfl-red/5 to-red-50 hover:from-tfl-red/10 hover:to-red-100 border-tfl-red/20 text-tfl-red font-bold py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md"
                >
                  <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
                  Show All ({remainingCount})
                </Button>
              </div>
            )}

            {isShowingAll && visibleCount > 5 && (
              <Button
                variant="outline"
                onClick={handleShowLess}
                className="w-full bg-gradient-to-r from-tfl-gray-50 to-slate-50 hover:from-tfl-gray-100 hover:to-slate-100 border-tfl-gray-200 text-tfl-dark font-bold py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md"
              >
                <ChevronUp className="h-4 w-4 mr-2" aria-hidden="true" />
                Show Less
              </Button>
            )}
          </div>
        )}

        {/* Enhanced summary card - removed the "more available" section */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-100 shadow-inner">
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white rounded-full shadow-sm">
                <MapPin className="h-4 w-4 text-tfl-blue" aria-hidden="true" />
              </div>
              <span className="text-tfl-gray-700">
                <span className="font-black text-tfl-blue">{displayedStops.length}</span>
                {displayedStops.length !== stops.length && (
                  <>
                    {" "}
                    of <span className="font-black text-tfl-blue">{stops.length}</span>
                  </>
                )}{" "}
                stops shown
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

NearbyStopsList.displayName = "NearbyStopsList"
