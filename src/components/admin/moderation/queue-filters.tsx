"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Search, X } from "lucide-react"

interface QueueFiltersProps {
  onFiltersChange: (filters: any) => void
}

export function QueueFilters({ onFiltersChange }: QueueFiltersProps) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [riskRange, setRiskRange] = useState([0, 100])

  const handleFilterChange = () => {
    onFiltersChange({ search, status: status !== "all" ? status : null, riskRange })
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, author, or chapter ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            handleFilterChange()
          }}
          className="flex-1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium block mb-2">AI Status</label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value)
              handleFilterChange()
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="AI_PENDING">Pending</SelectItem>
              <SelectItem value="AI_WARN">Warning</SelectItem>
              <SelectItem value="AI_BLOCK">Blocked</SelectItem>
              <SelectItem value="AI_PASSED">Passed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">
            Risk Score: {riskRange[0]} - {riskRange[1]}
          </label>
          <Slider
            min={0}
            max={100}
            step={5}
            value={riskRange}
            onValueChange={(value) => {
              setRiskRange(value as [number, number])
              handleFilterChange()
            }}
            className="w-full"
          />
        </div>

        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSearch("")
              setStatus("all")
              setRiskRange([0, 100])
              onFiltersChange({ search: "", status: null, riskRange: [0, 100] })
            }}
          >
            <X className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>
    </Card>
  )
}
