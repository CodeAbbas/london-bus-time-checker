"use client"

import { Button } from "@/components/ui/button"
import { Navigation, Loader2, MapPin } from "lucide-react"

interface LocationButtonProps {
  onClick: () => void
  loading: boolean
  hasLocation: boolean
}

export function LocationButton({ onClick, loading, hasLocation }: LocationButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={loading}
      className={`w-full py-3 text-base font-medium transition-all duration-200 transform hover:scale-[1.02] ${
        hasLocation
          ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Getting Location...
        </>
      ) : hasLocation ? (
        <>
          <MapPin className="h-5 w-5 mr-2" />
          Update Location
        </>
      ) : (
        <>
          <Navigation className="h-5 w-5 mr-2" />
          Use My Location
        </>
      )}
    </Button>
  )
}
