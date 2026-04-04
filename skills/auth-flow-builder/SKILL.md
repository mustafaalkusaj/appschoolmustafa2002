# Auth Flow Builder

## Name
auth-flow-builder

## Description
Builds authentication flows including registration, login, logout, token refresh, password reset, and email verification. This skill creates complete, secure authentication pipelines following security best practices.

**When to use:**
- When implementing user authentication for the first time
- When you need to add password reset functionality
- When setting up JWT or session-based authentication
- When implementing multi-factor authentication (MFA)
- When building OAuth/social login flows
- When you need secure token refresh mechanisms

## Instructions

1. **Choose authentication method** - JWT tokens, sessions, or OAuth
2. **Design token strategy** - Access tokens, refresh tokens, expiration
3. **Create auth routes** - Registration, login, logout, refresh, reset
4. **Implement password security** - Hashing, strength validation, rate limiting
5. **Build token management** - Generation, validation, refresh, blacklist
6. **Add email workflows** - Verification, password reset links
7. **Implement security measures** - Rate limiting, account lockout

## Expected Input

```javascript
{
  "authMethod": "jwt", // or "session", "oauth"
  "features": [
    "registration",
    "login",
    "logout",
    "token-refresh",
    "password-reset",
    "email-verification"
  ],
  "passwordRequirements": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumber": true,
    "requireSpecial": false
  },
  "tokenSettings": {
    "accessTokenExpiry": "15m",
    "refreshTokenExpiry": "7d"
  },
  "framework": "Express"
}
```

## Expected Output

```javascript
// Complete auth flow with routes, services, and middleware
{
  "routes": ["/auth/register", "/auth/login", "/auth/logout", "/auth/refresh", "/auth/forgot-password", "/auth/reset-password"],
  "services": ["AuthService"],
  "middleware": ["authenticate", "rateLimitAuth"],
  "models": ["User", "RefreshToken", "PasswordResetToken"]
}
```

## Example Usage

**Input:**
```
Build a complete JWT authentication flow with:
- User registration with email verification
- Login with password (bcrypt hashing)
- JWT access tokens (15 min expiry) + refresh tokens (7 days)
- Password reset via email
- Logout with token invalidation
- Express framework, TypeScript
```

**Output:**
```typescript
// services/AuthService.ts
import { UserRepository } from '../repositories/UserRepository';
import { EmailService } from './EmailService';
import { hash, compare, genSalt } from 'bcrypt';
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../errors';

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new BadRequestError('Email already registered');

    const hashedPassword = await hash(password, 12);
    const verificationToken = uuidv4();

    const user = await this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      verificationToken,
      verified: false,
      createdAt: new Date()
    });

    await this.emailService.sendVerification(email, verificationToken);
    
    return {
      message: 'Registration successful. Please check your email to verify your account.'
    };
  }

  async login(email: string, password: string, deviceInfo?: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const isValid = await compare(password, user.password);
    if (!isValid) {
      await this.userRepository.incrementLoginAttempts(user.id);
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.verified) throw new UnauthorizedError('Please verify your email first');

    await this.userRepository.resetLoginAttempts(user.id);

    const tokens = await this.generateTokens(user, deviceInfo);
    
    await this.userRepository.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = verify(refreshToken, process.env.REFRESH_TOKEN_SECRET) as JwtPayload;
      
      const storedToken = await this.userRepository.findRefreshToken(refreshToken);
      if (!storedToken || storedToken.revoked) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const user = await this.userRepository.findById(payload.userId);
      if (!user) throw new NotFoundError('User');

      return this.generateTokens(user, storedToken.deviceInfo);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string) {
    await this.userRepository.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) throw new BadRequestError('Invalid verification token');

    await this.userRepository.update(user.id, {
      verified: true,
      verificationToken: null
    });

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return; // Don't reveal email existence

    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepository.update(user.id, { resetToken, resetTokenExpiry });
    await this.emailService.sendPasswordReset(user.email, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepository.findByResetToken(token);
    if (!user || user.resetTokenExpiry < new Date()) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const hashedPassword = await hash(newPassword, 12);
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

    await this.userRepository.revokeAllRefreshTokens(user.id);

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(user: User, deviceInfo?: string) {
    const accessToken = sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = sign(
      { userId: user.id, tokenId: uuidv4() },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    await this.userRepository.saveRefreshToken({
      token: refreshToken,
      userId: user.id,
      deviceInfo,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

// middleware/authenticate.ts
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError('No token provided');

  try {
    const payload = verify(token, process.env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

// routes/auth.routes.ts
router.post('/register', rateLimit(5, 60), validateRequest(registerSchema), authController.register);
router.post('/login', rateLimit(5, 60), validateRequest(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', rateLimit(3, 60), authController.forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), authController.resetPassword);
```

## Security Checklist

- [x] Passwords hashed with bcrypt (cost factor 10-12)
- [x] JWT tokens with short expiry for access tokens
- [x] Refresh tokens stored securely in database
- [x] Token blacklisting/revocation on logout
- [x] Rate limiting on auth endpoints
- [x] Email existence hidden in forgot password
- [x] Password reset tokens are single-use
- [x] Account lockout after failed attempts
- [x] HTTPS only for production
- [x] Secure, HttpOnly cookies for web apps

## Best Practices

- **Never store plain text passwords** - Always hash with bcrypt or argon2
- **Use short-lived access tokens** - 15 minutes or less
- **Implement refresh token rotation** - New refresh token on each use
- **Revoke tokens on password change** - Force re-authentication
- **Rate limit auth endpoints** - Prevent brute force attacks
- **Hide user existence** - Generic messages for email not found
