"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AdminLayout from "../adminLayout/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  Eye,
  Pencil,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  FileSearch,
} from "lucide-react"

type PolicyMainType = "TERM" | "PRIVACY"
type PolicySubCategory =
  | "posting"
  | "data_usage"
  | "comment"
  | "account"
  | "general"
type PolicyStatus = "Draft" | "Active" | "Archived"

interface Policy {
  _id: string
  title: string
  slug: string
  mainType: PolicyMainType
  subCategory: PolicySubCategory
  description?: string
  content: string
  status: PolicyStatus
  isPublic: boolean
  updatedAt: string
  createdAt: string
  effective_from?: string | null
  effective_to?: string | null
}

type StatusFilter = "all" | PolicyStatus
type VisibilityFilter = "all" | "public" | "internal"
type SortField =
  | "title"
  | "mainType"
  | "subCategory"
  | "status"
  | "isPublic"
  | "updatedAt"

const API_BASE = "http://localhost:3333/api/policies"

function getStatusColor(status: PolicyStatus) {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800 border-green-200"
    case "Draft":
      return "bg-gray-100 text-gray-800 border-gray-200"
    case "Archived":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

function getVisibilityColor(isPublic: boolean) {
  return isPublic
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-amber-100 text-amber-800 border-amber-200"
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("vi-VN")
}

function SummaryCard({
  title,
  value,
  active = false,
  tone = "default",
  onClick,
}: {
  title: string
  value: number
  active?: boolean
  tone?: "default" | "green" | "gray" | "red"
  onClick: () => void
}) {
  const toneClass =
    tone === "green"
      ? "text-green-600"
      : tone === "gray"
      ? "text-gray-600"
      : tone === "red"
      ? "text-red-600"
      : "text-gray-900"

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition hover:border-blue-200 hover:shadow-sm ${
        active ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  )
}

function TableLoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid animate-pulse grid-cols-7 gap-3 rounded-xl border p-4"
        >
          <div className="col-span-2 h-4 rounded bg-gray-200" />
          <div className="h-4 rounded bg-gray-200" />
          <div className="h-4 rounded bg-gray-200" />
          <div className="h-4 rounded bg-gray-200" />
          <div className="h-4 rounded bg-gray-200" />
          <div className="h-4 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <FileSearch className="h-6 w-6 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">No matching policies</h3>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Không có policy nào khớp với bộ lọc hiện tại. Bạn có thể reset filter hoặc tạo policy mới.
      </p>
      <div className="mt-5 flex gap-3">
        <Button variant="outline" onClick={onReset}>
          Reset filters
        </Button>
        <Link href="/admin/policies/new">
          <Button>Create Policy</Button>
        </Link>
      </div>
    </div>
  )
}

