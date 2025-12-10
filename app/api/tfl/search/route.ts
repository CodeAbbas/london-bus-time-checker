import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://api.tfl.gov.uk/StopPoint/Search?query=${encodeURIComponent(query)}&modes=bus&maxResults=20`, // Increased maxResults to allow for filtering
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
    const rawMatches = data.matches || []

    // 1. Deduplication Logic
    // We use a Map to keep only the FIRST occurrence of each unique commonName
    const uniqueMatchesMap = new Map()
    
    rawMatches.forEach((match: any) => {
      if (!uniqueMatchesMap.has(match.name)) {
        uniqueMatchesMap.set(match.name, match)
      }
    })

    // Convert back to array and take top 5
    const uniqueMatches = Array.from(uniqueMatchesMap.values()).slice(0, 5)

    // 2. Transform Data
    const transformedMatches = uniqueMatches.map((match: any) => {
      // Extract Stop Letter if present (e.g., "Forest Road (Stop K)" -> "K")
      // Regex looks for "Stop" followed by 1-2 letters inside parentheses or at end
      const indicatorMatch = match.name.match(/(?:Stop\s+)([A-Z0-9]+)/i);
      const indicator = indicatorMatch ? indicatorMatch[1] : null;

      // Clean the name (remove "Stop K" from the display name for cleaner look)
      const cleanName = match.name.replace(/\s*\(?Stop\s+[A-Z0-9]+\)?/yi, "").trim();

      return {
        id: match.id,
        commonName: cleanName, // Use the cleaned name
        originalName: match.name, // Keep original for reference
        lat: match.lat,
        lon: match.lon,
        distance: match.distance,
        indicator: indicator, // Pass the extracted letter
      }
    })

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