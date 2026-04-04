# architecture-summarizer

## Name

Architecture Summarizer

## Description

Provides a high-level overview of the application's architecture including layering, patterns, and design decisions. This skill synthesizes information from other skills to create a coherent architectural view.

**When to use:**
- When onboarding to a new project
- When making architectural decisions about new features
- When documenting the codebase
- When identifying architectural drift from intended design
- When planning large refactors

## Instructions

1. **Identify architectural patterns:**
   - Layered architecture (UI → Business Logic → Data)
   - MVC/MVVM patterns
   - Domain-driven design boundaries
   - Microservices vs monolith
   - Event-driven architecture
   - Clean architecture hexagon

2. **Map layers and responsibilities:**
   - Presentation layer (UI components, pages)
   - Application layer (use cases, services, handlers)
   - Domain layer (business logic, entities, rules)
   - Infrastructure layer (DB, external APIs, file system)

3. **Document key patterns:**
   - State management approach
   - Data fetching patterns
   - Error handling strategy
   - Authentication/authorization flow
   - Caching strategy
   - Logging/monitoring approach

4. **Identify boundaries:**
   - Module boundaries
   - Feature boundaries
   - Team boundaries (if applicable)
   - External service boundaries

5. **Summarize data flow:**
   - How a request flows through the system
   - How state changes propagate
   - How data is persisted and retrieved

## Expected Input

- Results from `repo-context`, `entrypoint-finder`, and `dependency-mapper` skills
- Specific area of focus (optional)

## Expected Output

```markdown
# Architecture Summary

## Pattern: Clean Architecture with Feature-Sliced Design

## Layers

### 1. Presentation Layer (`src/ui/`, `src/pages/`)
- React components
- Page layouts
- Handles user input only

### 2. Application Layer (`src/features/`, `src/services/`)
- Use cases and application services
- Orchestrates domain logic
- No framework-specific code

### 3. Domain Layer (`src/domain/`, `src/entities/`)
- Pure business logic
- Entities and value objects
- Domain rules and validations

### 4. Infrastructure Layer (`src/infrastructure/`, `src/lib/`)
- Database access (Prisma)
- HTTP clients
- File system operations
- Third-party integrations

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Feature-sliced modules | Team autonomy, code ownership |
| Repository pattern | Database abstraction |
| Dependency injection | Testability |
| Event sourcing for orders | Audit trail, replay capability |

## Data Flow Example (Create Order)
```
Page → useCreateOrder hook → CreateOrderUseCase → 
OrderRepository → PostgreSQL
```

## Key Boundaries
- **Auth boundary:** JWT validation middleware
- **API boundary:** OpenAPI schema with Zod validation
- **DB boundary:** Prisma ORM with migrations
```

## Example Usage

```
Load skill: architecture-summarizer
Focus: Authentication flow
Output: Detailed architecture view of auth system
```

**Best used after gathering context with other skills for a complete architectural understanding.**
