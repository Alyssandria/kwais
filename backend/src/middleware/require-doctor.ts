import { authenticate, requireRole } from './authenticate.js';

export const requireDoctor = [authenticate, requireRole('doctor')];
