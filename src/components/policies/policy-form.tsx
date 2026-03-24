"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Eye, Info } from "lucide-react"
import PolicyReader from "@/components/policies/policy-reader"

export type PolicyMainType = "TERM" | "PRIVACY"
export type PolicySubCategory =
  | "posting"
  | "data_usage"
  | "comment"
  | "account"
  | "general"
export type PolicyStatus = "Draft" | "Active" | "Archived"

export type PolicyFormAction = "save-draft" | "publish" | "save-changes"

export interface PolicyFormValues {
  title: string
  slug: string
  mainType: PolicyMainType
  subCategory: PolicySubCategory
  status: PolicyStatus
  isPublic: boolean
  description: string
  content: string
  effective_from: string
  effective_to: string
}

interface PolicyFormProps {
  mode: "create" | "edit"
  initialValues: PolicyFormValues
  loading?: boolean
  onSubmit: (values: PolicyFormValues, action: PolicyFormAction) => void | Promise<void>
  backHref?: string
}

export const EMPTY_POLICY_FORM_VALUES: PolicyFormValues = {
  title: "",
  slug: "",
  mainType: "TERM",
  subCategory: "general",
  status: "Draft",
  isPublic: false,
  description: "",
  content: "",
  effective_from: "",
  effective_to: "",
}

export function buildPolicyFormValues(
  values?: Partial<PolicyFormValues>
): PolicyFormValues {
  return {
    ...EMPTY_POLICY_FORM_VALUES,
    ...values,
  }
}

const subCategoryOptions: { value: PolicySubCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "posting", label: "Posting" },
  { value: "comment", label: "Comment" },
  { value: "account", label: "Account" },
  { value: "data_usage", label: "Data Usage" },
]

export default function PolicyForm({
  mode,
  initialValues,
  loading = false,
  onSubmit,
  backHref = "/admin/policies",
}: PolicyFormProps) {
  const [values, setValues] = useState<PolicyFormValues>(
    buildPolicyFormValues(initialValues)
  )
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  useEffect(() => {
    setValues(buildPolicyFormValues(initialValues))
  }, [initialValues])

  const pageTitle =
    mode === "create" ? "Create New Policy" : "Edit Policy"

  const breadcrumbLabel = mode === "create" ? "Create" : "Edit"

  const validateBeforeSubmit = () => {
    if (!values.title.trim() || !values.content.trim()) {
      alert("Title and Full Content are required.")
      return false
    }

    if (
      values.effective_from &&
      values.effective_to &&
      values.effective_from > values.effective_to
    ) {
      alert("Effective To cannot be earlier than Effective From.")
      return false
    }

    return true
  }

  const handleAction = (action: PolicyFormAction) => {
    if (!validateBeforeSubmit()) return
    onSubmit(values, action)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center text-sm text-gray-500">
          <span>Admin</span>
          <span className="mx-2">/</span>
          <Link href="/admin/policies" className="hover:text-gray-700">
            Policies
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-gray-900">{breadcrumbLabel}</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 text-blue-600" />
            <div className="space-y-1 text-sm text-gray-700">
              {mode === "create" ? (
                <>
                  <p className="font-semibold text-blue-900">
                    Publishing workflow
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>
                      <strong>Save Draft</strong> = lưu nội bộ, chưa có hiệu lực
                    </li>
                    <li>
                      <strong>Publish</strong> = chuyển policy sang trạng thái Active
                    </li>
                    <li>
                      <strong>Public</strong> = hiển thị cho end users
                    </li>
                    <li>
                      Policy có thể <strong>Active</strong> nhưng vẫn{" "}
                      <strong>Internal only</strong>
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="font-semibold text-blue-900">
                    Policy lifecycle
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>
                      <strong>Draft</strong> = đang soạn, chưa áp dụng
                    </li>
                    <li>
                      <strong>Active</strong> = đang có hiệu lực
                    </li>
                    <li>
                      <strong>Archived</strong> = ngừng dùng nhưng vẫn lưu lịch sử
                    </li>
                    <li>
                      <strong>Public</strong> chỉ quyết định khả năng hiển thị cho user
                    </li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Policy Details</CardTitle>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault()
              handleAction(mode === "create" ? "save-draft" : "save-changes")
            }}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  required
                  value={values.title}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter policy title"
                />
              </div>

              {mode === "edit" && (
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={values.slug}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="auto-generated if blank"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Main Type *</Label>
                <Select
                  value={values.mainType}
                  onValueChange={(v: PolicyMainType) =>
                    setValues((prev) => ({ ...prev, mainType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TERM">TERM</SelectItem>
                    <SelectItem value="PRIVACY">PRIVACY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subcategory *</Label>
                <Select
                  value={values.subCategory}
                  onValueChange={(v: PolicySubCategory) =>
                    setValues((prev) => ({ ...prev, subCategory: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === "edit" && (
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select
                    value={values.status}
                    onValueChange={(v: PolicyStatus) =>
                      setValues((prev) => ({ ...prev, status: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    checked={values.isPublic}
                    onCheckedChange={(checked) =>
                      setValues((prev) => ({
                        ...prev,
                        isPublic: checked as boolean,
                      }))
                    }
                  />
                  <span className="text-sm">
                    Public policy (visible to end users)
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Unchecked means internal-only visibility.
                </p>
              </div>

              {mode === "edit" && (
                <>
                  <div className="space-y-2">
                    <Label>Effective From</Label>
                    <Input
                      type="date"
                      value={values.effective_from}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          effective_from: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Effective To</Label>
                    <Input
                      type="date"
                      value={values.effective_to}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          effective_to: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={values.description}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Short summary shown in admin list or previews"
              />
            </div>

            <div className="space-y-2">
              <Label>Full Content *</Label>
              <Textarea
                required
                rows={14}
                value={values.content}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder={`Ví dụ:
# Introduction
Policy overview...

# User Responsibilities
1. Users must...
2. Users must not...`}
              />
              <p className="text-xs text-gray-500">
                Mẹo: dùng heading như <strong># Title</strong>, hoặc{" "}
                <strong>Section 1</strong>, <strong>Điều 1</strong> để preview tự chia section đẹp hơn.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsPreviewOpen(true)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </div>

            <div className="flex flex-wrap gap-3 border-t pt-4">
              {mode === "create" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAction("save-draft")}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Draft"}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleAction("publish")}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Publishing..." : "Publish"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => handleAction("save-changes")}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              )}

              <Link href={backHref}>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[88vh] max-w-6xl overflow-y-auto p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Policy Preview</DialogTitle>
          </DialogHeader>

          <div className="p-6">
            <PolicyReader
              compact={false}
              title={values.title || "Untitled"}
              description={values.description}
              content={values.content}
              mainType={values.mainType}
              subCategory={values.subCategory}
              status={mode === "create" ? "Draft / Active on publish" : values.status}
              isPublic={values.isPublic}
              effectiveFrom={values.effective_from}
              effectiveTo={values.effective_to}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}