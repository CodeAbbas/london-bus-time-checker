import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const stopId = searchParams.get("stopId")

  if (!stopId) {
    return NextResponse.json({ error: "Stop ID is required" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://api.tfl.gov.uk/StopPoint/${stopId}/Arrivals`, {
      headers: {
        "Cache-Control": "no-cache",
      },
    })

    if (!response.ok) {
      throw new Error(`TfL API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform the data to match our interface
    const transformedArrivals = data.map((arrival: any) => ({
      id: arrival.id,
      lineName: arrival.lineName,
      destinationName: arrival.destinationName,
      timeToStation: arrival.timeToStation,
      expectedArrival: arrival.expectedArrival,
      vehicleId: arrival.vehicleId,
    }))

    return NextResponse.json(transformedArrivals, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    })
  } catch (error) {
    console.error("TfL Arrivals API error:", error)
    return NextResponse.json({ error: "Failed to get arrival times" }, { status: 500 })
  }
}
