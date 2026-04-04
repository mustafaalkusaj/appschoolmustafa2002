# repo-context

## Name

Repo Context Analyzer

## Description

Analyzes the overall context of a project by examining configuration files, project structure, and build setup. This skill provides a comprehensive understanding of how the project is organized and what technologies it uses.

**When to use:**
- When starting to work with an unfamiliar codebase
- Before implementing new features to understand the tech stack
- When debugging configuration-related issues
- When onboarding new team members
- When assessing project complexity and dependencies

## Instructions

1. **Read configuration files:**
   - `package.json` (npm/yarn projects) or `Cargo.toml`, `pom.xml`, `go.mod`, etc.
   - `tsconfig.json` or `jsconfig.json` (TypeScript/JavaScript projects)
   - Build configuration files (`vite.config.js`, `webpack.config.js`, `next.config.js`, etc.)
   - Linting configs (`.eslintrc`, `.prettierrc`)
   - Testing configs (`jest.config.js`, `vitest.config.ts`, `cypress.config.js`)

2. **Analyze project structure:**
   - List root directory contents
   - Identify standard directories (`src/`, `lib/`, `tests/`, `docs/`, etc.)
   - Note monorepo setup (packages/, apps/, services/)
   - Check for workspace configuration

3. **Extract key metadata:**
   - Node.js/rust/python version requirements
   - Package manager in use
   - Build toolchain
   - Type safety level (TypeScript vs JavaScript)
   - Testing framework
   - Code quality tools

4. **Document findings:**
   - Tech stack summary
   - Project conventions
   - Entry point locations
   - Special configurations

## Expected Input

- Project root directory path
- No additional parameters required

## Expected Output

```markdown
# Project Context Summary

## Tech Stack
- Runtime: [Node.js v18+, Python 3.11+, etc.]
- Language: [TypeScript 5.x, JavaScript ES2022, etc.]
- Framework: [Next.js 14, Express, FastAPI, etc.]
- Package Manager: [npm, yarn, pnpm]

## Project Structure
- Source: src/
- Tests: __tests__/
- Config: configs/
- Entry point: src/index.ts

## Build & Tooling
- Bundler: [Vite, Webpack, Turbopack]
- Type Checker: TypeScript
- Linter: ESLint + Prettier
- Test Runner: [Vitest, Jest, Playwright]

## Key Conventions
- File naming: [kebab-case, camelCase, PascalCase]
- Import patterns: [absolute vs relative paths]
- API style: [REST, GraphQL, gRPC]
```

## Example Usage

```
Load skill: repo-context
Output: Complete project context analysis including tech stack, structure, and conventions
```

**Best used as the first skill when entering a new codebase.**
