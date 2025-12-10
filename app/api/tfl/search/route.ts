import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://api.tfl.gov.uk/StopPoint/Search?query=${encodeURIComponent(query)}&modes=bus&maxResults=10`,
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

    // Transform the data
    const transformedMatches =
      data.matches?.map((match: any) => ({
        id: match.id,
        commonName: match.name,
        lat: match.lat,
        lon: match.lon,
        distance: match.distance,
        // The Search API often returns 'modes', we can use this to confirm it's a bus stop
        modeszh: match.modes || ["bus"], 
        // Note: Real bus line numbers (e.g. "25, 86") are rarely provided in the *Search* endpoint 
        // by TfL. We would need a secondary call to get them. 
        // For now, we will handle the UI to look correct.
      })) || []

    return NextResponse.json({ matches: transformedMatches },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    )
  } catch (error) {
    console.error("TfL Search API error:", error)
    return NextResponse.json({ error: "Failed to search bus stops" }, { status: 500 })
  }
}