"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  Edit,
  RefreshCcw,
  Settings2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Headphones,
  Play,
} from "lucide-react";

import AdminLayout from "../adminLayout/page";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const iconMap = {
  BookOpen,
  FileText,
  Headphones,
  Play,
};

type StyleStatus = "normal" | "hide";

interface Style {
  _id: string;
  name: string;
  description: string;
  icon: string;
  storiesCount: number;
  status: StyleStatus;
  category: string;
  updatedAt?: string;
}

type SortKey =
  | "updatedAt.desc"
  | "name.asc"
  | "name.desc"
  | "storiesCount.desc"
  | "storiesCount.asc";

type StylesApiResponse =
  | Style[]
  | {
      items: Style[];
      total: number;
      page: number;
      limit: number;
    };

const DEFAULT_LIMIT = 10;
const DEFAULT_CATEGORIES = ["Visual", "Text", "Audio", "Interactive", "Hybrid"];

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    Visual: "bg-blue-100 text-blue-800",
    Text: "bg-green-100 text-green-800",
    Audio: "bg-purple-100 text-purple-800",
    Interactive: "bg-orange-100 text-orange-800",
    Hybrid: "bg-pink-100 text-pink-800",
  };
  return colors[category] ?? "bg-gray-100 text-gray-800";
}

function getStatusColor(status: StyleStatus) {
  return status === "normal"
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";
}

function useDebounced<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SkeletonRow({ cols = 7 }: { cols?: number }) {
  return (
    <tr className="border-b last:border-b-0">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
        </td>
      ))}
    </tr>
  );
}

