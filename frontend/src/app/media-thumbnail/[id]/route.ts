import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = process.env.API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN;
  if (!token) return new Response('Server authentication is not configured', { status: 500 });
  const { id } = await context.params;
  const response = await fetch(`http://127.0.0.1:8000/api/media/thumbnails/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
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
