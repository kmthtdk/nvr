import { Router, type Request, type Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { loginSchema, successResponse, errorResponse } from '../models/schemas.js';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate and receive a JWT token.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await AuthService.login(parsed.username, parsed.password);

    if (!result) {
      res.status(401).json(errorResponse('Invalid username or password'));
      return;
    }

    res.json(successResponse(result));
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json(errorResponse(err.message));
      return;
    }
    res.status(500).json(errorResponse('Login failed'));
  }
});

export default router;