export default function AdminPoliciesPage() {
  const router = useRouter()

  const [policies, setPolicies] = useState<Policy[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all")
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all")
  const [loading, setLoading] = useState(false)

  const [sortField, setSortField] = useState<SortField>("updatedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const res = await axios.get(API_BASE)
      if (Array.isArray(res.data)) {
        setPolicies(res.data)
      } else {
        console.warn("Unexpected API response:", res.data)
        setPolicies([])
      }
    } catch (error) {
      console.error("Failed to fetch policies:", error)
      setPolicies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicies()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, visibilityFilter, sortField, sortOrder])

  const counts = useMemo(() => {
    return {
      total: policies.length,
      active: policies.filter((p) => p.status === "Active").length,
      draft: policies.filter((p) => p.status === "Draft").length,
      archived: policies.filter((p) => p.status === "Archived").length,
      public: policies.filter((p) => p.isPublic).length,
      internal: policies.filter((p) => !p.isPublic).length,
    }
  }, [policies])

  const filteredPolicies = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    const filtered = policies.filter((policy) => {
      const matchesSearch =
        !normalizedSearch ||
        policy.title.toLowerCase().includes(normalizedSearch) ||
        policy.slug?.toLowerCase().includes(normalizedSearch) ||
        policy.description?.toLowerCase().includes(normalizedSearch)

      const matchesStatus =
        filterStatus === "all" || policy.status === filterStatus

      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "public" && policy.isPublic) ||
        (visibilityFilter === "internal" && !policy.isPublic)

      return matchesSearch && matchesStatus && matchesVisibility
    })

    return filtered.sort((a, b) => {
      if (sortField === "updatedAt") {
        const timeA = new Date(a.updatedAt).getTime()
        const timeB = new Date(b.updatedAt).getTime()
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA
      }

      if (sortField === "isPublic") {
        return sortOrder === "asc"
          ? Number(a.isPublic) - Number(b.isPublic)
          : Number(b.isPublic) - Number(a.isPublic)
      }

      const valueA = String(a[sortField] ?? "")
      const valueB = String(b[sortField] ?? "")

      return sortOrder === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA)
    })
  }, [policies, searchQuery, filterStatus, visibilityFilter, sortField, sortOrder])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPolicies.length / itemsPerPage)
  )

  const paginatedPolicies = filteredPolicies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }

    setSortField(field)
    setSortOrder(field === "updatedAt" ? "desc" : "asc")
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3 text-blue-600" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3 text-blue-600" />
    )
  }

  const clearFilters = () => {
    setSearchQuery("")
    setFilterStatus("all")
    setVisibilityFilter("all")
    setSortField("updatedAt")
    setSortOrder("desc")
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm text-gray-500">Admin / Policies</p>
            <h1 className="text-3xl font-bold text-gray-900">
              Policies & Terms Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage policy lifecycle, visibility, and latest updates.
            </p>
          </div>

          <Link href="/admin/policies/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Policy
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <SummaryCard
            title="Total Policies"
            value={counts.total}
            active={filterStatus === "all"}
            onClick={() => setFilterStatus("all")}
          />
          <SummaryCard
            title="Active"
            value={counts.active}
            active={filterStatus === "Active"}
            tone="green"
            onClick={() => setFilterStatus("Active")}
          />
          <SummaryCard
            title="Draft"
            value={counts.draft}
            active={filterStatus === "Draft"}
            tone="gray"
            onClick={() => setFilterStatus("Draft")}
          />
          <SummaryCard
            title="Archived"
            value={counts.archived}
            active={filterStatus === "Archived"}
            tone="red"
            onClick={() => setFilterStatus("Archived")}
          />
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 md:flex-row">
                <div className="relative md:max-w-sm md:flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by title, slug, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select
                  value={filterStatus}
                  onValueChange={(value: StatusFilter) => setFilterStatus(value)}
                >
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={visibilityFilter}
                  onValueChange={(value: VisibilityFilter) =>
                    setVisibilityFilter(value)
                  }
                >
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="Filter visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All visibility</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  {filteredPolicies.length} result
                  {filteredPolicies.length !== 1 ? "s" : ""}
                </p>

                <Button variant="outline" onClick={clearFilters}>
                  Reset
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <FilterChip
                label={`All (${counts.total})`}
                active={filterStatus === "all" && visibilityFilter === "all"}
                onClick={() => {
                  setFilterStatus("all")
                  setVisibilityFilter("all")
                }}
              />
              <FilterChip
                label={`Active (${counts.active})`}
                active={filterStatus === "Active"}
                onClick={() => setFilterStatus("Active")}
              />
              <FilterChip
                label={`Draft (${counts.draft})`}
                active={filterStatus === "Draft"}
                onClick={() => setFilterStatus("Draft")}
              />
              <FilterChip
                label={`Archived (${counts.archived})`}
                active={filterStatus === "Archived"}
                onClick={() => setFilterStatus("Archived")}
              />
              <FilterChip
                label={`Public (${counts.public})`}
                active={visibilityFilter === "public"}
                onClick={() => setVisibilityFilter("public")}
              />
              <FilterChip
                label={`Internal (${counts.internal})`}
                active={visibilityFilter === "internal"}
                onClick={() => setVisibilityFilter("internal")}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <TableLoadingSkeleton />
            ) : filteredPolicies.length === 0 ? (
              <EmptyState onReset={clearFilters} />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        onClick={() => handleSort("title")}
                        className="cursor-pointer select-none"
                      >
                        Title {renderSortIcon("title")}
                      </TableHead>

                      <TableHead
                        onClick={() => handleSort("mainType")}
                        className="cursor-pointer select-none"
                      >
                        Main Type {renderSortIcon("mainType")}
                      </TableHead>

                      <TableHead
                        onClick={() => handleSort("subCategory")}
                        className="cursor-pointer select-none"
                      >
                        Category {renderSortIcon("subCategory")}
                      </TableHead>

                      <TableHead
                        onClick={() => handleSort("status")}
                        className="cursor-pointer select-none"
                      >
                        Status {renderSortIcon("status")}
                      </TableHead>

                      <TableHead
                        onClick={() => handleSort("isPublic")}
                        className="cursor-pointer select-none"
                      >
                        Visibility {renderSortIcon("isPublic")}
                      </TableHead>

                      <TableHead
                        onClick={() => handleSort("updatedAt")}
                        className="cursor-pointer select-none"
                      >
                        Updated {renderSortIcon("updatedAt")}
                      </TableHead>

                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedPolicies.map((policy) => (
                      <TableRow
                        key={policy._id}
                        onClick={() => router.push(`/admin/policies/${policy._id}/detail`)}
                        className="cursor-pointer transition hover:bg-blue-50/50"
                      >
                        <TableCell className="max-w-[320px]">
                          <div className="font-medium text-gray-900">
                            {policy.title}
                          </div>
                          <div className="mt-1 truncate text-xs text-gray-500">
                            {policy.description || policy.slug || "No description"}
                          </div>
                        </TableCell>

                        <TableCell>{policy.mainType}</TableCell>

                        <TableCell className="capitalize">
                          {policy.subCategory}
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${getStatusColor(
                              policy.status
                            )}`}
                          >
                            {policy.status}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${getVisibilityColor(
                              policy.isPublic
                            )}`}
                          >
                            {policy.isPublic ? "Public" : "Internal"}
                          </span>
                        </TableCell>

                        <TableCell>{formatDate(policy.updatedAt)}</TableCell>

                        <TableCell className="text-right">
                          <div
                            className="flex justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/admin/policies/${policy._id}/detail`}>
                              <Button variant="ghost" size="sm" title="Open detail">
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Open detail</span>
                              </Button>
                            </Link>

                            <Link href={`/admin/policies/${policy._id}`}>
                              <Button variant="ghost" size="sm" title="Edit policy">
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <p className="text-sm text-gray-600">
                    Page <span className="font-semibold">{currentPage}</span> of{" "}
                    <span className="font-semibold">{totalPages}</span>
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}