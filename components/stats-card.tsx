"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  icon: LucideIcon
  title: string
  value: number | string
  subtitle: string
  color: "red" | "blue" | "dark"
}

export function StatsCard({ icon: Icon, title, value, subtitle, color }: StatsCardProps) {
  const colorClasses = {
    red: "from-tfl-red to-red-600",
    blue: "from-tfl-blue to-blue-600", 
    dark: "from-tfl-dark to-gray-700",
  }

  return (
    <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[color]} shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-timing font-medium text-tfl-gray-600">{title}</p>
            <p className="text-2xl font-bold text-tfl-dark">{value}</p>
            <p className="text-xs text-tfl-gray-500">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
