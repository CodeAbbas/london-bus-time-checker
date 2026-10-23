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

    // Transform the data to match our interface
    const transformedMatches =
      data.matches?.map((match: any) => ({
        id: match.id,
        commonName: match.name,
        lat: match.lat,
        lon: match.lon,
        distance: match.distance,
      })) || []

    return NextResponse.json({ matches: transformedMatches })
  } catch (error) {
    console.error("TfL Search API error:", error)
    return NextResponse.json({ error: "Failed to search bus stops" }, { status: 500 })
  }
}
