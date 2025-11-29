"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { MapPin, Plus, Minus, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BusStop {
  id: string
  commonName: string
  lat: number
  lon: number
  distance?: number
}

interface BusMapProps {
  busStops: BusStop[]
  selectedStop: BusStop | null
  onStopSelect: (stop: BusStop) => void
}

export default function BusMap({ busStops, selectedStop, onStopSelect }: BusMapProps) {
  const [zoom, setZoom] = useState(13)
  const [center, setCenter] = useState({ lat: 51.5074, lng: -0.1278 }) // London center
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const mapRef = useRef<HTMLDivElement>(null)

  // Convert lat/lng to pixel coordinates
  const latLngToPixel = (lat: number, lng: number, mapWidth: number, mapHeight: number) => {
    const x = ((lng + 180) / 360) * mapWidth
    const latRad = (lat * Math.PI) / 180
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
    const y = mapHeight / 2 - (mapWidth * mercN) / (2 * Math.PI)
    return { x, y }
  }

  // Convert pixel coordinates to lat/lng
  const pixelToLatLng = (x: number, y: number, mapWidth: number, mapHeight: number) => {
    const lng = (x / mapWidth) * 360 - 180
    const mercN = ((mapHeight / 2 - y) * 2 * Math.PI) / mapWidth
    const lat = (Math.atan(Math.exp(mercN)) - Math.PI / 4) * 2 * (180 / Math.PI)
    return { lat, lng }
  }

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y
    setDragOffset({ x: deltaX, y: deltaY })
  }

  const handleMouseUp = () => {
    if (!isDragging) return

    setIsDragging(false)

    // Update center based on drag offset
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect()
      const centerPixel = latLngToPixel(center.lat, center.lng, rect.width, rect.height)
      const newCenterPixel = {
        x: centerPixel.x - dragOffset.x,
        y: centerPixel.y - dragOffset.y,
      }
      const newCenter = pixelToLatLng(newCenterPixel.x, newCenterPixel.y, rect.width, rect.height)
      setCenter(newCenter)
    }

    setDragOffset({ x: 0, y: 0 })
  }

  // Zoom functions
  const zoomIn = () => setZoom((prev) => Math.min(prev + 1, 18))
  const zoomOut = () => setZoom((prev) => Math.max(prev - 1, 8))
  const resetView = () => {
    setCenter({ lat: 51.5074, lng: -0.1278 })
    setZoom(13)
  }

  // Auto-center on bus stops or selected stop
  useEffect(() => {
    if (selectedStop) {
      setCenter({ lat: selectedStop.lat, lng: selectedStop.lon })
      setZoom(16)
    } else if (busStops.length > 0) {
      // Calculate bounds of all bus stops
      const lats = busStops.map((stop) => stop.lat)
      const lngs = busStops.map((stop) => stop.lon)
      const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2
      const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2
      setCenter({ lat: centerLat, lng: centerLng })
      setZoom(14)
    }
  }, [busStops, selectedStop])

  return (
    <div className="relative w-full h-full bg-gray-100 overflow-hidden rounded-b-lg">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-full cursor-move relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          backgroundImage: `url("https://tile.openstreetmap.org/${zoom}/${Math.floor(((center.lng + 180) / 360) * Math.pow(2, zoom))}/${Math.floor(((1 - Math.log(Math.tan((center.lat * Math.PI) / 180) + 1 / Math.cos((center.lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, zoom))}.png")`,
          backgroundSize: "cover",
          backgroundPosition: `${-dragOffset.x}px ${-dragOffset.y}px`,
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Bus Stop Markers */}
        {mapRef.current &&
          busStops.map((stop) => {
            const rect = mapRef.current!.getBoundingClientRect()
            const pixel = latLngToPixel(stop.lat, stop.lon, rect.width, rect.height)
            const centerPixel = latLngToPixel(center.lat, center.lng, rect.width, rect.height)

            const x = pixel.x - centerPixel.x + rect.width / 2 + dragOffset.x
            const y = pixel.y - centerPixel.y + rect.height / 2 + dragOffset.y

            // Only show markers that are within the visible area
            if (x < -20 || x > rect.width + 20 || y < -20 || y > rect.height + 20) {
              return null
            }

            return (
              <div
                key={stop.id}
                className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer z-10 group"
                style={{ left: x, top: y }}
                onClick={() => onStopSelect(stop)}
              >
                <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {stop.commonName}
                </div>
              </div>
            )
          })}

        {/* Selected Stop Marker */}
        {mapRef.current &&
          selectedStop &&
          (() => {
            const rect = mapRef.current!.getBoundingClientRect()
            const pixel = latLngToPixel(selectedStop.lat, selectedStop.lon, rect.width, rect.height)
            const centerPixel = latLngToPixel(center.lat, center.lng, rect.width, rect.height)

            const x = pixel.x - centerPixel.x + rect.width / 2 + dragOffset.x
            const y = pixel.y - centerPixel.y + rect.height / 2 + dragOffset.y

            return (
              <div className="absolute transform -translate-x-1/2 -translate-y-full z-20" style={{ left: x, top: y }}>
                <div className="bg-red-500 text-white p-3 rounded-full shadow-lg animate-pulse">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-sm rounded font-medium">
                  {selectedStop.commonName}
                </div>
              </div>
            )
          })()}
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
        <Button size="sm" variant="secondary" onClick={zoomIn} className="w-8 h-8 p-0">
          <Plus className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={zoomOut} className="w-8 h-8 p-0">
          <Minus className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={resetView} className="w-8 h-8 p-0">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        Zoom: {zoom}
      </div>

      {/* Attribution */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        © OpenStreetMap contributors
      </div>
    </div>
  )
}
