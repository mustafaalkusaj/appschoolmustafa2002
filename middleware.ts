import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return new NextResponse(
      `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>الموقع تحت الصيانة</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .container {
      background: white;
      padding: 60px 40px;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      max-width: 480px;
      width: 90%;
    }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { font-size: 28px; color: #1e293b; margin-bottom: 12px; }
    p { font-size: 16px; color: #64748b; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔧</div>
    <h1>الموقع تحت الصيانة</h1>
    <p>نقوم حالياً بإجراء تحديثات وتحسينات. سنعود قريباً.</p>
  </div>
</body>
</html>`,
      {
        status: 503,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Retry-After': '3600',
        },
      }
    );
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
