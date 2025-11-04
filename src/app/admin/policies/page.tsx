"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import AdminLayout from "../adminLayout/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Search, Eye, Pencil, ScrollText, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

const API_BASE = "http://localhost:3333/api/policies"

interface Policy {
  _id: string
  title: string
  slug: string
  mainType: "TERM" | "PRIVACY"
  subCategory: "posting" | "data_usage" | "comment" | "account" | "general"
  description?: string
  content: string
  status: "Draft" | "Active" | "Archived"
  isPublic: boolean
  updatedAt: string
  createdAt: string
}

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)
  const [showActivePolicies, setShowActivePolicies] = useState(false)
  const [loading, setLoading] = useState(false)

  // 🧭 Sort state
  const [sortField, setSortField] = useState<string>("updatedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // 🧩 Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // 🔁 Fetch all policies
  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const res = await axios.get(API_BASE)
      if (Array.isArray(res.data)) setPolicies(res.data)
      else console.warn("⚠️ Unexpected API response:", res.data)
    } catch (err) {
      console.error("❌ Failed to fetch policies:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicies()
  }, [])

  // 🧠 Filter + search + sort
  const filteredPolicies = policies
    .filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase())
      const matchFilter = filterStatus === "all" || p.status.toLowerCase() === filterStatus.toLowerCase()
      return matchSearch && matchFilter
    })
    .sort((a, b) => {
      const valA = a[sortField as keyof Policy]
      const valB = b[sortField as keyof Policy]

      if (!valA || !valB) return 0

      if (sortField === "updatedAt" || sortField === "createdAt") {
        return sortOrder === "asc"
          ? new Date(valA as string).getTime() - new Date(valB as string).getTime()
          : new Date(valB as string).getTime() - new Date(valA as string).getTime()
      }

      if (sortField === "isPublic") {
        return sortOrder === "asc"
          ? Number(a.isPublic) - Number(b.isPublic)
          : Number(b.isPublic) - Number(a.isPublic)
      }

      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })

  const activePolicies = policies.filter((p) => p.status === "Active")
  const draftPolicies = policies.filter((p) => p.status === "Draft")

  // 🧮 Pagination logic
  const totalPages = Math.ceil(filteredPolicies.length / itemsPerPage)
  const paginatedPolicies = filteredPolicies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "archived":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null
    return sortOrder === "asc" ? (
      <ArrowUp className="inline w-3 h-3 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="inline w-3 h-3 ml-1 text-blue-600" />
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Admin / Policies</p>
            <h1 className="text-3xl font-bold text-gray-900">Policies & Terms Management</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowActivePolicies(true)}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <ScrollText className="h-4 w-4 mr-2" /> Preview Active
            </Button>

            <Link href="/admin/policies/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" /> New Policy
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{policies.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{activePolicies.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">{draftPolicies.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort("title")} className="cursor-pointer select-none">
                    Title {renderSortIcon("title")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("mainType")} className="cursor-pointer select-none">
                    Main Type {renderSortIcon("mainType")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("subCategory")} className="cursor-pointer select-none">
                    Category {renderSortIcon("subCategory")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("status")} className="cursor-pointer select-none">
                    Status {renderSortIcon("status")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("isPublic")} className="cursor-pointer select-none">
                    Public {renderSortIcon("isPublic")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("updatedAt")} className="cursor-pointer select-none">
                    Updated {renderSortIcon("updatedAt")}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedPolicies.map((policy) => (
                  <TableRow key={policy._id}>
                    <TableCell>{policy.title}</TableCell>
                    <TableCell>{policy.mainType}</TableCell>
                    <TableCell className="capitalize">{policy.subCategory}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${getStatusColor(
                          policy.status
                        )}`}
                      >
                        {policy.status}
                      </span>
                    </TableCell>
                    <TableCell>{policy.isPublic ? "✅" : "❌"}</TableCell>
                    <TableCell>{new Date(policy.updatedAt).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPolicy(policy)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Link href={`/admin/policies/${policy._id}`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {loading && <p className="text-sm text-gray-500 p-4">Loading...</p>}

            {/* Pagination Controls */}
            <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
              <Button
                variant="outline"
                size="sm"
                onClick={prevPage}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>

              <p className="text-sm text-gray-600">
                Page <span className="font-semibold">{currentPage}</span> of{" "}
                <span className="font-semibold">{totalPages || 1}</span>
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className="flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Policy Detail Dialog */}
        <Dialog open={!!selectedPolicy} onOpenChange={() => setSelectedPolicy(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPolicy?.title}</DialogTitle>
              <DialogDescription>
                {selectedPolicy?.mainType} — {selectedPolicy?.subCategory}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">{selectedPolicy?.description}</p>
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-gray-800">
                {selectedPolicy?.content}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Active Policies Dialog */}
        <Dialog open={showActivePolicies} onOpenChange={setShowActivePolicies}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Active Policies</DialogTitle>
              <DialogDescription>Policies currently in effect</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {activePolicies.map((p) => (
                <div key={p._id} className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{p.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {p.mainType} — {p.subCategory}
                  </p>
                  <div className="bg-gray-50 p-4 rounded text-gray-800 whitespace-pre-wrap">{p.content}</div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t mt-4 text-right">
              <Button onClick={() => setShowActivePolicies(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
