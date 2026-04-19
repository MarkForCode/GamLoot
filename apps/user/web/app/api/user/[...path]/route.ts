import { NextRequest, NextResponse } from 'next/server';

const USER_API_URL = process.env.USER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type RouteContext = {
  params: {
    path: string[];
  };
};

async function proxy(request: NextRequest, context: RouteContext) {
  const path = context.params.path.join('/');
  const target = new URL(`${USER_API_URL.replace(/\/$/, '')}/${path}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const response = await fetch(target, {
    method: request.method,
    headers: {
      'content-type': request.headers.get('content-type') || 'application/json',
    },
    body,
    cache: 'no-store',
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export const GET = proxy;
export const POST = proxy;
