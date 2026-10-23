import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const stopId = request.nextUrl.searchParams.get("stopId")
  if (!stopId || !/^[a-zA-Z0-9_-]{1,64}$/.test(stopId)) {
    return NextResponse.json({ error: "A valid stop ID is required" }, { status: 400 })
  }

  const url = new URL(`https://api.tfl.gov.uk/StopPoint/${encodeURIComponent(stopId)}/Arrivals`)
  if (process.env.TFL_PRIMARY_KEY) url.searchParams.set("app_key", process.env.TFL_PRIMARY_KEY)

  try {
    const response = await fetch(url, { next: { revalidate: 20 } })
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to get arrival times" }, {
        status: response.status === 404 ? 404 : 502,
      })
    }
    const data = await response.json()
    if (!Array.isArray(data)) throw new Error("Invalid arrivals response")
    return NextResponse.json(data.map((arrival) => ({
      id: arrival.id,
      lineName: arrival.lineName,
      destinationName: arrival.destinationName,
      timeToStation: arrival.timeToStation,
      expectedArrival: arrival.expectedArrival,
      vehicleId: arrival.vehicleId,
    })))
  } catch {
    return NextResponse.json({ error: "Failed to get arrival times" }, { status: 502 })
  }
}
