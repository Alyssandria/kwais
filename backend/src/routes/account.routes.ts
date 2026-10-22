import { Router } from 'express';
import { PrivacyController } from '../controllers/privacy.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { credentialLimiter, exportLimiter } from '../middleware/rate-limits.js';
import { validateBody } from '../middleware/validate.js';
import { DeleteAccountSchema } from '../schemas/privacy.schemas.js';

export const accountRoutes = Router();
accountRoutes.use(authenticate);
accountRoutes.get('/export', exportLimiter, PrivacyController.exportData);
accountRoutes.get('/activity', PrivacyController.activity);
accountRoutes.post('/delete', credentialLimiter, validateBody(DeleteAccountSchema), PrivacyController.deleteAccount);
