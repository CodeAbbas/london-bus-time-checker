import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const stopId = searchParams.get("stopId")
  
  if (!stopId) {
    return NextResponse.json({ error: "Stop ID is required" }, { status: 400 })
  }
  
  try {
    // 1. Get arrivals to identify active vehicles
    const arrivalsResponse = await fetch(`https://api.tfl.gov.uk/StopPoint/${stopId}/Arrivals`, {
      headers: { "Cache-Control": "no-cache" },
    })
    
    if (!arrivalsResponse.ok) throw new Error(`TfL API error: ${arrivalsResponse.status}`)
    const arrivalsData = await arrivalsResponse.json()
    
    // Extract unique vehicles
    const vehicleIds = [...new Set(arrivalsData
      .filter((a: any) => a.vehicleId)
      .map((a: any) => a.vehicleId))]
    
    if (vehicleIds.length === 0) return NextResponse.json({ buses: [] })
    
    // 2. Fetch details for top 5 buses
    const busesToTrack = vehicleIds.slice(0, 5)
    
    const busPromises = busesToTrack.map(async (vehicleId) => {
      try {
        const response = await fetch(`https://api.tfl.gov.uk/Vehicle/${vehicleId}/Arrivals`, {
          headers: { "Cache-Control": "no-cache" },
        })
        
        if (!response.ok) return null
        const data = await response.json()
        
        // Safety check
        if (!data || !data[0]) return null
        
        // Use the most recent prediction for location
        const busInfo = data[0]
        
        if (!busInfo.lat || !busInfo.lon) return null
        
        return {
          id: vehicleId as string,
          lineName: busInfo.lineName,
          vehicleId: busInfo.vehicleId,
          lat: busInfo.lat,
          lon: busInfo.lon,
          destination: busInfo.destinationName,
          bearing: busInfo.bearing || 0, // Capture the bearing
        }
      } catch (e) {
        return null
      }
    })
    
    const busLocations = (await Promise.all(busPromises)).filter(Boolean)
    
    return NextResponse.json({ buses: busLocations }, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15" },
    })
  } catch (error) {
    console.error("TfL Bus Location API error:", error)
    return NextResponse.json({ error: "Failed to get bus locations" }, { status: 500 })
  }
}