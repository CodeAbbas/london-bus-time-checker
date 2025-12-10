import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function NearbyStopsSkeleton() {
  return (
    <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl ring-1 ring-tfl-gray-200/50 overflow-hidden">
      {/* Header Skeleton */}
      <CardHeader className="p-5 border-b border-tfl-gray-200/80">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="w-16 h-8 rounded-full bg-gray-100 animate-pulse" />
        </div>
      </CardHeader>

      {/* List Items Skeleton */}
      <CardContent className="p-5 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white"
          >
            {/* Stop Letter Icon */}
            <div className="w-12 h-12 rounded-xl bg-gray-200 animate-shimmer flex-shrink-0" />
            
            {/* Text Content */}
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 bg-gray-200 rounded animate-shimmer" />
              <div className="h-3 w-1/2 bg-gray-100 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ArrivalsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div 
          key={i} 
          className="flex items-center gap-4 p-3 rounded-xl bg-white border border-gray-100"
        >
          {/* Bus Number Badge */}
          <div className="w-16 h-12 rounded-xl bg-gray-200 animate-shimmer flex-shrink-0" />
          
          {/* Destination */}
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 bg-gray-200 rounded animate-shimmer" />
            <div className="h-3 w-1/3 bg-gray-100 rounded animate-shimmer" />
          </div>

          {/* Arrival Time */}
          <div className="flex flex-col items-end gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse mb-1" />
            <div className="h-6 w-12 bg-gray-200 rounded animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  )
}