import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "1000"

  if (!lat || !lng) {
    return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 })
  }

  try {
    // Use the same API endpoint structure as your working JavaScript code
    const response = await fetch(
      `https://api.tfl.gov.uk/StopPoint?stopTypes=NaptanPublicBusCoachTram&radius=${radius}&lat=${lat}&lon=${lng}`,
      {
        headers: {
          "Cache-Control": "no-cache",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`TfL API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform the data to match our interface, using the same structure as your JS code
    const transformedStops =
      data.stopPoints?.map((stop: any) => {
        // Calculate walking time like in your JS code (1.4 m/s walking speed)
        const walkingTimeMinutes = Math.round(stop.distance / 1.4 / 60)

        return {
          id: stop.naptanId || stop.id,
          commonName: stop.commonName,
          lat: stop.lat,
          lon: stop.lon,
          distance: stop.distance,
          walkingTime: walkingTimeMinutes,
          indicator: stop.indicator,
          // Include additional properties for "towards" information
          additionalProperties: stop.additionalProperties || [],
        }
      }) || []

    return NextResponse.json({ stopPoints: transformedStops })
  } catch (error) {
    console.error("TfL Nearby API error:", error)
    return NextResponse.json({ error: "Failed to find nearby bus stops" }, { status: 500 })
  }
}
