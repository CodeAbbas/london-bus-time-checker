import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  try {
    // Step 1: Perform the basic search to get IDs
    const searchResponse = await fetch(
      `https://api.tfl.gov.uk/StopPoint/Search?query=${encodeURIComponent(query)}&modes=bus&maxResults=6`,
      { headers: { "Cache-Control": "no-cache" } }
    )

    if (!searchResponse.ok) throw new Error(`Search API error: ${searchResponse.status}`)
    const searchData = await searchResponse.json()
    
    // If no matches, return empty
    if (!searchData.matches || searchData.matches.length === 0) {
       return NextResponse.json({ matches: [] })
    }

    // Step 2: Extract IDs for a bulk detailed lookup
    // We limit to top 5 to keep it fast
    const topMatches = searchData.matches.slice(0, 5)
    const stopIds = topMatches.map((m: any) => m.id).join(',')

    // Step 3: Fetch full details for these specific stops
    const detailsResponse = await fetch(
      `https://api.tfl.gov.uk/StopPoint/${stopIds}`,
      { headers: { "Cache-Control": "no-cache" } }
    )
    
    if (!detailsResponse.ok) throw new Error(`Details API error: ${detailsResponse.status}`)
    const detailsData = await detailsResponse.json()

    // Handle single object vs array response from TfL (API quirk)
    const stopPoints = Array.isArray(detailsData) ? detailsData : [detailsData]

    // Step 4: Transform into our rich format
    const transformedMatches = stopPoints.map((stop: any) => {
      // Extract "Towards" property
      const towardsProp = stop.additionalProperties?.find((p: any) => p.key === "Towards")
      const towards = towardsProp ? towardsProp.value : null

      // Extract Bus Lines (just the names, e.g. "25", "86")
      const lines = stop.lines?.map((l: any) => l.name) || []

      // Clean up the indicator (e.g. "Stop K")
      const indicator = stop.indicator?.replace("Stop ", "").trim() || null

      return {
        id: stop.naptanId || stop.id,
        commonName: stop.commonName,
        lat: stop.lat,
        lon: stop.lon,
        distance: stop.distance, // might be undefined in search, but okay
        indicator: indicator,
        towards: towards,
        lines: lines.slice(0, 4) // Limit to 4 lines for UI cleanliness
      }
    })

    return NextResponse.json({ matches: transformedMatches },
      {
        headers: {
          // Cache this rich search for 1 hour to save API calls
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    )
  } catch (error) {
    console.error("TfL Search API error:", error)
    return NextResponse.json({ error: "Failed to search bus stops" }, { status: 500 })
  }
}