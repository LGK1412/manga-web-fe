"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Edit, Plus, RefreshCcw, Search } from "lucide-react";

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

type StyleStatus = "normal" | "hide";
type SortKey = "updatedAt.desc" | "name.asc" | "name.desc";

interface Style {
  _id: string;
  name: string;
  description: string;
  status: StyleStatus;
  updatedAt?: string;
}

type StylesApiResponse =
  | Style[]
  | {
      items?: Style[];
    };

const DEFAULT_LIMIT = 10;

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusBadgeClass(status: StyleStatus) {
  return status === "normal"
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";
}

function SkeletonRow() {
  return (
    <tr className="border-b last:border-b-0">
      {Array.from({ length: 5 }).map((_, index) => (
        <td key={index} className="p-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
        </td>
      ))}
    </tr>
  );
}

export default function StyleManagement() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  const { toast } = useToast();

  const [allStyles, setAllStyles] = useState<Style[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | StyleStatus>("all");
  const [sort, setSort] = useState<SortKey>("updatedAt.desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [newStyle, setNewStyle] = useState({
    name: "",
    description: "",
  });
  const [editStyle, setEditStyle] = useState<Style | null>(null);

  const canAdd =
    newStyle.name.trim().length > 0 &&
    newStyle.description.trim().length >= 10;

  const canEdit =
    !!editStyle &&
    editStyle.name.trim().length > 0 &&
    editStyle.description.trim().length >= 10;

  const fetchStyles = useCallback(async () => {
    if (!API) {
      setError("NEXT_PUBLIC_API_URL is missing");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get<StylesApiResponse>(`${API}/api/styles`, {
        withCredentials: true,
      });

      const nextItems = Array.isArray(res.data) ? res.data : res.data.items || [];
      setAllStyles(nextItems);
    } catch (e) {
      console.error("fetchStyles error:", e);
      setError("Failed to load styles");
      toast({ title: "Failed to load styles", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [API, toast]);

  useEffect(() => {
    void fetchStyles();
  }, [fetchStyles]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, sort, limit]);

  const filteredStyles = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const filtered = allStyles.filter((style) => {
      const matchesSearch =
        !keyword ||
        style.name.toLowerCase().includes(keyword) ||
        style.description.toLowerCase().includes(keyword);

      const matchesStatus =
        filterStatus === "all" ? true : style.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      switch (sort) {
        case "name.asc":
          return a.name.localeCompare(b.name);
        case "name.desc":
          return b.name.localeCompare(a.name);
        case "updatedAt.desc":
        default: {
          const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return right - left;
        }
      }
    });
  }, [allStyles, filterStatus, search, sort]);

  const total = filteredStyles.length;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  const visibleStyles = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredStyles.slice(start, start + limit);
  }, [filteredStyles, limit, page]);

  const handleAddStyle = async () => {
    if (!API || !canAdd) return;

    setSavingAdd(true);
    try {
      await axios.post(
        `${API}/api/styles`,
        {
          name: newStyle.name.trim(),
          description: newStyle.description.trim(),
          status: "normal" as const,
        },
        { withCredentials: true }
      );

      toast({ title: "Style added successfully" });
      setIsAddDialogOpen(false);
      setNewStyle({ name: "", description: "" });
      await fetchStyles();
    } catch (e) {
      console.error("Error adding style:", e);
      toast({ title: "Failed to add style", variant: "destructive" });
    } finally {
      setSavingAdd(false);
    }
  };

  const handleUpdateStyle = async () => {
    if (!API || !editStyle || !canEdit) return;

    setSavingEdit(true);
    try {
      await axios.put(
        `${API}/api/styles/${editStyle._id}`,
        {
          name: editStyle.name.trim(),
          description: editStyle.description.trim(),
          status: editStyle.status,
        },
        { withCredentials: true }
      );

      toast({ title: "Style updated successfully" });
      setIsEditDialogOpen(false);
      setEditStyle(null);
      await fetchStyles();
    } catch (e) {
      console.error("Error updating style:", e);
      toast({ title: "Failed to update style", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Style Management
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage story presentation styles
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
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
                    <p className="text-sm text-destructive">Name is required.</p>
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
              </div>

              <DialogFooter className="mt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddStyle} disabled={!canAdd || savingAdd}>
                  {savingAdd ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Styles</CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchStyles()}
                title="Refresh"
                disabled={loading}
              >
                <RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </Button>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-[320px]">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    placeholder="Search name/description..."
                  />
                </div>

                <Select
                  value={filterStatus}
                  onValueChange={(value) =>
                    setFilterStatus(value as "all" | StyleStatus)
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hide">Hidden</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updatedAt.desc">Updated: newest</SelectItem>
                    <SelectItem value="name.asc">Name: A to Z</SelectItem>
                    <SelectItem value="name.desc">Name: Z to A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows</span>
                <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 50].map((rows) => (
                      <SelectItem key={rows} value={String(rows)}>
                        {rows}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                <div>
                  <div className="font-medium text-destructive">
                    Failed to load styles
                  </div>
                  <div className="text-sm text-destructive/90">{error}</div>
                </div>
                <Button variant="outline" onClick={() => fetchStyles()}>
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && visibleStyles.length === 0 ? (
              <div className="space-y-2 rounded-lg border p-10 text-center">
                <div className="text-lg font-medium">No styles found</div>
                <div className="text-sm text-muted-foreground">
                  Try adjusting filters or create a new style.
                </div>
                <Button className="mt-2" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Style
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <div className="w-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr className="border-b">
                        <th className="p-3 text-left font-medium">Name</th>
                        <th className="p-3 text-left font-medium">Description</th>
                        <th className="p-3 text-left font-medium">Status</th>
                        <th className="p-3 text-left font-medium">Updated</th>
                        <th className="p-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <>
                          <SkeletonRow />
                          <SkeletonRow />
                          <SkeletonRow />
                          <SkeletonRow />
                          <SkeletonRow />
                        </>
                      ) : (
                        visibleStyles.map((style) => (
                          <tr
                            key={style._id}
                            className="border-b last:border-b-0 hover:bg-muted/10"
                          >
                            <td className="p-3 align-middle">
                              <div className="min-w-[220px] font-medium">{style.name}</div>
                            </td>
                            <td className="p-3 align-middle text-muted-foreground">
                              <div className="min-w-[280px] line-clamp-2">
                                {style.description}
                              </div>
                            </td>
                            <td className="p-3 align-middle">
                              <Badge className={getStatusBadgeClass(style.status)}>
                                {style.status === "normal" ? "Normal" : "Hidden"}
                              </Badge>
                            </td>
                            <td className="p-3 align-middle text-muted-foreground">
                              {formatDate(style.updatedAt)}
                            </td>
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
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && !error && total > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Page <span className="font-medium text-foreground">{page}</span> of{" "}
                  <span className="font-medium text-foreground">{pageCount}</span> ·{" "}
                  <span className="font-medium text-foreground">{total}</span> total
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <RefreshCcw className="hidden" />
                    <span className="sr-only">Previous page</span>
                    <span aria-hidden="true">‹</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= pageCount || loading}
                    onClick={() =>
                      setPage((current) => Math.min(pageCount, current + 1))
                    }
                  >
                    <span className="sr-only">Next page</span>
                    <span aria-hidden="true">›</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {editStyle && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[640px]">
              <DialogHeader>
                <DialogTitle>Edit Style</DialogTitle>
                <DialogDescription>Update style information</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      <SelectContent className="z-[90]">
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
