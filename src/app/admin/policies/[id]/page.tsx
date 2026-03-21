"use client"

import { use, useEffect, useState } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import AdminLayout from "../../adminLayout/page"
import { Card, CardContent } from "@/components/ui/card"
import PolicyForm, {
  buildPolicyFormValues,
  PolicyFormAction,
  PolicyFormValues,
} from "@/components/policies/policy-form"

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
  effective_from?: string | null
  effective_to?: string | null
}

export default function AdminPolicyEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [initialValues, setInitialValues] = useState<PolicyFormValues | null>(
    null
  )

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setLoading(true)

        const res = await axios.get<PolicyApiResponse>(`${API_URL}/${id}`)
        const data = res.data

        setInitialValues(
          buildPolicyFormValues({
            title: data.title ?? "",
            slug: data.slug ?? "",
            mainType: data.mainType ?? "TERM",
            subCategory: data.subCategory ?? "general",
            status: data.status ?? "Draft",
            isPublic: data.isPublic ?? false,
            description: data.description ?? "",
            content: data.content ?? "",
            effective_from: data.effective_from
              ? String(data.effective_from).slice(0, 10)
              : "",
            effective_to: data.effective_to
              ? String(data.effective_to).slice(0, 10)
              : "",
          })
        )
      } catch (error: any) {
        console.error(
          "Failed to load policy:",
          error.response?.data || error.message
        )
        alert("Cannot load policy details.")
      } finally {
        setLoading(false)
      }
    }

    fetchPolicy()
  }, [id])

  const handleSubmit = async (
    values: PolicyFormValues,
    _action: PolicyFormAction
  ) => {
    try {
      setLoading(true)

      const payload = {
        title: values.title.trim(),
        slug: values.slug.trim(),
        mainType: values.mainType,
        subCategory: values.subCategory,
        status: values.status,
        isPublic: values.isPublic,
        description: values.description.trim(),
        content: values.content,
        effective_from: values.effective_from || null,
        effective_to: values.effective_to || null,
      }

      const res = await axios.put(`${API_URL}/${id}`, payload, {
        withCredentials: true,
      })

      if (res.status === 200) {
        router.push("/admin/policies")
      } else {
        console.warn("Unexpected response:", res)
      }
    } catch (error: any) {
      console.error(
        "Error updating policy:",
        error.response?.data || error.message
      )
      alert("Failed to update policy.")
    } finally {
      setLoading(false)
    }
  }

  if (!initialValues) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="p-6 text-sm text-gray-500">
            Loading policy details...
          </CardContent>
        </Card>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PolicyForm
        mode="edit"
        initialValues={initialValues}
        loading={loading}
        onSubmit={handleSubmit}
      />
    </AdminLayout>
  )
}