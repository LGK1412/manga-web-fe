"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RiskMeter } from "./risk-meter";
import { StatusBadge } from "./status-badge";
import type { QueueItem } from "@/lib/typesLogs";
import { Eye, Edit } from "lucide-react";
import Link from "next/link";

interface QueueTableProps {
  items: QueueItem[];
  onSelect: (id: string) => void;
  onAction: (id: string, action: string) => void;
  loading?: boolean;
}

export function QueueTable({ items, onSelect, onAction, loading }: QueueTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
    onSelect(id);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.chapterId)));
  };

  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
            <TableHead className="w-12">
              <Checkbox
                checked={items.length > 0 && selectedIds.size === items.length}
                onCheckedChange={toggleSelectAll}
                disabled={loading}
              />
            </TableHead>
            <TableHead>Chapter</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Risk Score</TableHead>
            <TableHead>AI Status</TableHead>
            <TableHead>Labels</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {!loading &&
            items.map((item, index) => (
              <TableRow key={`${item.chapterId || "row"}-${index}`} className="hover:bg-muted/50">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(item.chapterId)}
                    onCheckedChange={() => toggleSelect(item.chapterId)}
                    disabled={loading}
                  />
                </TableCell>

                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.author}</TableCell>

                <TableCell>
                  <RiskMeter score={item.risk_score} />
                </TableCell>

                <TableCell>
                  {/* Fallback để không crash nếu ai_status chưa có */}
                  <StatusBadge status={item.ai_status ?? "AI_PENDING"} />
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.labels.slice(0, 2).map((label) => (
                      <span key={`${item.chapterId}-${label}`} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {label}
                      </span>
                    ))}
                    {item.labels.length > 2 && (
                      <span className="text-xs text-muted-foreground">+{item.labels.length - 2}</span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/moderation/workspace?chapterId=${item.chapterId}`}>
                      <Button size="sm" variant="ghost" title="Open Workspace">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAction(item.chapterId, "approve")}
                      title="Approve"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

          {items.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                No items
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
