"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, X } from "lucide-react";
import type { AIStatus } from "@/lib/typesLogs";

interface QueueFiltersProps {
  onFiltersChange: (filters: {
    search: string;
    status: AIStatus | null;
    riskRange: [number, number];
  }) => void;
}

export function QueueFilters({ onFiltersChange }: QueueFiltersProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | AIStatus>("all");
  const [riskRange, setRiskRange] = useState<[number, number]>([0, 100]);

  const emitFilters = (
    nextSearch = search,
    nextStatus: "all" | AIStatus = status,
    nextRiskRange: [number, number] = riskRange
  ) => {
    onFiltersChange({
      search: nextSearch,
      status: nextStatus === "all" ? null : nextStatus,
      riskRange: nextRiskRange,
    });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, author, or chapter ID..."
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            setSearch(value);
            emitFilters(value, status, riskRange);
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
              const nextStatus = value as "all" | AIStatus;
              setStatus(nextStatus);
              emitFilters(search, nextStatus, riskRange);
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
              const nextRange: [number, number] = [value[0], value[1]];
              setRiskRange(nextRange);
              emitFilters(search, status, nextRange);
            }}
            className="w-full"
          />
        </div>

        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const resetSearch = "";
              const resetStatus: "all" = "all";
              const resetRange: [number, number] = [0, 100];

              setSearch(resetSearch);
              setStatus(resetStatus);
              setRiskRange(resetRange);

              onFiltersChange({
                search: resetSearch,
                status: null,
                riskRange: resetRange,
              });
            }}
          >
            <X className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}