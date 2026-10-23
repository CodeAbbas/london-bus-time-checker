"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, Plus, Minus, RotateCcw, Maximize } from 'lucide-react'

interface BusStop {
  id: string
  commonName: string
  lat: number
  lon: number
  distance?: number
}

interface UserLocation {
  lat: number
  lng: number
}

interface InteractiveMapProps {
  busStops: BusStop[]
  selectedStop: BusStop | null
  userLocation: UserLocation | null
  onStopSelect: (stop: BusStop) => void
}

export default function InteractiveMap({ busStops, selectedStop, userLocation, onStopSelect }: InteractiveMapProps) {
  const [zoom, setZoom] = useState(13)
  const [center, setCenter] = useState({ lat: 51.5074, lng: -0.1278 }) // London center
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hoveredStop, setHoveredStop] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Convert lat/lng to tile coordinates
  const latLngToTile = (lat: number, lng: number, zoom: number) => {
    const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))
    const y = Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
        Math.pow(2, zoom),
    )
    return { x, y }
  }

  // Convert lat/lng to pixel coordinates
  const latLngToPixel = (lat: number, lng: number, mapWidth: number, mapHeight: number) => {
    const worldWidth = 256 * Math.pow(2, zoom)
    const worldHeight = 256 * Math.pow(2, zoom)

    const x = ((lng + 180) / 360) * worldWidth
    const latRad = (lat * Math.PI) / 180
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
    const y = worldHeight / 2 - (worldWidth * mercN) / (2 * Math.PI)

    const centerX = ((center.lng + 180) / 360) * worldWidth
    const centerLatRad = (center.lat * Math.PI) / 180
    const centerMercN = Math.log(Math.tan(Math.PI / 4 + centerLatRad / 2))
    const centerY = worldHeight / 2 - (worldWidth * centerMercN) / (2 * Math.PI)

    return {
      x: x - centerX + mapWidth / 2 + dragOffset.x,
      y: y - centerY + mapHeight / 2 + dragOffset.y,
    }
  }

  // Handle mouse events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      e.preventDefault()
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      setDragOffset({ x: deltaX, y: deltaY })
    },
    [isDragging, dragStart],
  )

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)

    // Update center based on drag offset
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect()
      const worldWidth = 256 * Math.pow(2, zoom)

      const deltaLng = (-dragOffset.x / worldWidth) * 360
      const deltaLat = (dragOffset.y / worldWidth) * 360 * Math.cos((center.lat * Math.PI) / 180)

      setCenter({
        lat: Math.max(-85, Math.min(85, center.lat + deltaLat)),
        lng: ((center.lng + deltaLng + 180) % 360) - 180,
      })
    }

    setDragOffset({ x: 0, y: 0 })
  }, [isDragging, dragOffset, center, zoom])

  // Touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({ x: touch.clientX, y: touch.clientY })
    }
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return
      e.preventDefault()
      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStart.x
      const deltaY = touch.clientY - dragStart.y
      setDragOffset({ x: deltaX, y: deltaY })
    },
    [isDragging, dragStart],
  )

  const handleTouchEnd = useCallback(() => {
    handleMouseUp()
  }, [handleMouseUp])

  // Zoom functions
  const zoomIn = useCallback(() => setZoom((prev) => Math.min(prev + 1, 18)), [])
  const zoomOut = useCallback(() => setZoom((prev) => Math.max(prev - 1, 3)), [])
  const resetView = useCallback(() => {
    setCenter({ lat: 51.5074, lng: -0.1278 })
    setZoom(13)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Auto-center on bus stops or selected stop
  useEffect(() => {
    if (selectedStop) {
      setCenter({ lat: selectedStop.lat, lng: selectedStop.lon })
      setZoom(16)
    } else if (userLocation) {
      setCenter({ lat: userLocation.lat, lng: userLocation.lng })
      setZoom(15)
    } else if (busStops.length > 0) {
      const lats = busStops.map((stop) => stop.lat)
      const lngs = busStops.map((stop) => stop.lon)
      const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2
      const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2
      setCenter({ lat: centerLat, lng: centerLng })
      setZoom(14)
    }
    setDragOffset({ x: 0, y: 0 })
  }, [selectedStop, userLocation, busStops])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const getTileUrl = (x: number, y: number, z: number) => {
    return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
  }

  const renderTiles = () => {
    if (!mapRef.current) return null

    const rect = mapRef.current.getBoundingClientRect()
    const centerTile = latLngToTile(center.lat, center.lng, zoom)
    const tilesX = Math.ceil(rect.width / 256) + 2
    const tilesY = Math.ceil(rect.height / 256) + 2

    const tiles = []
    for (let dx = -Math.floor(tilesX / 2); dx <= Math.floor(tilesX / 2); dx++) {
      for (let dy = -Math.floor(tilesY / 2); dy <= Math.floor(tilesY / 2); dy++) {
        const tileX = centerTile.x + dx
        const tileY = centerTile.y + dy

        if (tileX >= 0 && tileY >= 0 && tileX < Math.pow(2, zoom) && tileY < Math.pow(2, zoom)) {
          const left = dx * 256 + rect.width / 2 - 128 + dragOffset.x
          const top = dy * 256 + rect.height / 2 - 128 + dragOffset.y

          tiles.push(
            <img
              key={`${tileX}-${tileY}-${zoom}`}
              src={getTileUrl(tileX, tileY, zoom) || "/placeholder.svg"}
              alt=""
              className="absolute pointer-events-none select-none animate-tile-load"
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: "256px",
                height: "256px",
              }}
              draggable={false}
              crossOrigin="anonymous"
            />,
          )
        }
      }
    }
    return tiles
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 bg-white" : "rounded-b-lg"}`}
    >
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-full bg-tfl-gray-100 cursor-move relative select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        {/* Map Tiles */}
        {renderTiles()}

        {/* User Location Marker */}
        {mapRef.current &&
          userLocation &&
          (() => {
            const rect = mapRef.current!.getBoundingClientRect()
            const pixel = latLngToPixel(userLocation.lat, userLocation.lng, rect.width, rect.height)

            if (pixel.x < -50 || pixel.x > rect.width + 50 || pixel.y < -50 || pixel.y > rect.height + 50) {
              return null
            }

            return (
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30"
                style={{ left: pixel.x, top: pixel.y }}
              >
                <div className="relative">
                  <div className="w-4 h-4 bg-tfl-blue rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-tfl-blue rounded-full opacity-30 animate-ping"></div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-tfl-blue text-white text-xs rounded whitespace-nowrap">
                  Your Location
                </div>
              </div>
            )
          })()}

        {/* Bus Stop Markers */}
        {mapRef.current &&
          busStops.map((stop) => {
            const rect = mapRef.current!.getBoundingClientRect()
            const pixel = latLngToPixel(stop.lat, stop.lon, rect.width, rect.height)

            if (pixel.x < -50 || pixel.x > rect.width + 50 || pixel.y < -50 || pixel.y > rect.height + 50) {
              return null
            }

            const isSelected = selectedStop?.id === stop.id
            const isHovered = hoveredStop === stop.id

            return (
              <div
                key={stop.id}
                className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer z-20 group"
                style={{ left: pixel.x, top: pixel.y }}
                onClick={() => onStopSelect(stop)}
                onMouseEnter={() => setHoveredStop(stop.id)}
                onMouseLeave={() => setHoveredStop(null)}
              >
                {isSelected ? (
                  <div className="relative">
                    <div className="w-8 h-8 bg-tfl-red rounded-full border-3 border-white shadow-xl flex items-center justify-center animate-pulse">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <div className="absolute inset-0 w-8 h-8 bg-tfl-red rounded-full opacity-30 animate-ping"></div>
                  </div>
                ) : (
                  <div
                    className={`w-6 h-6 bg-tfl-red rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all duration-200 ${
                      isHovered ? "scale-125 bg-red-600" : ""
                    }`}
                  >
                    <MapPin className="h-3 w-3 text-white" />
                  </div>
                )}

                {/* Tooltip */}
                <div
                  className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-sm rounded-lg whitespace-nowrap transition-all duration-200 ${
                    isHovered || isSelected ? "opacity-100 visible" : "opacity-0 invisible"
                  }`}
                >
                  <div className="font-medium">{stop.commonName}</div>
                  {stop.distance && <div className="text-xs opacity-75">{Math.round(stop.distance)}m away</div>}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                </div>
              </div>
            )
          })}
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-40">
        <Button
          size="sm"
          variant="secondary"
          onClick={zoomIn}
          className="w-10 h-10 p-0 shadow-lg hover:shadow-xl transition-all bg-white/90 backdrop-blur-sm"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={zoomOut}
          className="w-10 h-10 p-0 shadow-lg hover:shadow-xl transition-all bg-white/90 backdrop-blur-sm"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={resetView}
          className="w-10 h-10 p-0 shadow-lg hover:shadow-xl transition-all bg-white/90 backdrop-blur-sm"
          aria-label="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={toggleFullscreen}
          className="w-10 h-10 p-0 shadow-lg hover:shadow-xl transition-all bg-white/90 backdrop-blur-sm"
          aria-label="Toggle fullscreen"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
        Zoom: {zoom}
      </div>

      {/* Attribution */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">
        © OpenStreetMap contributors
      </div>

      {/* Loading indicator for tiles */}
      <div className="absolute top-4 left-4 z-40">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-sm text-tfl-dark">
            <div className="w-2 h-2 bg-tfl-red rounded-full animate-pulse"></div>
            Interactive Map
          </div>
        </div>
      </div>
    </div>
  )
}
