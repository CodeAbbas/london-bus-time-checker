"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import useSWR from "swr"

export interface BusArrival {
  id: string
  lineName: string
  destinationName: string
  timeToStation: number
  expectedArrival: string
  vehicleId: string
}

const EMPTY_ARRIVALS: BusArrival[] = []

async function fetchArrivals(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Failed to get arrival times. Please try again.")
  const arrivals: BusArrival[] = await response.json()
  return { arrivals, updatedAt: new Date() }
}

export function useBusArrivals(stopId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    stopId ? `/api/arrivals?stopId=${encodeURIComponent(stopId)}` : null,
    fetchArrivals,
    {
      refreshInterval: 30_000,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  )
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!stopId) return
    let timer: ReturnType<typeof setInterval> | undefined
    const startClock = () => {
      setNow(Date.now())
      timer = setInterval(() => setNow(Date.now()), 1_000)
    }
    const onVisibilityChange = () => {
      clearInterval(timer)
      if (!document.hidden) {
        startClock()
        void mutate()
      }
    }
    if (!document.hidden) startClock()
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [stopId, mutate])

  const arrivals = useMemo(() => {
    if (!data) return EMPTY_ARRIVALS
    return data.arrivals.map((arrival) => ({
      ...arrival,
      timeToStation: Math.max(0, Math.floor((Date.parse(arrival.expectedArrival) - now) / 60_000)) * 60,
    })).sort((a, b) => Date.parse(a.expectedArrival) - Date.parse(b.expectedArrival))
  }, [data, now])
  const refresh = useCallback(() => { void mutate() }, [mutate])

  return {
    arrivals,
    loading: Boolean(stopId) && isLoading && !data,
    error: error instanceof Error ? error.message : null,
    lastUpdated: data?.updatedAt ?? null,
    refresh,
  }
}
