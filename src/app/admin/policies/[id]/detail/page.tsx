"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"
import { useParams } from "next/navigation"
import AdminLayout from "../../../adminLayout/page"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil } from "lucide-react"
import PolicyReader from "@/components/policies/policy-reader"

const API_URL = "http://localhost:3333/api/policies"

interface PolicyApiResponse {
  _id: string
  title?: string
  slug?: string
  mainType?: "TERM" | "PRIVACY"
  subCategory?: "posting" | "data_usage" | "comment" | "account" | "general"
  status?: "Draft" | "Active" | "Archived"
  isPublic?: boolean
  description?: string
  content?: string
  updatedAt?: string
  effective_from?: string | null
  effective_to?: string | null
}

function DetailLoadingState() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse rounded-2xl border bg-white p-6">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="mt-4 h-8 w-72 rounded bg-gray-200" />
        <div className="mt-4 h-4 w-full rounded bg-gray-200" />
        <div className="mt-2 h-4 w-5/6 rounded bg-gray-200" />
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
        </div>
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border bg-white p-6">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="mt-4 h-4 w-full rounded bg-gray-200" />
          <div className="mt-2 h-4 w-full rounded bg-gray-200" />
          <div className="mt-2 h-4 w-4/5 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

function NotFoundState() {
  return (
    <Card>
      <CardContent className="space-y-4 p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Policy not found</h2>
        <p className="text-sm text-gray-500">
          Không thể tải policy này hoặc policy không tồn tại.
        </p>
        <div>
          <Link href="/admin/policies">
            <Button variant="outline">Back to policies</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminPolicyDetailPage() {
  const params = useParams<{ id: string }>()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [loading, setLoading] = useState(true)
  const [policy, setPolicy] = useState<PolicyApiResponse | null>(null)

  useEffect(() => {
    const fetchPolicy = async () => {
      if (!id) return

      try {
        setLoading(true)
        const res = await axios.get<PolicyApiResponse>(`${API_URL}/${id}`)
        setPolicy(res.data)
      } catch (error: any) {
        console.error("Failed to load policy detail:", error.response?.data || error.message)
        setPolicy(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPolicy()
  }, [id])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm text-gray-500">Admin / Policies / Detail</p>
            <h1 className="text-3xl font-bold text-gray-900">Policy Detail</h1>
          </div>

          <div className="flex gap-3">
            <Link href="/admin/policies">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>

            {id ? (
              <Link href={`/admin/policies/${id}`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Policy
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        {loading ? (
          <DetailLoadingState />
        ) : !policy ? (
          <NotFoundState />
        ) : (
          <PolicyReader
            title={policy.title || "Untitled policy"}
            description={policy.description}
            content={policy.content || ""}
            mainType={policy.mainType}
            subCategory={policy.subCategory}
            status={policy.status}
            isPublic={policy.isPublic}
            effectiveFrom={
              policy.effective_from ? String(policy.effective_from).slice(0, 10) : ""
            }
            effectiveTo={
              policy.effective_to ? String(policy.effective_to).slice(0, 10) : ""
            }
            updatedAt={policy.updatedAt}
          />
        )}
      </div>
    </AdminLayout>
  )
}