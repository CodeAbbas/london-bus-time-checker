"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { Bus, Navigation, LocateFixed, Loader2 } from "lucide-react"

// --- UTILS & ICONS ---

// Fix Leaflet default icon paths issues in Next.js
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  })
}

// Generic custom marker (used for User Location)
const createIcon = (color: string, size: number) => {
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

// Red Bus Stop Marker (Updates size if selected)
const stopIcon = (indicator: string | undefined, isSelected: boolean) => {
  const size = isSelected ? 36 : 30

  return new L.DivIcon({
    className: "stop-marker",
    html: `
      <div style="
        width: ${size}px; 
        height: ${size}px; 
        background: #ED1C24; 
        border-radius: 8px;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: ${isSelected ? "14px" : "12px"};
      ">${indicator || "BUS"}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

// NEW: Directional Bus Icon with Rotating Arrow & Line Tag
const directionalBusIcon = (lineName: string, bearing: number) => {
  // bearing comes from API (0-360 degrees)
  // We rotate the arrow container. Note: The arrow SVG points UP (0deg) by default.
  
  return new L.DivIcon({
    className: "bus-marker-container",
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        
        <div style="
          width: 32px; 
          height: 32px; 
          background: #0019A8; 
          border: 2px solid white; 
          border-radius: 50%; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          display: flex; 
          align-items: center; 
          justify-content: center;
          transform: rotate(${bearing}deg); 
          transition: transform 0.5s ease-out;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
             <path d="M12 2L2 22L12 18L22 22L12 2Z" />
          </svg>
        </div>

        <div style="
          position: absolute; 
          top: -8px; 
          right: -8px; 
          background: #ED1C24; 
          color: white; 
          font-weight: 800; 
          font-size: 10px; 
          padding: 2px 5px; 
          border-radius: 6px; 
          border: 1.5px solid white;
          box-shadow: 0 2px 3px rgba(0,0,0,0.2);
          z-index: 10;
          white-space: nowrap;
        ">
          ${lineName}
        </div>

      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20], // Center it
    popupAnchor: [0, -20],
  })
}

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

interface UserLocation {
  lat: number
  lng: number
}

interface BusLocation {
  id: string
  lineName: string
  vehicleId: string
  lat: number
  lon: number
  destination: string
  bearing: number // Added bearing field
}

interface LeafletMapProps {
  busStops: BusStop[]
  selectedStop: BusStop | null
  userLocation: UserLocation | null
  onStopSelect: (stop: BusStop) => void
}

// --- SUB-COMPONENTS ---

// Helper to update map view when props change
const MapUpdater = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])

  return null
}

// Component to fetch and display live buses
const LiveBusTracker = ({ stopId }: { stopId: string | null }) => {
  const [buses, setBuses] = useState<BusLocation[]>([])
  const [loading, setLoading] = useState(false)
  const map = useMap()

  const fetchBusLocations = async () => {
    if (!stopId) return

    try {
      // Don't set global loading state on every poll to avoid UI flicker
      if (buses.length === 0) setLoading(true)
      
      const response = await fetch(`/api/tfl/buslocation?stopId=${stopId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch bus locations")
      }

      const data = await response.json()
      setBuses(data.buses || [])
    } catch (err) {
      console.error("Error fetching bus locations:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setBuses([]) // Clear buses when changing stops
    if (stopId) {
      fetchBusLocations()

      // Poll every 15 seconds for smoother live movement
      const interval = setInterval(() => {
        fetchBusLocations()
      }, 15000)

      return () => clearInterval(interval)
    }
  }, [stopId])

  // Show loading pill if initial load
  if (loading && buses.length === 0) {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md border border-gray-100">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 text-tfl-blue animate-spin" />
          <span className="text-xs font-bold text-tfl-blue">Locating buses...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {buses
        .filter(bus => bus.lat && bus.lon)
        .map((bus) => (
        <Marker 
          key={bus.id} 
          position={[bus.lat, bus.lon]} 
          icon={directionalBusIcon(bus.lineName, bus.bearing || 0)}
          zIndexOffset={100} // Ensure buses sit above stop markers
        >
          <Popup closeButton={false} className="custom-popup">
            <div className="p-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-tfl-blue text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {bus.lineName}
                </span>
                <span className="text-xs font-bold text-gray-800">
                  To: {bus.destination}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono">
                ID: {bus.vehicleId}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Info Badge */}
      {buses.length > 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-tfl-dark/90 backdrop-blur text-white px-3 py-1.5 rounded-full shadow-lg border border-white/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium">{buses.length} Live Buses</span>
          </div>
        </div>
      )}
    </>
  )
}

// --- MAIN COMPONENT ---

export default function LeafletMap({ busStops, selectedStop, userLocation, onStopSelect }: LeafletMapProps) {
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<L.Map | null>(null)

  // Smart centering logic
  const mapCenter = useMemo(() => {
    if (selectedStop) {
      return [selectedStop.lat, selectedStop.lon] as [number, number]
    } else if (userLocation) {
      return [userLocation.lat, userLocation.lng] as [number, number]
    } else if (busStops.length > 0) {
      // Find geometric center of all results
      const lats = busStops.map((stop) => stop.lat)
      const lons = busStops.map((stop) => stop.lon)
      const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2
      const centerLon = (Math.max(...lons) + Math.min(...lons)) / 2
      return [centerLat, centerLon] as [number, number]
    }
    // Default: London Charing Cross
    return [51.5074, -0.1278] as [number, number]
  }, [selectedStop, userLocation, busStops])

  const mapZoom = useMemo(() => {
    if (selectedStop) return 16
    if (userLocation) return 15
    if (busStops.length > 0) return 14
    return 12
  }, [selectedStop, userLocation, busStops])

  useEffect(() => {
    fixLeafletIcons()
    setMapReady(true)
  }, [])

  // Action Handlers
  const centerOnUser = () => {
    if (!userLocation || !mapRef.current) return
    mapRef.current.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 1.5 })
  }

  const centerOnSelectedStop = () => {
    if (!selectedStop || !mapRef.current) return
    mapRef.current.flyTo([selectedStop.lat, selectedStop.lon], 17, { duration: 1 })
  }

  if (!mapReady) {
    return (
      <div className="h-full bg-tfl-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-tfl-red mx-auto mb-2" />
          <p className="text-sm font-medium text-tfl-gray-600">Loading London Map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden bg-gray-100">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false} // We will add a custom one or reposition it
        whenReady={(map) => {
          mapRef.current = map.target
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        <MapUpdater center={mapCenter} zoom={mapZoom} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createIcon("#0019A8", 16)}>
            <Popup>
              <div className="font-bold text-sm">You are here</div>
            </Popup>
          </Marker>
        )}

        {/* Bus Stop Markers */}
        {busStops
          .filter(stop => stop.lat && stop.lon) 
          .map((stop) => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lon]}
              icon={stopIcon(
                stop.indicator?.replace("Stop ", "").trim() || stop.commonName.charAt(0), 
                selectedStop?.id === stop.id
              )}
              eventHandlers={{
                click: () => onStopSelect(stop),
              }}
              zIndexOffset={selectedStop?.id === stop.id ? 1000 : 0}
            >
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <p className="font-bold text-tfl-dark mb-1">{stop.commonName}</p>
                  {stop.indicator && (
                    <span className="inline-block bg-tfl-red text-white text-[10px] px-1.5 py-0.5 rounded mb-2">
                      Stop {stop.indicator}
                    </span>
                  )}
                  {stop.distance && (
                    <p className="text-xs text-gray-600 mb-2">
                      {(stop.distance * 0.000621371).toFixed(1)}m away • {stop.walkingTime || Math.round(stop.distance / 1.4 / 60)} min
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="w-full bg-tfl-blue hover:bg-blue-800 h-8 text-xs"
                    onClick={() => onStopSelect(stop)}
                  >
                    View Arrivals
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Live Bus Layer */}
        <LiveBusTracker stopId={selectedStop?.id || null} />

        {/* Floating Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          {userLocation && (
            <Button
              size="icon"
              className="bg-white text-tfl-dark hover:bg-gray-100 shadow-md h-10 w-10 rounded-xl"
              onClick={centerOnUser}
              title="Find Me"
            >
              <Navigation className="h-5 w-5 text-tfl-blue" />
            </Button>
          )}

          {selectedStop && (
            <Button
              size="icon"
              className="bg-white text-tfl-dark hover:bg-gray-100 shadow-md h-10 w-10 rounded-xl"
              onClick={centerOnSelectedStop}
              title="Center on Stop"
            >
              <LocateFixed className="h-5 w-5 text-tfl-red" />
            </Button>
          )}
        </div>

        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  )
}