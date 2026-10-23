"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { MapPin, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

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

interface UserLocation {
  lat: number
  lng: number
}

interface BusMapWrapperProps {
  busStops: BusStop[]
  selectedStop: BusStop | null
  userLocation: UserLocation | null
  onStopSelect: (stop: BusStop) => void
}

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse bg-tfl-gray-50 flex items-center justify-center" role="status">
      <Skeleton className="h-full w-full rounded-none" />
      <span className="sr-only">Loading interactive map</span>
    </div>
  ),
})

export function BusMapWrapper({ busStops, selectedStop, userLocation, onStopSelect }: BusMapWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="overflow-hidden border-0 bg-white/95 shadow-xl ring-1 ring-tfl-gray-200/50">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base text-tfl-dark">
            <MapPin className="size-5 shrink-0 text-tfl-red" aria-hidden="true" />
            <span className="truncate">Interactive Map ({busStops.length} stops nearby)</span>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-expanded={isExpanded}
            aria-controls="interactive-bus-map"
            className="shrink-0"
          >
            {isExpanded ? <ChevronUp data-icon="inline-start" /> : <ChevronDown data-icon="inline-start" />}
            {isExpanded ? "Hide Map" : "Show Map"}
          </Button>
        </div>
      </CardHeader>
      {isExpanded ? (
        <CardContent id="interactive-bus-map" className="h-64 p-0 sm:h-72">
          <LeafletMap
            busStops={busStops}
            selectedStop={selectedStop}
            userLocation={userLocation}
            onStopSelect={onStopSelect}
          />
        </CardContent>
      ) : (
        <div className="h-2 bg-tfl-gray-50" aria-hidden="true" />
      )}
    </Card>
  )
}
