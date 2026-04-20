/**
 * Authentication Service
 * Core service for user authentication operations
 * Integrates with Prisma database and JWT tokens
 */

import { prisma } from '@/lib/prisma';
import { generateToken, JWTPayload } from './jwt';
import { hashPassword, verifyPassword } from './password';
import { createApiLogger } from '@/lib/api-logger';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    fullNameEn: string;
    fullNameAr: string;
    schoolId: string;
    branchId?: string;
    role: string;
    isSinglePageUser: boolean;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullNameEn: string;
  fullNameAr: string;
  schoolId: string;
  branchId?: string;
  roleId: string;
}

export interface AuthError {
  message: string;
  code:
    | 'INVALID_CREDENTIALS'
    | 'USER_NOT_FOUND'
    | 'USER_INACTIVE'
    | 'USER_EXISTS'
    | 'INVALID_SCHOOL'
    | 'INVALID_BRANCH'
    | 'INVALID_ROLE'
    | 'DATABASE_ERROR';
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(
  req: LoginRequest
): Promise<LoginResponse | AuthError> {
  const log = createApiLogger({
    endpoint: '/api/auth/login',
    userId: req.email
  });

  try {
    log.logRequest('POST', req.email);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: req.email },
      include: {
        role: true,
        school: true,
        branch: true
      }
    });

    if (!user) {
      log.logAuthEvent('failed_login', 'User not found');
      return {
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      };
    }

    // Check if user is active
    if (!user.isActive) {
      log.logAuthEvent('failed_login', 'User inactive');
      return {
        message: 'User account is inactive',
        code: 'USER_INACTIVE'
      };
    }

    // Verify password
    const passwordValid = await verifyPassword(req.password, user.passwordHash);

    if (!passwordValid) {
      log.logAuthEvent('failed_login', 'Invalid password');
      return {
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      };
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      schoolId: user.schoolId,
      branchId: user.branchId || undefined,
      role: user.role.code,
      isSinglePageUser: user.isSinglePageUser
    });

    log.logAuthEvent('login', `User ${user.email} logged in`);
    log.logResponse(200, user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullNameEn: user.fullNameEn,
        fullNameAr: user.fullNameAr,
        schoolId: user.schoolId,
        branchId: user.branchId || undefined,
        role: user.role.code,
        isSinglePageUser: user.isSinglePageUser
      }
    };
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint: '/api/auth/login' }
    );

    return {
      message: 'Authentication failed',
      code: 'DATABASE_ERROR'
    };
  }
}

/**
 * Register a new user
 */
export async function registerUser(
  req: RegisterRequest
): Promise<LoginResponse | AuthError> {
  const log = createApiLogger({
    endpoint: '/api/auth/register',
    userId: req.email
  });

  try {
    log.logRequest('POST', req.email);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: req.email }
    });

    if (existingUser) {
      log.logAuthEvent('failed_login', 'User already exists');
      return {
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      };
    }

    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId }
    });

    if (!school) {
      return {
        message: 'Invalid school ID',
        code: 'INVALID_SCHOOL'
      };
    }

    // Validate branch if provided
    if (req.branchId) {
      const branch = await prisma.branch.findFirst({
        where: {
          id: req.branchId,
          schoolId: req.schoolId
        }
      });

      if (!branch) {
        return {
          message: 'Invalid branch ID',
          code: 'INVALID_BRANCH'
        };
      }
    }

    // Validate role exists
    const role = await prisma.role.findFirst({
      where: {
        id: req.roleId,
        schoolId: req.schoolId
      }
    });

    if (!role) {
      return {
        message: 'Invalid role ID',
        code: 'INVALID_ROLE'
      };
    }

    // Hash password
    const passwordHash = await hashPassword(req.password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: req.email,
        passwordHash,
        fullNameEn: req.fullNameEn,
        fullNameAr: req.fullNameAr,
        schoolId: req.schoolId,
        branchId: req.branchId,
        roleId: req.roleId,
        isActive: true,
        isSinglePageUser: false
      },
      include: {
        role: true,
        school: true,
        branch: true
      }
    });

    // Log data modification
    log.logDataModification('create', 'users', newUser.id, req.email);

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      schoolId: newUser.schoolId,
      branchId: newUser.branchId || undefined,
      role: newUser.role.code,
      isSinglePageUser: newUser.isSinglePageUser
    });

    log.logAuthEvent('login', `New user ${newUser.email} registered and logged in`);
    log.logResponse(201, newUser.id);

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullNameEn: newUser.fullNameEn,
        fullNameAr: newUser.fullNameAr,
        schoolId: newUser.schoolId,
        branchId: newUser.branchId || undefined,
        role: newUser.role.code,
        isSinglePageUser: newUser.isSinglePageUser
      }
    };
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint: '/api/auth/register' }
    );

    return {
      message: 'Registration failed',
      code: 'DATABASE_ERROR'
    };
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        },
        school: true,
        branch: true
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullNameEn: user.fullNameEn,
      fullNameAr: user.fullNameAr,
      schoolId: user.schoolId,
      branchId: user.branchId,
      role: user.role.code,
      roleId: user.roleId,
      isSinglePageUser: user.isSinglePageUser,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      school: user.school,
      branch: user.branch,
      permissions: user.role.permissions.map((rp) => rp.permission.code)
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Update user password
 */
export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: AuthError }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return {
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      };
    }

    // Verify current password
    const passwordValid = await verifyPassword(currentPassword, user.passwordHash);

    if (!passwordValid) {
      return {
        success: false,
        error: {
          message: 'Current password is incorrect',
          code: 'INVALID_CREDENTIALS'
        }
      };
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Failed to update password',
        code: 'DATABASE_ERROR'
      }
    };
  }
}
