'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { X, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Navbar } from '@/components/navbar'

type LicenseStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

interface LicenseStatusResponse {
  status?: LicenseStatus
  rejectReason?: string
}

const STATUS_CONFIG: Record<
  LicenseStatus,
  { color: string; label: string }
> = {
  NONE: { color: 'bg-gray-100 text-gray-800', label: 'No License' },
  PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'Under Review' },
  APPROVED: { color: 'bg-green-100 text-green-800', label: 'Verified' },
  REJECTED: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
}

export default function AuthorLicensePage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [licenseStatus, setLicenseStatus] =
    useState<LicenseStatus>('NONE')
  const [rejectReason, setRejectReason] =
    useState<string | null>(null)

  const [files, setFiles] = useState<File[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [statusError, setStatusError] =
    useState<string | null>(null)
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null)

  const api = useMemo(() => {
    return axios.create({
      baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
      withCredentials: true,
    })
  }, [])

  const normalizeStatus = (status?: string): LicenseStatus => {
    if (!status) return 'NONE'
    if (['NONE', 'PENDING', 'APPROVED', 'REJECTED'].includes(status))
      return status as LicenseStatus
    return 'NONE'
  }

  const fetchLicenseStatus = async () => {
    if (!id) return
    try {
      const res = await api.get<LicenseStatusResponse>(
        `/manga/${id}/license-status`,
      )

      const safeStatus = normalizeStatus(res.data.status)

      setLicenseStatus(safeStatus)
      setRejectReason(res.data.rejectReason || null)
      setStatusError(null)
    } catch (err: any) {
      setStatusError(
        err?.response?.data?.message ||
          'Failed to load license status',
      )
      setLicenseStatus('NONE')
    } finally {
      setIsInitialLoading(false)
    }
  }

  useEffect(() => {
    fetchLicenseStatus()
  }, [id])

  const handleSubmit = async () => {
    if (!files.length) {
      alert('Please select at least one file')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      files.forEach(file =>
        formData.append('files', file),
      )
      formData.append('note', note)

      await api.post(`/manga/${id}/license`, formData)

      setSuccessMessage(
        'License submitted successfully! Waiting for review...',
      )
      setFiles([])
      setNote('')
      fetchLicenseStatus()
    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
          'Upload failed',
      )
    } finally {
      setLoading(false)
    }
  }

  const currentStatus =
    STATUS_CONFIG[licenseStatus] ??
    STATUS_CONFIG['NONE']

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="pt-24 flex justify-center items-center h-96">
          Loading...
        </main>
      </div>
    )
  }

  const shouldShowForm =
    licenseStatus !== 'APPROVED'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-3xl mx-auto">

          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              Upload License
            </h1>
            <p className="mt-2 text-gray-600">
              Submit copyright documents for verification
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>License Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={currentStatus.color}>
                {currentStatus.label}
              </Badge>
            </CardContent>
          </Card>

          {shouldShowForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  PDF or image files only (Max 10MB each)
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={e =>
                    setFiles(
                      e.target.files
                        ? Array.from(e.target.files)
                        : [],
                    )
                  }
                />

                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex justify-between border p-2 rounded"
                  >
                    <span className="text-sm truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() =>
                        setFiles(prev =>
                          prev.filter(
                            (_, i) => i !== index,
                          ),
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <Textarea
                  value={note}
                  onChange={e =>
                    setNote(
                      e.target.value.slice(0, 500),
                    )
                  }
                  placeholder="Optional note..."
                />

                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full"
                >
                  {loading
                    ? 'Submitting...'
                    : 'Submit License'}
                </Button>
              </CardContent>
            </Card>
          )}

          {licenseStatus === 'APPROVED' && (
            <Card>
              <CardContent className="p-6 text-center text-green-600 font-semibold">
                Your license has been verified successfully.
              </CardContent>
            </Card>
          )}

          <div className="mt-8">
            <div className="border p-4 rounded">
              <Clock className="h-5 w-5 text-blue-600 mb-2" />
              <p className="text-sm">
                Reviews take 3–5 business days.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
