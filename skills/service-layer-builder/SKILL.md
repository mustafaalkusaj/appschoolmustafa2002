# Service Layer Builder

## Name
service-layer-builder

## Description
Builds a well-organized Service Layer for backend applications. The service layer acts as an intermediary between controllers/routes and data access layers, encapsulating business logic and promoting code reusability.

**When to use:**
- When you need to separate business logic from HTTP handling
- When multiple controllers or endpoints need to share the same business logic
- When you want to make your codebase more testable (mocking services vs mocking database)
- When building complex business workflows that involve multiple entities
- When following domain-driven design or layered architecture patterns

## Instructions

1. **Identify the domain/business logic** - Understand what operations need to be performed
2. **Define service responsibilities** - Determine what each service should do (single responsibility)
3. **Create service methods** - Implement methods for each business operation
4. **Handle dependencies** - Inject repositories, other services, or external clients
5. **Return structured responses** - Use consistent return types (DTOs, Result patterns, etc.)
6. **Add transaction management** - Handle database transactions where needed
7. **Include error handling** - Let services throw domain-specific exceptions

## Expected Input

```javascript
{
  "serviceName": "OrderService",
  "methods": [
    {
      "name": "createOrder",
      "parameters": ["userId", "items", "paymentInfo"],
      "description": "Creates a new order for a user"
    },
    {
      "name": "cancelOrder",
      "parameters": ["orderId", "reason"],
      "description": "Cancels an existing order"
    }
  ],
  "dependencies": ["OrderRepository", "PaymentService", "InventoryService"],
  "framework": "Node.js/Express" // or "Django", "Spring Boot", etc.
}
```

## Expected Output

```javascript
// services/OrderService.js
class OrderService {
  constructor(orderRepository, paymentService, inventoryService) {
    this.orderRepository = orderRepository;
    this.paymentService = paymentService;
    this.inventoryService = inventoryService;
  }

  async createOrder(userId, items, paymentInfo) {
    // Validate inventory
    // Process payment
    // Create order record
    // Update inventory
    // Send notification
    return { orderId, status: 'created' };
  }

  async cancelOrder(orderId, reason) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found');
    if (order.status === 'shipped') throw new BusinessError('Cannot cancel shipped orders');
    
    await this.orderRepository.update(orderId, { status: 'cancelled', cancellationReason: reason });
    await this.inventoryService.restore(order.items);
    return { success: true };
  }
}

module.exports = OrderService;
```

## Example Usage

**Input:**
```
Build a UserService with methods for registration, login, profile update, and password reset.
Dependencies: UserRepository, EmailService, CacheService.
Framework: Node.js/Express with TypeScript.
```

**Output:**
```typescript
// services/UserService.ts
import { UserRepository } from '../repositories/UserRepository';
import { EmailService } from './EmailService';
import { CacheService } from './CacheService';
import { hash, compare } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private cacheService: CacheService
  ) {}

  async register(email: string, password: string, name: string): Promise<User> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new ConflictError('Email already registered');

    const hashedPassword = await hash(password, 12);
    const verificationToken = uuidv4();

    const user = await this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      verificationToken,
      verified: false
    });

    await this.emailService.sendVerificationEmail(email, verificationToken);
    return user;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !await compare(password, user.password)) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (!user.verified) throw new ForbiddenError('Please verify your email');

    const token = this.generateToken(user);
    await this.cacheService.set(`session:${user.id}`, token, 86400);
    return { user, token };
  }

  async updateProfile(userId: string, data: UpdateProfileDTO): Promise<User> {
    const updated = await this.userRepository.update(userId, data);
    await this.cacheService.invalidate(`user:${userId}`);
    return updated;
  }

  async resetPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return; // Don't reveal if email exists

    const resetToken = uuidv4();
    await this.userRepository.update(user.id, { resetToken, resetTokenExpiry: new Date(Date.now() + 3600000) });
    await this.emailService.sendPasswordResetEmail(email, resetToken);
  }

  private generateToken(user: User): string {
    // Token generation logic
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  }
}
```

## Best Practices

- **Single Responsibility**: Each service method should do one thing well
- **Dependency Injection**: Pass dependencies via constructor for testability
- **Transaction Boundaries**: Services should own transaction scopes
- **Error Propagation**: Let services throw domain exceptions, handle in controllers
- **Async/Await**: Use for all I/O operations
- **Logging**: Add structured logging for important operations
- **Validation**: Validate inputs at the service layer (defense in depth)
