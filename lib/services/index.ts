/**
 * Services Index
 * Central export point for all service layer utilities
 */

// JWT Service
export {
  generateToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  isTokenExpired,
  refreshToken,
  type JWTPayload
} from './jwt';

// Password Service
export {
  hashPassword,
  verifyPassword,
  generateTemporaryPassword,
  validatePasswordStrength
} from './password';

// Auth Service
export {
  authenticateUser,
  registerUser,
  getUserProfile,
  updatePassword,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type AuthError
} from './auth-service';
