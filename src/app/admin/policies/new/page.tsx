"use client"

import { useState } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import AdminLayout from "../../adminLayout/page"
import PolicyForm, {
  buildPolicyFormValues,
  PolicyFormAction,
  PolicyFormValues,
} from "@/components/policies/policy-form"

const API_URL = "http://localhost:3333/api/policies"

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

      const res = await axios.post(API_URL, payload)

      if (res.status === 201 || res.status === 200) {
        router.push("/admin/policies")
      } else {
        console.warn("Unexpected response:", res)
      }
    } catch (error: any) {
      console.error(
        "Error creating policy:",
        error.response?.data || error.message
      )
      alert("Failed to create policy. Check console for details.")
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