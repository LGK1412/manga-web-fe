"use client"

import { use } from "react"
import { useState, useEffect } from "react"
import axios from "axios"
import AdminLayout from "../../adminLayout/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Eye, Info } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const API_URL = "http://localhost:3333/api/policies"

export default function AdminPolicyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [formData, setFormData] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // 🔹 Fetch policy by ID
  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await axios.get(`${API_URL}/${id}`)
        setFormData(res.data)
      } catch (error: any) {
        console.error("❌ Failed to load policy:", error.response?.data || error.message)
        alert("Cannot load policy details.")
      }
    }
    fetchPolicy()
  }, [id])

  // 🔹 Update (PUT)
  const handleSubmit = async () => {
    try {
      setLoading(true)
      const res = await axios.put(`${API_URL}/${id}`, formData)
      if (res.status === 200) {
        console.log("✅ Policy updated:", res.data)
        router.push("/admin/policies")
      }
    } catch (error: any) {
      console.error("❌ Error updating policy:", error.response?.data || error.message)
      alert("Failed to update policy.")
    } finally {
      setLoading(false)
    }
  }

  if (!formData) return <p className="p-6 text-gray-500">Loading policy details...</p>

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center text-sm text-gray-500">
            <span>Admin</span>
            <span className="mx-2">/</span>
            <Link href="/admin/policies" className="hover:text-gray-700">
              Policies
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">Edit</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/policies">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Edit Policy</h1>
          </div>
        </div>

        {/* Info card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1 text-sm text-gray-700">
                <p className="font-semibold text-blue-900">Policy Structure</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>mainType:</strong> TERM (Điều khoản) hoặc PRIVACY (Bảo mật)</li>
                  <li><strong>subCategory:</strong> posting, comment, account, data_usage, general</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader><CardTitle>Policy Details</CardTitle></CardHeader>
          <CardContent>
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit()
              }}
            >
              <div className="grid md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    required
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-generated if blank"
                  />
                </div>

                {/* MainType */}
                <div className="space-y-2">
                  <Label>Main Type *</Label>
                  <Select
                    value={formData.mainType}
                    onValueChange={(v) => setFormData({ ...formData, mainType: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select main type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TERM">TERM (Terms of Use)</SelectItem>
                      <SelectItem value="PRIVACY">PRIVACY (Privacy Policy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SubCategory */}
                <div className="space-y-2">
                  <Label>Sub Category</Label>
                  <Select
                    value={formData.subCategory}
                    onValueChange={(v) => setFormData({ ...formData, subCategory: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="posting">Posting</SelectItem>
                      <SelectItem value="comment">Comment</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                      <SelectItem value="data_usage">Data Usage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      checked={formData.isPublic || false}
                      onCheckedChange={(c) => setFormData({ ...formData, isPublic: c as boolean })}
                    />
                    <span className="text-sm">Make this policy public</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={formData.effective_from ? formData.effective_from.slice(0, 10) : ""}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective To</Label>
                  <Input
                    type="date"
                    value={formData.effective_to ? formData.effective_to.slice(0, 10) : ""}
                    onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label>Full Content *</Label>
                <Textarea
                  required
                  rows={10}
                  value={formData.content || ""}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button type="submit" variant="outline" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Link href="/admin/policies">
                  <Button type="button" variant="ghost">Cancel</Button>
                </Link>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4 mr-2" /> Preview
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{formData.title}</DialogTitle>
              <DialogDescription>
                {formData.mainType} — {formData.subCategory} | {formData.isPublic ? "Public" : "Internal"} | {formData.status}
              </DialogDescription>
            </DialogHeader>
            <div className="bg-gray-50 p-6 rounded-lg whitespace-pre-wrap text-gray-800">
              {formData.content || "No content yet..."}
            </div>
            <DialogFooter><Button onClick={() => setIsPreviewOpen(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
