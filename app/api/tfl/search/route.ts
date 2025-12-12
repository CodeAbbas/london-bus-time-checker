import { type NextRequest, NextResponse } from "next/server";

// Make this route fully dynamic (no Next.js Data Cache / Edge cache)
export const revalidate = 0; // Alternatively: export const dynamic = 'force-dynamic';

const TFL_BASE = "https://api.tfl.gov.uk";
const APP_ID = process.env.TFL_APP_ID;
const APP_KEY = process.env.TFL_APP_KEY;

// Build a TfL URL with query params + app keys (better rate limits)
function tflUrl(path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(path, TFL_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  if (APP_ID && APP_KEY) {
    url.searchParams.set("app_id", APP_ID);
    url.searchParams.set("app_key", APP_KEY);
  }
  return url.toString();
}

// Heuristic: 4th char 'G' => group ID (e.g., 490G...), '0' => actual stop
function isGroupId(id: string) {
  return id.length >= 4 && id[3].toUpperCase() === "G";
}

type StopPoint = {
  id: string;
  naptanId?: string;
  commonName: string;
  lat?: number;
  lon?: number;
  distance?: number;
  modes?: string[];
  indicator?: string;
  lines?: { id: string; name: string }[];
  additionalProperties?: { key: string; value: string }[];
  children?: StopPoint[];
};

function extractIndicator(raw?: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/^Stop\s+/i, "").trim() || null;
}

function extractTowards(stop: StopPoint): string | null {
  const prop = (stop.additionalProperties ?? []).find((p) => p.key === "Towards");
  return prop?.value ?? null;
}

function toResult(stop: StopPoint, parentGroupId?: string) {
  return {
    id: stop.naptanId || stop.id,
    commonName: stop.commonName,
    lat: stop.lat,
    lon: stop.lon,
    distance: stop.distance ?? null,
    indicator: extractIndicator(stop.indicator),
    towards: extractTowards(stop),
    // Use line names and cap for UI
    lines: (stop.lines ?? []).map((l) => l.name).slice(0, 4),
    parentGroupId: parentGroupId ?? null,
    type: "stop" as const,
  };
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    signal,
    cache: "no-store", // important — avoid Next/Vercel cache for this dynamic handler
    headers: { "Cache-Control": "no-cache" }, // defensive
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`TfL ${res.status}: ${txt || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
  }

  // Hard timeout to stop slow upstream requests
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 5000);

  try {
    // 1) Basic text search (limit) — constrained to bus mode
    const searchUrl = tflUrl("/StopPoint/Search", {
      query,
      modes: "bus",
      maxResults: 6,
    });
    const searchData = await fetchJson<{ matches?: StopPoint[] }>(searchUrl, ac.signal);
    const matches = searchData.matches ?? [];

    if (matches.length === 0) {
      return NextResponse.json(
        { matches: [] },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 2) Take top 5 and bulk fetch details
    const topMatches = matches.slice(0, 5);
    const ids = topMatches.map((m) => m.id).join(",");

    const detailsUrl = tflUrl(`/StopPoint/${ids}`);
    const detailsData = await fetchJson<StopPoint | StopPoint[]>(detailsUrl, ac.signal);
    const stopPoints: StopPoint[] = Array.isArray(detailsData) ? detailsData : [detailsData];

    // 3) Expand groups into child stop points (E/W, etc.)
    const expanded: StopPoint[] = [];
    for (const sp of stopPoints) {
      if (isGroupId(sp.id)) {
        try {
          const group = await fetchJson<StopPoint>(tflUrl(`/StopPoint/${sp.id}`), ac.signal);
          const children = (group.children ?? []).filter((c) => (c.modes ?? []).includes("bus"));
          // propagate distance from the group for ranking consistency
          for (const child of children) expanded.push({ ...child, distance: sp.distance });
        } catch {
          // don’t fail the whole search; skip this group
        }
      } else {
        expanded.push(sp);
      }
    }

    // 4) Transform output
    const transformed = expanded.map((sp) => toResult(sp));

    // 5) Return dynamic (no-store) to avoid stale results in search
    return NextResponse.json(
      { matches: transformed, stale: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("TfL Search API error:", error);
    // Return a 200 with empty results + stale flag so UI can show a soft message
    return NextResponse.json(
      { matches: [], stale: true, error: "Failed to search bus stops" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    clearTimeout(timeout);
  }
}
