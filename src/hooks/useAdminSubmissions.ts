'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminClient';
import {
  AiEvaluation,
  PanelScore,
  PanelScoreInput,
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
  const [revisionFields, setRevisionFields] = useState<string[]>([]);
  const [interviewSchedule, setInterviewSchedule] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  const [evaluatingAi, setEvaluatingAi] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFileMeta | null>(null);

  const syncReviewInputs = (item: SelectionSubmission) => {
    setReviewStatus(item.status);
    setReviewerNote(item.reviewerNote || '');
    setRevisionFields(item.revisionFields || []);
    setInterviewSchedule(item.interviewSchedule || '');
  };

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
        syncReviewInputs(first);
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
      NEEDS_REVISION: submissions.filter((s) => s.status === 'NEEDS_REVISION').length,
      REVIEWING: submissions.filter((s) => s.status === 'REVIEWING').length,
      INTERVIEW: submissions.filter((s) => s.status === 'INTERVIEW').length,
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

  const selectedFormFilterDef = useMemo(
    () => forms.find((f) => f.id === selectedFormId),
    [forms, selectedFormId]
  );

  const selectSubmission = (picked: SelectionSubmission) => {
    setSelectedSub(picked);
    syncReviewInputs(picked);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleRevisionField = (fieldId: string) => {
    setRevisionFields((prev) =>
      prev.includes(fieldId) ? prev.filter((x) => x !== fieldId) : [...prev, fieldId]
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
          revisionFields: reviewStatus === 'NEEDS_REVISION' ? revisionFields : [],
          interviewSchedule: reviewStatus === 'INTERVIEW' ? interviewSchedule : '',
        }),
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal menyimpan keputusan.');
      }
      setSubmissions((prev) =>
        prev.map((item) => (item.id === res.data!.id ? res.data! : item))
      );
      setSelectedSub(res.data);
      syncReviewInputs(res.data);
      toast.success('Keputusan seleksi pelamar disimpan.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setSavingReview(false);
    }
  };

  const handleSavePanelScore = async (input: PanelScoreInput) => {
    if (!selectedSub) return;
    setSavingScore(true);
    try {
      const res = await adminFetch<{
        panelScores: PanelScore[];
        averagePanelScore?: number;
      }>('/api/admin/submissions/score', {
        method: 'POST',
        body: JSON.stringify({
          submissionId: selectedSub.id,
          ...input,
        }),
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal menyimpan skor tim penilai.');
      }
      const updated: SelectionSubmission = {
        ...selectedSub,
        panelScores: res.data.panelScores,
        averagePanelScore: res.data.averagePanelScore,
      };
      setSelectedSub(updated);
      setSubmissions((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success('Skor rubrik tim seleksi tersimpan.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan skor.');
    } finally {
      setSavingScore(false);
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
      toast.success('Ringkasan penilaian Gemini Flash Lite selesai.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menganalisis.');
    } finally {
      setEvaluatingAi(false);
    }
  };

  return {
    forms,
    selectedFormId,
    selectedFormFilterDef,
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
    revisionFields,
    toggleRevisionField,
    interviewSchedule,
    setInterviewSchedule,
    savingReview,
    savingScore,
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
    handleSavePanelScore,
    handleEvaluateAi,
  };
}
