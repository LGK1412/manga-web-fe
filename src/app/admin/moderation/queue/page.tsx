"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueueFilters } from "@/components/admin/moderation/queue-filters";
import { QueueTable } from "@/components/admin/moderation/queue-table";
import type { AIStatus, QueueItem } from "@/lib/typesLogs";
import { Download } from "lucide-react";
import AdminLayout from "@/app/admin/adminLayout/page";
import { fetchQueue } from "@/lib/moderation";

export default function ModerationQueuePage() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<{
    search: string;
    status: AIStatus | null;
    riskRange: [number, number];
  }>({
    search: "",
    status: null,
    riskRange: [0, 100],
  });

  const [data, setData] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const rows = await fetchQueue(
          filters.status ? { status: filters.status } : undefined
        );
        setData(rows);
      } catch (e: any) {
        setErr(e?.message || "Load queue failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [filters.status]);

  const filteredItems = useMemo(() => {
    const s = filters.search.trim().toLowerCase();

    return data.filter((item) => {
      const title = item.title?.toLowerCase?.() || "";
      const mangaTitle = item.mangaTitle?.toLowerCase?.() || "";
      const author = item.author?.toLowerCase?.() || "";
      const chapterId = item.chapterId?.toLowerCase?.() || "";

      const matchesSearch =
        !s ||
        title.includes(s) ||
        mangaTitle.includes(s) ||
        author.includes(s) ||
        chapterId.includes(s);

      const matchesRisk =
        item.risk_score >= filters.riskRange[0] &&
        item.risk_score <= filters.riskRange[1];

      const matchesStatus =
        !filters.status || item.ai_status === filters.status;

      return matchesSearch && matchesRisk && matchesStatus;
    });
  }, [data, filters]);

  const handleAction = (id: string, action: string) => {
    console.log(`Action ${action} on ${id}`);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <span>Moderation</span>
          <span>/</span>
          <span className="text-foreground">Queue</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Moderation Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Loading..." : `${filteredItems.length} of ${data.length} items`}
              {err && <span className="text-red-600 ml-2">{err}</span>}
            </p>
          </div>

          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        <QueueFilters onFiltersChange={setFilters} />

        {selectedItems.size > 0 && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="default">
                  Approve Selected
                </Button>
                <Button size="sm" variant="destructive">
                  Reject Selected
                </Button>
              </div>
            </div>
          </Card>
        )}

        <QueueTable
          items={filteredItems}
          onSelect={(id) => {
            setSelectedItems((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onAction={handleAction}
          loading={loading}
        />
      </div>
    </AdminLayout>
  );
}