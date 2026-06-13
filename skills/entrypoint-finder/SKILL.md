# entrypoint-finder

## Name

Entrypoint Finder

## Description

Identifies all application entry points including main entry files, API routes, page components, and CLI commands. This skill maps out how the application starts and what triggers different parts of the system.

**When to use:**
- When understanding how to run/start the application
- When adding new routes, pages, or API endpoints
- When debugging startup issues
- When tracing request/operation flows
- When planning where to add new functionality

## Instructions

1. **Identify build/tool entry points:**
   - Check `package.json` scripts section (`main`, `start`, `dev`, `build`)
   - Look for `index.ts`, `index.js`, `main.ts`, `app.ts` in root or src
   - Examine `tsconfig.json` or build configs for entry file patterns

2. **Find framework-specific entry points:**
   - **Next.js:** `pages/` or `app/` directory, `next.config.js`
   - **Express/FastAPI:** `src/index.ts`, `server.ts`, route definitions
   - **React SPA:** `src/index.tsx`, `src/App.tsx`, `public/index.html`
   - **CLI tools:** `bin/` directory, `commander`/`yargs` config, package.json `bin` field
   - **Serverless:** `handler.ts`, `lambda.ts`, `functions/` directory
   - **Electron/Tauri:** `main.ts`, `background.ts`

3. **Map API/HTTP entry points:**
   - Route definitions in controllers or route files
   - Middleware chains
   - WebSocket handlers
   - GraphQL resolvers

4. **Document entry point relationships:**
   - Which entry points share code
   - Initialization order
   - Environment-specific entry points

## Expected Input

- Project context from `repo-context` skill (optional but recommended)
- Specific domain area to focus on (e.g., "API only", "frontend only")

## Expected Output

```markdown
# Application Entry Points

## Primary Entry
- **CLI/API:** `src/index.ts` - Main server bootstrap
- **Web App:** `src/renderer/index.tsx` - React mount point

## API Routes (Fastify)
| Route | Handler | Method |
|-------|---------|--------|
| /api/users | src/routes/users.ts | GET, POST |
| /api/auth | src/routes/auth.ts | POST |

## Pages (Next.js 14 App Router)
- `/` → `app/page.tsx`
- `/dashboard` → `app/dashboard/page.tsx`
- `/api/*` → `app/api/*/route.ts`

## CLI Commands
| Command | Entry | Description |
|---------|-------|-------------|
| npm run dev | src/dev.ts | Start development server |
| npm run build | src/build.ts | Production build |
```

## Example Usage

```
Load skill: entrypoint-finder
Focus: API endpoints only
Output: List of all API routes and their handlers
```

**Best used after `repo-context` to understand how the application starts and responds to requests.**
