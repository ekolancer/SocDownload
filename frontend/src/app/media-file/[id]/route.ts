import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = process.env.API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN;
  if (!token) return new Response('Server authentication is not configured', { status: 500 });

  const { id } = await context.params;
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const range = request.headers.get('range');
  if (range) headers.set('Range', range);

  const response = await fetch(`http://127.0.0.1:8000/api/media/files/${encodeURIComponent(id)}`, {
    headers,
    cache: 'no-store',
  });
  const forwarded = new Headers();
  for (const name of ['accept-ranges', 'content-disposition', 'content-length', 'content-range', 'content-type', 'etag', 'last-modified']) {
    const value = response.headers.get(name);
    if (value) forwarded.set(name, value);
  }

  return new Response(response.body, { status: response.status, headers: forwarded });
}
