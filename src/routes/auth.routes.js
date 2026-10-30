import {Router} from 'express';
import { validateRegister } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';
import { loginUser, registerUser , refreshAccessToken , logoutUser} from '../controllers/auth.controller.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register',authRateLimiter , validateRegister(registerSchema), registerUser);
router.post('/login', authRateLimiter, validateRegister(loginSchema), loginUser);
router.post("/refresh", authRateLimiter, refreshAccessToken);
router.post("/logout",authenticateToken,authRateLimiter,logoutUser);

export default router;