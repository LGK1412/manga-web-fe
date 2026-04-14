"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "../../adminLayout/page"
import { api } from "@/lib/http"
import PolicyForm, {
  buildPolicyFormValues,
  PolicyFormAction,
  PolicyFormValues,
} from "@/components/policies/policy-form"

export default function AdminPolicyCreatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (
    values: PolicyFormValues,
    action: PolicyFormAction
  ) => {
    try {
      setLoading(true)

      const payload = {
        title: values.title.trim(),
        mainType: values.mainType,
        subCategory: values.subCategory,
        status: action === "publish" ? "Active" : "Draft",
        isPublic: values.isPublic,
        description: values.description.trim(),
        content: values.content,
      }

      const res = await api.post("/policies", payload)

      if (res.status === 201 || res.status === 200) {
        router.push("/admin/policies")
      } else {
        console.warn("Unexpected response:", res)
      }
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to create policy."

      console.error(
        "Error creating policy:",
        error?.response?.data || error
      )
      alert(
        Array.isArray(backendMessage)
          ? backendMessage.join("\n")
          : String(backendMessage)
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <PolicyForm
        mode="create"
        initialValues={buildPolicyFormValues()}
        loading={loading}
        onSubmit={handleSubmit}
      />
    </AdminLayout>
  )
}
