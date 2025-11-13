"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"

interface ProtectedSectionProps {
  resource: string
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedSection({ resource, children, fallback }: ProtectedSectionProps) {
  const { canAccess } = useAuth()

  if (!canAccess(resource)) {
    return (
      fallback || (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Access Denied</p>
              <p className="text-sm text-red-700">You don't have permission to view this section.</p>
            </div>
          </div>
        </Card>
      )
    )
  }

  return <>{children}</>
}
