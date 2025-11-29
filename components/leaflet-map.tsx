"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { Bus, Navigation, LocateFixed, Loader2 } from "lucide-react"

// Fix Leaflet icon issue
const fixLeafletIcons = () => {
  // Fix Leaflet default icon paths
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  })
}

// Custom marker icons
const createIcon = (color: string, size: number) => {
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

// Create stop marker icon
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

// Create bus marker icon
const busIcon = (lineName: string) => {
  return new L.DivIcon({
    className: "bus-marker",
    html: `
      <div style="
        width: 30px; 
        height: 30px; 
        background: #0019A8; 
        color: white;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 10px;
      ">${lineName}</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  })
}

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
}

interface LeafletMapProps {
  busStops: BusStop[]
  selectedStop: BusStop | null
  userLocation: UserLocation | null
  onStopSelect: (stop: BusStop) => void
}

// Component to update the map view
const MapUpdater = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])

  return null
}

// Live bus tracker component
const LiveBusTracker = ({ stopId }: { stopId: string | null }) => {
  const [buses, setBuses] = useState<BusLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const map = useMap()

  const fetchBusLocations = async () => {
    if (!stopId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/tfl/buslocation?stopId=${stopId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch bus locations")
      }

      const data = await response.json()
      setBuses(data.buses || [])
    } catch (err) {
      console.error("Error fetching bus locations:", err)
      setError("Could not fetch live bus locations")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (stopId) {
      fetchBusLocations()

      // Refresh every 30 seconds
      intervalRef.current = setInterval(() => {
        fetchBusLocations()
      }, 30000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [stopId])

  // Show loading indicator
  if (loading && buses.length === 0) {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
        <div className="flex items-center gap-2">
          <Bus className="h-4 w-4 text-tfl-blue animate-pulse" />
          <span className="text-xs font-medium text-tfl-dark">Loading live bus locations...</span>
        </div>
      </div>
    )
  }

  // Show buses on map
  return (
    <>
      {buses.map((bus) => (
        <Marker key={bus.id} position={[bus.lat, bus.lon]} icon={busIcon(bus.lineName)}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold mb-1">{bus.lineName} Bus</p>
              <p>Destination: {bus.destination}</p>
              <p className="text-xs text-gray-500">Vehicle ID: {bus.vehicleId}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Info badge showing bus count */}
      {buses.length > 0 && (
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-[1000] bg-tfl-blue text-white px-4 py-2 rounded-full shadow-md">
          <div className="flex items-center gap-2">
            <Bus className="h-4 w-4" />
            <span className="text-xs font-medium">{buses.length} buses in motion</span>
          </div>
        </div>
      )}
    </>
  )
}

// Main Leaflet Map component
export default function LeafletMap({ busStops, selectedStop, userLocation, onStopSelect }: LeafletMapProps) {
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<L.Map | null>(null)

  // Calculate map center and zoom
  const mapCenter = useMemo(() => {
    if (selectedStop) {
      return [selectedStop.lat, selectedStop.lon] as [number, number]
    } else if (userLocation) {
      return [userLocation.lat, userLocation.lng] as [number, number]
    } else if (busStops.length > 0) {
      const lats = busStops.map((stop) => stop.lat)
      const lons = busStops.map((stop) => stop.lon)
      const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2
      const centerLon = (Math.max(...lons) + Math.min(...lons)) / 2
      return [centerLat, centerLon] as [number, number]
    }

    // Default to London center
    return [51.505, -0.09] as [number, number]
  }, [selectedStop, userLocation, busStops])

  const mapZoom = useMemo(() => {
    if (selectedStop) return 16
    if (userLocation) return 15
    if (busStops.length > 0) return 14
    return 13
  }, [selectedStop, userLocation, busStops])

  // Fix Leaflet icons when component mounts
  useEffect(() => {
    fixLeafletIcons()
    setMapReady(true)
  }, [])

  // Function to center map on user location
  const centerOnUser = () => {
    if (!userLocation || !mapRef.current) return
    mapRef.current.setView([userLocation.lat, userLocation.lng], 15)
  }

  // Function to center map on selected stop
  const centerOnSelectedStop = () => {
    if (!selectedStop || !mapRef.current) return
    mapRef.current.setView([selectedStop.lat, selectedStop.lon], 16)
  }

  if (!mapReady) {
    return (
      <div className="h-full bg-tfl-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-tfl-red mx-auto mb-2" aria-hidden="true" />
          <p className="text-timing text-tfl-gray-600">Initializing map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full rounded-lg overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        whenReady={(map) => {
          mapRef.current = map.target
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Update map view when props change */}
        <MapUpdater center={mapCenter} zoom={mapZoom} />

        {/* User location marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createIcon("#0019A8", 14)}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold mb-1">Your Location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Bus stop markers */}
        {busStops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lon]}
            icon={stopIcon(stop.indicator?.replace("Stop ", "").trim() || "BUS", selectedStop?.id === stop.id)}
            eventHandlers={{
              click: () => onStopSelect(stop),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold mb-1">{stop.commonName}</p>
                {stop.indicator && <p>Stop {stop.indicator}</p>}
                {stop.distance && (
                  <p className="text-xs">
                    {(stop.distance * 0.000621371).toFixed(1)}m away •{" "}
                    {stop.walkingTime || Math.round(stop.distance / 1.4 / 60)} min walk
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full mt-2 bg-tfl-red hover:bg-red-700"
                  onClick={() => onStopSelect(stop)}
                >
                  <Bus className="h-3 w-3 mr-1" />
                  View Arrivals
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Live bus tracking */}
        <LiveBusTracker stopId={selectedStop?.id || null} />

        {/* Custom controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          {userLocation && (
            <Button
              size="icon"
              className="bg-white text-tfl-dark hover:bg-tfl-gray-100"
              onClick={centerOnUser}
              aria-label="Center on your location"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          )}

          {selectedStop && (
            <Button
              size="icon"
              className="bg-white text-tfl-dark hover:bg-tfl-gray-100"
              onClick={centerOnSelectedStop}
              aria-label="Center on selected stop"
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  )
}
