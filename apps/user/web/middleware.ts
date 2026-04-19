import createMiddleware from 'next-intl/middleware';
import { routing } from '../../../packages/config/src/lib/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|health|.*\\..*).*)'],
};
