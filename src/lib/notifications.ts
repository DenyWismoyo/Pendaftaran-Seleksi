import { SUBMISSION_STATUS_META } from '@/lib/constants';
import { getPrimaryAppOrigin } from '@/lib/security';
import { SubmissionStatus } from '@/types/selection';

interface SubmissionNotificationPayload {
  event: 'SUBMISSION_CREATED' | 'STATUS_UPDATED' | 'REVISION_SUBMITTED';
  registrationCode: string;
  formTitle: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  status: SubmissionStatus;
  reviewerNote?: string;
}

function buildEmailHtml(payload: SubmissionNotificationPayload, trackingUrl: string): {
  subject: string;
  html: string;
} {
  const statusLabel = SUBMISSION_STATUS_META[payload.status]?.label || payload.status;

  if (payload.event === 'SUBMISSION_CREATED') {
    return {
      subject: `[${payload.registrationCode}] Bukti Pendaftaran ${payload.formTitle}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b;line-height:1.5">
          <h2 style="margin-bottom:8px">Pendaftaran Seleksi Diterima</h2>
          <p>Halo <strong>${payload.applicantName}</strong>,</p>
          <p>Pendaftaran Anda untuk program <strong>${payload.formTitle}</strong> telah berhasil tercatat di sistem.</p>
          <p style="padding:12px 16px;background:#f4f4f5;border-radius:8px;font-family:monospace;font-size:16px">
            Kode Pendaftaran: <strong>${payload.registrationCode}</strong>
          </p>
          <p>Anda dapat memantau status verifikasi berkas dan mencetak kartu peserta melalui tautan berikut:</p>
          <p><a href="${trackingUrl}" style="color:#047857;font-weight:600">${trackingUrl}</a></p>
          <p style="margin-top:20px;font-size:12px;color:#71717a">Dikirim otomatis melalui platform <strong>Kandidat</strong>.</p>
        </div>
      `,
    };
  }

  return {
    subject: `[${payload.registrationCode}] Pembaruan Status Seleksi: ${statusLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b;line-height:1.5">
        <h2 style="margin-bottom:8px">Pembaruan Status Pendaftaran</h2>
        <p>Halo <strong>${payload.applicantName}</strong>,</p>
        <p>Status pendaftaran Anda (${payload.registrationCode}) pada <strong>${payload.formTitle}</strong> kini berstatus: <strong>${statusLabel}</strong>.</p>
        ${
          payload.reviewerNote
            ? `<div style="padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin:12px 0"><strong>Catatan Tim Seleksi:</strong><br/>${payload.reviewerNote}</div>`
            : ''
        }
        <p>Periksa detail dan tindak lanjut melalui tautan berikut:</p>
        <p><a href="${trackingUrl}" style="color:#047857;font-weight:600">${trackingUrl}</a></p>
        <p style="margin-top:20px;font-size:12px;color:#71717a">Dikirim otomatis melalui platform <strong>Kandidat</strong>.</p>
      </div>
    `,
  };
}

export async function dispatchApplicantNotification(
  payload: SubmissionNotificationPayload
): Promise<void> {
  const origin = getPrimaryAppOrigin();
  const trackingUrl = `${origin}/cek-status?code=${encodeURIComponent(
    payload.registrationCode
  )}&email=${encodeURIComponent(payload.applicantEmail)}`;

  const tasks: Promise<unknown>[] = [];

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey && payload.applicantEmail) {
    const mailFrom =
      process.env.MAIL_FROM?.trim() || 'Kandidat <onboarding@resend.dev>';
    const { subject, html } = buildEmailHtml(payload, trackingUrl);

    tasks.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: mailFrom,
          to: [payload.applicantEmail],
          subject,
          html,
        }),
      }).catch(() => undefined)
    );
  }

  const webhookUrl = process.env.WEBHOOK_NOTIFY_URL?.trim();
  if (webhookUrl) {
    const internalSecret = process.env.INTERNAL_API_SECRET?.trim() || '';
    tasks.push(
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(internalSecret ? { 'x-app-secret': internalSecret } : {}),
        },
        body: JSON.stringify({
          ...payload,
          trackingUrl,
          sentAt: new Date().toISOString(),
        }),
      }).catch(() => undefined)
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}

