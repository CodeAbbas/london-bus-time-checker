import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const stopId = searchParams.get("stopId")

  if (!stopId) {
    return NextResponse.json({ error: "Stop ID is required" }, { status: 400 })
  }

  try {
    // Get arrivals for the stop to know which bus lines to track
    const arrivalsResponse = await fetch(`https://api.tfl.gov.uk/StopPoint/${stopId}/Arrivals`, {
      headers: {
        "Cache-Control": "no-cache",
      },
    })

    if (!arrivalsResponse.ok) {
      throw new Error(`TfL API error: ${arrivalsResponse.status}`)
    }

    const arrivalsData = await arrivalsResponse.json()

    // Extract vehicle IDs from arrivals
    const vehicleIds = arrivalsData.filter((arrival: any) => arrival.vehicleId).map((arrival: any) => arrival.vehicleId)

    // If no vehicle IDs, return empty array
    if (vehicleIds.length === 0) {
      return NextResponse.json({ buses: [] })
    }

    // Get unique vehicle IDs to avoid duplicate requests
    const uniqueVehicleIds = [...new Set(vehicleIds)]

    // Get locations for up to 5 buses to avoid overloading
    const busesToTrack = uniqueVehicleIds.slice(0, 5)

    // Fetch bus locations in parallel
    const busPromises = busesToTrack.map(async (vehicleId) => {
      try {
        const response = await fetch(`https://api.tfl.gov.uk/Vehicle/${vehicleId}/Arrivals`, {
          headers: {
            "Cache-Control": "no-cache",
          },
        })

        if (!response.ok) return null

        const data = await response.json()

        // Some vehicles might not have location data
        if (!data || !data[0]) return null

        const busInfo = data[0]

        return {
          id: vehicleId,
          lineName: busInfo.lineName,
          vehicleId: busInfo.vehicleId,
          lat: busInfo.lat,
          lon: busInfo.lon,
          destination: busInfo.destinationName,
        }
      } catch (e) {
        console.error(`Error fetching bus ${vehicleId} location:`, e)
        return null
      }
    })

    const busLocations = (await Promise.all(busPromises)).filter(Boolean)

    return NextResponse.json(
      { buses: busLocations },
      {
        headers: {
          // Cache results on Vercel's Edge Network for 15 seconds
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15",
        },
      }
    )
  } catch (error) {
    console.error("TfL Bus Location API error:", error)
    return NextResponse.json({ error: "Failed to get bus locations" }, { status: 500 })
  }
}