export default function StyleManagement() {
  const { toast } = useToast();
  const API = process.env.NEXT_PUBLIC_API_URL;

  // ===== Toolbar state =====
  const [qInput, setQInput] = useState("");
  const q = useDebounced(qInput, 400);

  const [filterStatus, setFilterStatus] = useState<"all" | StyleStatus>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("updatedAt.desc");

  // ===== Pagination =====
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  // ===== Data state =====
  const [items, setItems] = useState<Style[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false); // softer loading for refetch
  const [error, setError] = useState<string | null>(null);

  // ===== Selection =====
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // ===== Column visibility =====
  const [colVis, setColVis] = useState({
    icon: true,
    name: true,
    category: true,
    status: true,
    stories: true,
    updated: true,
    actions: true,
  });

  // ===== Dialog state =====
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [newStyle, setNewStyle] = useState({
    name: "",
    description: "",
    icon: "BookOpen",
    category: "Visual",
  });

  const [editStyle, setEditStyle] = useState<Style | null>(null);
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // abort control
  const abortRef = useRef<AbortController | null>(null);

  // reset page when query/filter/sort/limit changes
  useEffect(() => {
    setPage(1);
  }, [q, filterStatus, filterCategory, sort, limit]);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(total / limit));
  }, [total, limit]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  const allPageSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((it) => selected[it._id]);
  }, [items, selected]);

  const somePageSelected = useMemo(() => {
    if (items.length === 0) return false;
    const count = items.filter((it) => selected[it._id]).length;
    return count > 0 && count < items.length;
  }, [items, selected]);

  const derivedCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => it.category && set.add(it.category));
    return Array.from(set);
  }, [items]);

  const categoriesForFilter = useMemo(() => {
    const merged = new Set([...DEFAULT_CATEGORIES, ...derivedCategories]);
    return Array.from(merged);
  }, [derivedCategories]);

  // ===== Fetch styles =====
  const fetchStyles = async (opts?: { hard?: boolean }) => {
    if (!API) {
      setError("NEXT_PUBLIC_API_URL is missing");
      return;
    }

    // cancel previous
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    if (opts?.hard) setLoading(true);
    else setFetching(true);

    try {
      const res = await axios.get<StylesApiResponse>(`${API}/api/styles`, {
        withCredentials: true,
        signal: controller.signal,
        params: {
          q: q || undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
          category: filterCategory !== "all" ? filterCategory : undefined,
          page,
          limit,
          sort,
        },
      });

      // server-side response shape
      if (!Array.isArray(res.data)) {
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);

        // reset selection for current page (optional)
        setSelected((prev) => {
          const next = { ...prev };
          // keep previous selections across pages? => keep as is
          return next;
        });

        return;
      }

      // ===== fallback: backend returns array => do client-side filter/sort/paging
      const all = res.data;

      const filtered = all.filter((s) => {
        const mq =
          (s.name || "").toLowerCase().includes(q.toLowerCase()) ||
          (s.description || "").toLowerCase().includes(q.toLowerCase());

        const ms =
          filterStatus === "all" ? true : s.status === filterStatus;

        const mc =
          filterCategory === "all" ? true : s.category === filterCategory;

        return mq && ms && mc;
      });

      const sorted = [...filtered].sort((a, b) => {
        switch (sort) {
          case "name.asc":
            return a.name.localeCompare(b.name);
          case "name.desc":
            return b.name.localeCompare(a.name);
          case "storiesCount.asc":
            return (a.storiesCount ?? 0) - (b.storiesCount ?? 0);
          case "storiesCount.desc":
            return (b.storiesCount ?? 0) - (a.storiesCount ?? 0);
          case "updatedAt.desc": {
            const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return tb - ta;
          }
          default:
            return 0;
        }
      });

      const totalLocal = sorted.length;
      const start = (page - 1) * limit;
      const paged = sorted.slice(start, start + limit);

      setItems(paged);
      setTotal(totalLocal);
    } catch (e: any) {
      if (axios.isCancel(e)) return;
      if (e?.name === "CanceledError") return;
      console.error("fetchStyles error:", e);
      setError("Failed to load styles");
      toast({ title: "Failed to load styles", variant: "destructive" });
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchStyles({ hard: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStyles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filterStatus, filterCategory, sort, page, limit]);

  // ===== Add style =====
  const canAdd =
    newStyle.name.trim().length > 0 &&
    newStyle.description.trim().length >= 10;

  const handleAddStyle = async () => {
    if (!API) return;
    if (!canAdd) return;

    setSavingAdd(true);
    try {
      await axios.post(
        `${API}/api/styles`,
        { ...newStyle, status: "normal" as const },
        { withCredentials: true }
      );

      toast({ title: "Style added successfully" });
      setIsAddDialogOpen(false);
      setNewStyle({
        name: "",
        description: "",
        icon: "BookOpen",
        category: "Visual",
      });

      // reload current list
      fetchStyles({ hard: true });
    } catch (e) {
      console.error("Error adding style:", e);
      toast({ title: "Failed to add style", variant: "destructive" });
    } finally {
      setSavingAdd(false);
    }
  };

  // ===== Update style =====
  const canEdit =
    !!editStyle &&
    editStyle.name.trim().length > 0 &&
    editStyle.description.trim().length >= 10;

  const handleUpdateStyle = async () => {
    if (!API || !editStyle) return;
    if (!canEdit) return;

    setSavingEdit(true);
    try {
      await axios.put(`${API}/api/styles/${editStyle._id}`, editStyle, {
        withCredentials: true,
      });

      toast({ title: "Style updated successfully" });
      setIsEditDialogOpen(false);
      fetchStyles();
    } catch (e) {
      console.error("Error updating style:", e);
      toast({ title: "Failed to update style", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  // ===== Inline toggle status (optimistic) =====
  const toggleStatus = async (id: string, next: StyleStatus) => {
    if (!API) return;

    // optimistic update
    const prevItems = items;
    setItems((cur) => cur.map((s) => (s._id === id ? { ...s, status: next } : s)));

    try {
      // dùng PUT endpoint sẵn có (không cần PATCH /status)
      await axios.put(
        `${API}/api/styles/${id}`,
        { status: next },
        { withCredentials: true }
      );
      toast({ title: "Status updated" });
    } catch (e) {
      // rollback
      setItems(prevItems);
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  // ===== Bulk status update (fallback loop PUT) =====
  const bulkUpdateStatus = async (next: StyleStatus) => {
    if (!API) return;
    const ids = selectedIds;
    if (ids.length === 0) return;

    // optimistic
    const prevItems = items;
    setItems((cur) => cur.map((s) => (ids.includes(s._id) ? { ...s, status: next } : s)));

    try {
      await Promise.all(
        ids.map((id) =>
          axios.put(
            `${API}/api/styles/${id}`,
            { status: next },
            { withCredentials: true }
          )
        )
      );

      toast({ title: `Updated ${ids.length} item(s)` });
      setSelected({});
      fetchStyles();
    } catch (e) {
      setItems(prevItems);
      toast({ title: "Bulk update failed", variant: "destructive" });
    }
  };

  const IconPreviewNew =
    iconMap[newStyle.icon as keyof typeof iconMap] || BookOpen;

  return (
    <AdminLayout>
      {/* NOTE: AdminLayout main đã p-6 rồi, nên ở đây không thêm p-6 để khỏi double padding */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Style Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage story presentation styles
            </p>
          </div>

          {/* Add */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Style
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Add New Style</DialogTitle>
                <DialogDescription>
                  Create a new story presentation style
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Style Name</Label>
                  <Input
                    id="name"
                    value={newStyle.name}
                    onChange={(e) =>
                      setNewStyle({ ...newStyle, name: e.target.value })
                    }
                    placeholder="Enter style name..."
                  />
                  {newStyle.name.trim().length === 0 && (
                    <p className="text-sm text-destructive">
                      Name is required.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newStyle.description}
                    onChange={(e) =>
                      setNewStyle({
                        ...newStyle,
                        description: e.target.value,
                      })
                    }
                    placeholder="At least 10 characters..."
                  />
                  {newStyle.description.trim().length > 0 &&
                    newStyle.description.trim().length < 10 && (
                      <p className="text-sm text-destructive">
                        Description must be at least 10 characters.
                      </p>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newStyle.category}
                      onValueChange={(v) =>
                        setNewStyle({ ...newStyle, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select
                      value={newStyle.icon}
                      onValueChange={(v) =>
                        setNewStyle({ ...newStyle, icon: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(iconMap).map((k) => {
                          const I = iconMap[k as keyof typeof iconMap];
                          return (
                            <SelectItem key={k} value={k}>
                              <div className="flex items-center gap-2">
                                <I className="h-4 w-4" />
                                <span>{k}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconPreviewNew className="h-4 w-4" />
                      Preview
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddStyle}
                  disabled={!canAdd || savingAdd}
                >
                  {savingAdd ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Styles</CardTitle>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchStyles({ hard: true })}
                  title="Refresh"
                  disabled={loading || fetching}
                >
                  <RefreshCcw className={cn("h-4 w-4", fetching && "animate-spin")} />
                </Button>

                {/* Column visibility (no dropdown component, dùng details) */}
                <details className="relative">
                  <summary className="list-none">
                    <Button variant="outline" size="icon" title="Columns">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </summary>
                  <div className="absolute right-0 mt-2 w-52 rounded-lg border bg-background shadow-lg p-2 z-50">
                    {(
                      [
                        ["icon", "Icon"],
                        ["category", "Category"],
                        ["status", "Status"],
                        ["stories", "Stories"],
                        ["updated", "Updated"],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={(colVis as any)[key]}
                          onChange={(e) =>
                            setColVis((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-[320px]">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={qInput}
                    onChange={(e) => setQInput(e.target.value)}
                    className="pl-10"
                    placeholder="Search name/description..."
                  />
                </div>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categoriesForFilter.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hide">Hidden</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updatedAt.desc">Updated: newest</SelectItem>
                    <SelectItem value="name.asc">Name: A → Z</SelectItem>
                    <SelectItem value="name.desc">Name: Z → A</SelectItem>
                    <SelectItem value="storiesCount.desc">Stories: high → low</SelectItem>
                    <SelectItem value="storiesCount.asc">Stories: low → high</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows</span>
                  <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={selectedIds.length === 0}
                    onClick={() => bulkUpdateStatus("hide")}
                  >
                    Hide selected
                  </Button>
                  <Button
                    variant="outline"
                    disabled={selectedIds.length === 0}
                    onClick={() => bulkUpdateStatus("normal")}
                  >
                    Show selected
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error banner */}
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-destructive">Failed to load styles</div>
                  <div className="text-sm text-destructive/90">{error}</div>
                </div>
                <Button variant="outline" onClick={() => fetchStyles({ hard: true })}>
                  Retry
                </Button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && items.length === 0 ? (
              <div className="rounded-lg border p-10 text-center space-y-2">
                <div className="text-lg font-medium">No styles found</div>
                <div className="text-sm text-muted-foreground">
                  Try adjusting filters or create a new style.
                </div>
                <Button className="mt-2" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Style
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <div className="w-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr className="border-b">
                        {/* selection */}
                        <th className="p-3 w-[44px]">
                          <input
                            type="checkbox"
                            checked={allPageSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = somePageSelected;
                            }}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelected((prev) => {
                                const next = { ...prev };
                                items.forEach((it) => {
                                  next[it._id] = checked;
                                });
                                return next;
                              });
                            }}
                            aria-label="Select all"
                          />
                        </th>

                        {colVis.icon && <th className="p-3 text-left font-medium">Icon</th>}
                        {colVis.name && <th className="p-3 text-left font-medium">Name</th>}
                        {colVis.category && <th className="p-3 text-left font-medium">Category</th>}
                        {colVis.status && <th className="p-3 text-left font-medium">Status</th>}
                        {colVis.stories && <th className="p-3 text-left font-medium">Stories</th>}
                        {colVis.updated && <th className="p-3 text-left font-medium">Updated</th>}
                        {colVis.actions && <th className="p-3 text-left font-medium">Actions</th>}
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <>
                          <SkeletonRow cols={1 + (colVis.icon ? 1 : 0) + (colVis.name ? 1 : 0) + (colVis.category ? 1 : 0) + (colVis.status ? 1 : 0) + (colVis.stories ? 1 : 0) + (colVis.updated ? 1 : 0) + (colVis.actions ? 1 : 0)} />
                          <SkeletonRow cols={1 + (colVis.icon ? 1 : 0) + (colVis.name ? 1 : 0) + (colVis.category ? 1 : 0) + (colVis.status ? 1 : 0) + (colVis.stories ? 1 : 0) + (colVis.updated ? 1 : 0) + (colVis.actions ? 1 : 0)} />
                          <SkeletonRow cols={1 + (colVis.icon ? 1 : 0) + (colVis.name ? 1 : 0) + (colVis.category ? 1 : 0) + (colVis.status ? 1 : 0) + (colVis.stories ? 1 : 0) + (colVis.updated ? 1 : 0) + (colVis.actions ? 1 : 0)} />
                          <SkeletonRow cols={1 + (colVis.icon ? 1 : 0) + (colVis.name ? 1 : 0) + (colVis.category ? 1 : 0) + (colVis.status ? 1 : 0) + (colVis.stories ? 1 : 0) + (colVis.updated ? 1 : 0) + (colVis.actions ? 1 : 0)} />
                          <SkeletonRow cols={1 + (colVis.icon ? 1 : 0) + (colVis.name ? 1 : 0) + (colVis.category ? 1 : 0) + (colVis.status ? 1 : 0) + (colVis.stories ? 1 : 0) + (colVis.updated ? 1 : 0) + (colVis.actions ? 1 : 0)} />
                        </>
                      ) : (
                        items.map((style) => {
                          const IconComponent =
                            iconMap[style.icon as keyof typeof iconMap] || BookOpen;

                          return (
                            <tr
                              key={style._id}
                              className="border-b last:border-b-0 hover:bg-muted/10"
                            >
                              <td className="p-3 align-middle">
                                <input
                                  type="checkbox"
                                  checked={!!selected[style._id]}
                                  onChange={(e) =>
                                    setSelected((prev) => ({
                                      ...prev,
                                      [style._id]: e.target.checked,
                                    }))
                                  }
                                  aria-label="Select row"
                                />
                              </td>

                              {colVis.icon && (
                                <td className="p-3 align-middle">
                                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-muted/20">
                                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </td>
                              )}

                              {colVis.name && (
                                <td className="p-3 align-middle">
                                  <div className="min-w-[240px]">
                                    <div className="font-medium">{style.name}</div>
                                    <div className="text-sm text-muted-foreground line-clamp-1">
                                      {style.description}
                                    </div>
                                  </div>
                                </td>
                              )}

                              {colVis.category && (
                                <td className="p-3 align-middle">
                                  <Badge className={cn("font-normal", getCategoryColor(style.category))}>
                                    {style.category}
                                  </Badge>
                                </td>
                              )}

                              {colVis.status && (
                                <td className="p-3 align-middle">
                                  <button
                                    className={cn(
                                      "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm hover:bg-muted",
                                      style.status === "normal"
                                        ? "border-green-200"
                                        : "border-red-200"
                                    )}
                                    onClick={() =>
                                      toggleStatus(style._id, style.status === "normal" ? "hide" : "normal")
                                    }
                                    title="Click to toggle"
                                  >
                                    <Badge className={getStatusColor(style.status)}>
                                      {style.status === "normal" ? "Normal" : "Hidden"}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                      (toggle)
                                    </span>
                                  </button>
                                </td>
                              )}

                              {colVis.stories && (
                                <td className="p-3 align-middle tabular-nums">
                                  {style.storiesCount}
                                </td>
                              )}

                              {colVis.updated && (
                                <td className="p-3 align-middle text-muted-foreground">
                                  {formatDate(style.updatedAt)}
                                </td>
                              )}

                              {colVis.actions && (
                                <td className="p-3 align-middle">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditStyle(style);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && total > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Page{" "}
                  <span className="font-medium text-foreground">{page}</span> of{" "}
                  <span className="font-medium text-foreground">{pageCount}</span>{" "}
                  · <span className="font-medium text-foreground">{total}</span>{" "}
                  total
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= pageCount || loading}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {editStyle && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[640px]">
              <DialogHeader>
                <DialogTitle>Edit Style</DialogTitle>
                <DialogDescription>Update style information</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Style Name</Label>
                    <Input
                      id="edit-name"
                      value={editStyle.name}
                      onChange={(e) =>
                        setEditStyle({ ...editStyle, name: e.target.value })
                      }
                    />
                    {editStyle.name.trim().length === 0 && (
                      <p className="text-sm text-destructive">Name is required.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editStyle.status}
                      onValueChange={(value: StyleStatus) =>
                        setEditStyle({ ...editStyle, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="hide">Hidden</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editStyle.description}
                    onChange={(e) =>
                      setEditStyle({
                        ...editStyle,
                        description: e.target.value,
                      })
                    }
                  />
                  {editStyle.description.trim().length > 0 &&
                    editStyle.description.trim().length < 10 && (
                      <p className="text-sm text-destructive">
                        Description must be at least 10 characters.
                      </p>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={editStyle.category}
                      onValueChange={(v) =>
                        setEditStyle({ ...editStyle, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesForFilter.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select
                      value={editStyle.icon}
                      onValueChange={(v) =>
                        setEditStyle({ ...editStyle, icon: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(iconMap).map((k) => {
                          const I = iconMap[k as keyof typeof iconMap];
                          return (
                            <SelectItem key={k} value={k}>
                              <div className="flex items-center gap-2">
                                <I className="h-4 w-4" />
                                <span>{k}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateStyle} disabled={!canEdit || savingEdit}>
                  {savingEdit ? "Saving..." : "Update"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
