import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

export type AuthorRequestStatus = "none" | "pending" | "approved";

export interface EligibilityCriteria {
  id: string;
  label: string;
  required: number;
  actual: number;
  met: boolean;
}

export interface AuthorRequestStatusResponse {
  status: AuthorRequestStatus;
  requestedAt?: string;
  approvedAt?: string;
  autoApproved?: boolean;
  criteria: EligibilityCriteria[];
  canRequest: boolean;
  message?: string;
}

interface UseAuthorRequestReturn {
  data: AuthorRequestStatusResponse | null;
  loading: boolean;
  error: string | null;
  submitting: boolean;
  refresh: () => Promise<void>;
  requestAuthor: () => Promise<{
    success: boolean;
    message: string;
    autoApproved?: boolean;
  } | null>;
}

export function useAuthorRequest(enabled: boolean): UseAuthorRequestReturn {
  const [data, setData] = useState<AuthorRequestStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<AuthorRequestStatusResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/author-request/status`,
        { withCredentials: true }
      );
      setData(res.data);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Không thể tải trạng thái yêu cầu tác giả";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchStatus();
    }
  }, [enabled, fetchStatus]);

  const requestAuthor = useCallback(async () => {
    if (!enabled || submitting) return null;
    setSubmitting(true);
    setError(null);
    try {
      const res = await axios.post<{
        success: boolean;
        message: string;
        autoApproved?: boolean;
      }>(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/author-request`,
        {},
        { withCredentials: true }
      );
      await fetchStatus();
      return res.data;
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Gửi yêu cầu thất bại";
      setError(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [enabled, submitting, fetchStatus]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      submitting,
      refresh: fetchStatus,
      requestAuthor,
    }),
    [data, loading, error, submitting, fetchStatus, requestAuthor]
  );
}
