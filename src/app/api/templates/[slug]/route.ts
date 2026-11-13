import { NextRequest, NextResponse } from 'next/server';
import { findDocumentTemplateBySlug } from '@/lib/templateStore';
import { buildWordDocPayload } from '@/lib/documentConverter';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const tpl = await findDocumentTemplateBySlug(slug);

  if (!tpl) {
    return NextResponse.json(
      { success: false, error: 'Template dokumen tidak ditemukan.' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format')?.toLowerCase() === 'md' ? 'md' : 'doc';

  if (format === 'md') {
    return new NextResponse(tpl.markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${tpl.fileBaseName}.md"`,
      },
    });
  }

  const wordHtml = buildWordDocPayload(tpl.title, tpl.markdown);
  return new NextResponse('\ufeff' + wordHtml, {
    status: 200,
    headers: {
      'Content-Type': 'application/msword; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tpl.fileBaseName}.doc"`,
    },
  });
}

