'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminClient';
import {
  AiEvaluation,
  SelectionForm,
  SelectionSubmission,
  SubmissionStatus,
  UploadedFileMeta,
} from '@/types/selection';

export function useAdminSubmissions(initialFormId: string) {
  const [forms, setForms] = useState<SelectionForm[]>([]);
  const [submissions, setSubmissions] = useState<SelectionSubmission[]>([]);
  const [selectedFormId, setSelectedFormId] = useState(initialFormId);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedSub, setSelectedSub] = useState<SelectionSubmission | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<SubmissionStatus>('REVIEWING');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [reviewStatus, setReviewStatus] = useState<SubmissionStatus>('SUBMITTED');
  const [reviewerNote, setReviewerNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [evaluatingAi, setEvaluatingAi] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFileMeta | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [formsRes, subsRes] = await Promise.all([
      adminFetch<SelectionForm[]>('/api/admin/forms'),
      adminFetch<SelectionSubmission[]>(
        `/api/admin/submissions${
          selectedFormId ? `?formId=${encodeURIComponent(selectedFormId)}` : ''
        }`
      ),
    ]);

    if (formsRes.success && formsRes.data) setForms(formsRes.data);
    if (subsRes.success && subsRes.data) {
      setSubmissions(subsRes.data);
      if (subsRes.data.length > 0 && !selectedSub) {
        const first = subsRes.data[0];
        setSelectedSub(first);
        setReviewStatus(first.status);
        setReviewerNote(first.reviewerNote || '');
      }
    }
    setLoading(false);
  }, [selectedFormId, selectedSub]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormId]);

  const statusCounts = useMemo(
    () => ({
      ALL: submissions.length,
      SUBMITTED: submissions.filter((s) => s.status === 'SUBMITTED').length,
      REVIEWING: submissions.filter((s) => s.status === 'REVIEWING').length,
      ACCEPTED: submissions.filter((s) => s.status === 'ACCEPTED').length,
      REJECTED: submissions.filter((s) => s.status === 'REJECTED').length,
    }),
    [submissions]
  );

  const filteredSubmissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((s) => {
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchSearch =
        !q ||
        s.applicantName.toLowerCase().includes(q) ||
        s.applicantEmail.toLowerCase().includes(q) ||
        s.registrationCode.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [submissions, statusFilter, search]);

  const currentFormDef = useMemo(
    () => forms.find((f) => f.id === selectedSub?.formId),
    [forms, selectedSub]
  );

  const selectSubmission = (picked: SelectionSubmission) => {
    setSelectedSub(picked);
    setReviewStatus(picked.status);
    setReviewerNote(picked.reviewerNote || '');
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const changeFormFilter = (formId: string) => {
    setSelectedFormId(formId);
    setSelectedSub(null);
    setSelectedIds([]);
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    setBulkUpdating(true);
    try {
      const res = await adminFetch('/api/admin/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
      });
      if (!res.success) {
        throw new Error(res.error || 'Gagal memperbarui status massal.');
      }
      setSubmissions((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.id) ? { ...item, status: bulkStatus } : item
        )
      );
      if (selectedSub && selectedIds.includes(selectedSub.id)) {
        setSelectedSub({ ...selectedSub, status: bulkStatus });
        setReviewStatus(bulkStatus);
      }
      toast.success(`${selectedIds.length} pelamar berhasil diperbarui.`);
      setSelectedIds([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal update massal.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleSaveReview = async () => {
    if (!selectedSub) return;
    setSavingReview(true);
    try {
      const res = await adminFetch<SelectionSubmission>('/api/admin/submissions', {
        method: 'PATCH',
        body: JSON.stringify({
          id: selectedSub.id,
          status: reviewStatus,
          reviewerNote,
        }),
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal menyimpan keputusan.');
      }
      setSubmissions((prev) =>
        prev.map((item) => (item.id === res.data!.id ? res.data! : item))
      );
      setSelectedSub(res.data);
      toast.success('Keputusan seleksi pelamar disimpan.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setSavingReview(false);
    }
  };

  const handleEvaluateAi = async () => {
    if (!selectedSub) return;
    setEvaluatingAi(true);
    try {
      const res = await adminFetch<AiEvaluation>('/api/admin/ai', {
        method: 'POST',
        body: JSON.stringify({
          action: 'evaluate-submission',
          submissionId: selectedSub.id,
        }),
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal menjalankan penilaian otomatis.');
      }
      const updated = { ...selectedSub, aiEvaluation: res.data };
      setSelectedSub(updated);
      setSubmissions((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success('Ringkasan penilaian selesai.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menganalisis.');
    } finally {
      setEvaluatingAi(false);
    }
  };

  return {
    forms,
    selectedFormId,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    loading,
    selectedSub,
    selectedIds,
    bulkStatus,
    setBulkStatus,
    bulkUpdating,
    reviewStatus,
    setReviewStatus,
    reviewerNote,
    setReviewerNote,
    savingReview,
    evaluatingAi,
    previewFile,
    setPreviewFile,
    statusCounts,
    filteredSubmissions,
    currentFormDef,
    selectSubmission,
    toggleSelectId,
    changeFormFilter,
    handleBulkUpdate,
    handleSaveReview,
    handleEvaluateAi,
  };
}

