import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const cookie = request.headers.get('cookie');
  const response = await fetch(`${process.env.BACKEND_INTERNAL_URL || 'http://backend:8000'}/api/media/thumbnails/${encodeURIComponent(id)}`, {
    headers: cookie ? { cookie } : {},
    cache: 'no-store',
  });
  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const contentLength = response.headers.get('content-length');
  if (contentLength) headers.set('content-length', contentLength);
  headers.set('Cache-Control', 'private, max-age=86400');
  return new Response(response.body, { status: response.status, headers });
}
