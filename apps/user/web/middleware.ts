import createMiddleware from 'next-intl/middleware';
import { routing } from '@repo/config/src/lib/routing';

export default createMiddleware(routing);