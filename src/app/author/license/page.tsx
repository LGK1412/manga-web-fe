'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import {
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  ImageIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Navbar } from '@/components/navbar'

type LicenseStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

interface LicenseStatusResponse {
  status: LicenseStatus
  rejectReason?: string
}

export default function AuthorLicensePage() {
  const { id } = useParams()
  const router = useRouter()

  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>('NONE')
  const [rejectReason, setRejectReason] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const charLimit = 500
  const remainingChars = charLimit - note.length

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null

  const api = axios.create({
    baseURL: 'http://localhost:3333/api',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // ================= FETCH LICENSE STATUS =================

  const fetchLicenseStatus = async () => {
    try {
      const res = await api.get<LicenseStatusResponse>(
        `/manga/${id}/license-status`,
      )
      setLicenseStatus(res.data.status)
      setRejectReason(res.data.rejectReason || null)
    } catch (err) {
      console.error('Failed to fetch license status')
    }
  }

  useEffect(() => {
    if (id) fetchLicenseStatus()
  }, [id])

  // ================= HANDLE FILE SELECT =================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selected = Array.from(e.target.files)
    setFiles(selected)
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // ================= SUBMIT LICENSE =================

  const handleSubmit = async () => {
    if (files.length === 0) return alert('Please select at least one file')

    try {
      setLoading(true)

      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      formData.append('note', note)

      await api.post(`/manga/${id}/license`, formData)

      alert('License submitted successfully')
      setFiles([])
      setNote('')
      fetchLicenseStatus()
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = {
    NONE: { color: 'bg-gray-100 text-gray-800', label: 'No License' },
    PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'Under Review' },
    APPROVED: { color: 'bg-green-100 text-green-800', label: 'Verified' },
    REJECTED: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navbar />
      <div className="pt-24 p-4 md:p-8">
        <div className="mx-auto max-w-2xl">

          <div className="mb-8">
            <h1 className="text-3xl font-bold">Upload License</h1>
            <p className="mt-2 text-gray-600">
              Submit copyright documents for verification
            </p>
          </div>

          {/* STATUS CARD */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>License Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={statusConfig[licenseStatus].color}>
                {statusConfig[licenseStatus].label}
              </Badge>
            </CardContent>
          </Card>

          {/* REJECTION ALERT */}
          {licenseStatus === 'REJECTED' && rejectReason && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Submission Rejected</AlertTitle>
              <AlertDescription>
                <p className="mt-2">{rejectReason}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* UPLOAD SECTION */}
          {(licenseStatus === 'NONE' || licenseStatus === 'REJECTED') && (
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
                  onChange={handleFileChange}
                />

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between border p-2 rounded"
                      >
                        <span className="text-sm truncate">
                          {file.name}
                        </span>
                        <button onClick={() => removeFile(index)}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Textarea
                  value={note}
                  onChange={e =>
                    setNote(e.target.value.slice(0, charLimit))
                  }
                  placeholder="Optional note..."
                />

                <p className="text-xs text-gray-500">
                  {remainingChars} characters remaining
                </p>

                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Submitting...' : 'Submit License'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* APPROVED MESSAGE */}
          {licenseStatus === 'APPROVED' && (
            <Card>
              <CardContent className="p-6 text-center text-green-600 font-semibold">
                Your license has been verified successfully.
              </CardContent>
            </Card>
          )}

          {/* INFO SECTION */}
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <div className="border p-4 rounded">
              <Clock className="h-5 w-5 text-blue-600 mb-2" />
              <p className="text-sm">
                Reviews take 3-5 business days.
              </p>
            </div>

            <div className="border p-4 rounded">
              <CheckCircle2 className="h-5 w-5 text-green-600 mb-2" />
              <p className="text-sm">
                Documents are securely stored.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
