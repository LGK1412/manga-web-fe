"use client";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/app/admin/adminLayout/page";
import { QueueFilters } from "@/components/admin/moderation/queue-filters";
import { QueueTable } from "@/components/admin/moderation/queue-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchQueue, decide } from "@/lib/moderation";
import { mapQueueRow } from "@/lib/mappers";
import type { QueueItem } from "@/lib/typesLogs";

export default function ModerationQueuePage() {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<{ search: string; status: any; riskRange: [number, number] }>({
    search: "",
    status: null,
    riskRange: [0, 100],
  });
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await fetchQueue({
        status: filters.status ?? undefined,
        q: filters.search || undefined,
        riskMin: filters.riskRange[0],
        riskMax: filters.riskRange[1],
        limit: 50,
      });
      setItems(rows.map(mapQueueRow));
    } catch (e: any) {
      toast({ title: "Load queue failed", description: e?.message ?? "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [filters]);

  const filteredItems = useMemo(() => items, [items]);

  const bulkApprove = async () => {
    try {
      await Promise.all([...selectedItems].map((id) => decide({ chapterId: id, action: "approve" })));
      toast({ title: "Approved", description: `${selectedItems.size} chapters approved.` });
      setSelectedItems(new Set());
      load();
    } catch (e: any) {
      toast({ title: "Approve failed", description: e?.message ?? "Error", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>/<span>Moderation</span>/<span className="text-foreground">Queue</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Moderation Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredItems.length} items {loading ? "(loading…)" : ""}
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
              <span className="text-sm font-medium">{selectedItems.size} selected</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={bulkApprove}>Approve Selected</Button>
              </div>
            </div>
          </Card>
        )}

        <QueueTable
          items={filteredItems}
          onSelect={(id) => {
            const s = new Set(selectedItems);
            s.has(id) ? s.delete(id) : s.add(id);
            setSelectedItems(s);
          }}
          onAction={(id, action) => {
            // tuỳ chọn: duyệt ngay 1 item
          }}
        />
      </div>
    </AdminLayout>
  );
}
