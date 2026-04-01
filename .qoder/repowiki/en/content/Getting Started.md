# Getting Started

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [next.config.ts](file://next.config.ts)
- [tsconfig.json](file://tsconfig.json)
- [lib/supabase.ts](file://lib/supabase.ts)
- [lib/supabase-server.ts](file://lib/supabase-server.ts)
- [migrations/README.md](file://migrations/README.md)
- [scripts/create-default-users.mjs](file://scripts/create-default-users.mjs)
- [i18n.ts](file://i18n.ts)
- [messages/en.json](file://messages/en.json)
- [types/roles.ts](file://types/roles.ts)
- [lib/auth.ts](file://lib/auth.ts)
- [components/LanguageToggle.tsx](file://components/LanguageToggle.tsx)
- [app/layout.tsx](file://app/layout.tsx)
- [app/api/rbac/session/route.ts](file://app/api/rbac/session/route.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Development Environment Setup](#development-environment-setup)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [Running the Development Server](#running-the-development-server)
7. [Accessing the Admin Interface](#accessing-the-admin-interface)
8. [Understanding the Application Structure](#understanding-the-application-structure)
9. [Multi-language Interface](#multi-language-interface)
10. [Initial User Account Creation](#initial-user-account-creation)
11. [Common Setup Issues and Solutions](#common-setup-issues-and-solutions)
12. [Deployment Preparation](#deployment-preparation)
13. [Troubleshooting Guide](#troubleshooting-guide)
14. [Conclusion](#conclusion)

## Introduction
This guide helps you set up and run the school management system locally, configure the database, and understand how to access the admin interface. It covers environment setup, Supabase configuration, database migrations, running the development server, navigating the admin panels, and preparing for deployment.

## Prerequisites
- Basic knowledge of Next.js and React
- Familiarity with TypeScript
- Understanding of relational databases and authentication concepts
- Node.js installed on your machine

## Development Environment Setup
Follow these steps to prepare your development environment:

- Install dependencies using npm:
  - Run: npm install
- Start the development server:
  - Run: npm run dev
- Build for production:
  - Run: npm run build

These commands are defined in the project scripts and are used to run the Next.js development server, build the application, and perform type checking and linting.

**Section sources**
- [README.md:32-44](file://README.md#L32-L44)
- [package.json:5-11](file://package.json#L5-L11)

## Database Setup
The system uses Supabase for authentication, database, and storage. The database schema, storage policies, and Row Level Security (RLS) rules are maintained via SQL migrations.

- Migration scope and purpose:
  - Migrations cover shared managed-user tables, teacher assignment and subject schema, storage buckets and policies, and RLS helper functions and access rules.
  - Some migration filenames include "mobile" but refer to shared managed-user schema and RLS, not mobile UI.

- Running migrations:
  - Apply migrations using the provided migration files located under the migrations directory.
  - The migrations directory also references related SQL files outside the folder for base schema bootstrap and super-admin infrastructure.

- Local development database initialization:
  - Initialize your local Supabase project and apply the migrations.
  - Ensure your local Supabase instance matches the schema and policies defined in the migrations.

- Supabase configuration:
  - Configure Supabase URLs and keys in environment variables as described in the Environment Variables section.

**Section sources**
- [migrations/README.md:1-31](file://migrations/README.md#L1-L31)

## Environment Variables
Configure the following environment variables in your environment (for example, in a .env.local file):

- NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Supabase anonymous/public key
- SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (required for seeding users)

These variables are required for Supabase client initialization in both browser and server contexts.

- Validation and error handling:
  - If any of the required environment variables are missing, the application throws errors indicating which variables are missing.

**Section sources**
- [lib/supabase.ts:3-19](file://lib/supabase.ts#L3-L19)
- [lib/supabase-server.ts:6-15](file://lib/supabase-server.ts#L6-L15)
- [lib/supabase-server.ts:40-45](file://lib/supabase-server.ts#L40-L45)

## Running the Development Server
- Start the Next.js development server:
  - Command: npm run dev
- Access the application:
  - Open http://localhost:3000 in your browser

The development server runs with webpack and supports hot reloading.

**Section sources**
- [README.md:34-38](file://README.md#L34-L38)
- [package.json:6](file://package.json#L6)

## Accessing the Admin Interface
- Login:
  - Navigate to the login page and sign in with the seeded user credentials created during initial setup.
- Default user accounts:
  - Super Admin, Admin, and Employee accounts are created automatically during seeding.

- Administrative panels:
  - Dashboard: General overview and insights
  - Students: Manage student records
  - Payments: Financial transactions and records
  - Expenses: Manage operational expenses
  - Salaries: Teacher salary management
  - Reports: Generate and view reports
  - Monitoring: Monitor teacher activity
  - Fee Notifications: Send fee-related notifications
  - Attendance: Track student attendance
  - Super Admin: Global administration features
  - Schools: Manage schools
  - Subscriptions: Manage subscription plans
  - Users: Manage users

- Access control:
  - Access to each panel depends on the user's role and permissions.
  - Role-based access control (RBAC) determines allowed paths and whether actions are read-only.

**Section sources**
- [scripts/create-default-users.mjs:44-66](file://scripts/create-default-users.mjs#L44-L66)
- [types/roles.ts:196-276](file://types/roles.ts#L196-L276)
- [lib/auth.ts:106-149](file://lib/auth.ts#L106-L149)

## Understanding the Application Structure
The application follows a modular structure with clear separation of concerns:

- Web admin UI:
  - Located under app/[locale], components, hooks, messages, and public.
- Shared backend/domain logic:
  - Located under app/api, lib, types, proxy.ts, and scripts.
- Database/migrations/storage:
  - Located under migrations, database_setup.sql, and admin_infrastructure.sql.

- Layout and providers:
  - The root layout sets the HTML language and direction, and wraps children with providers for theme, language, and toast notifications.

- Internationalization:
  - The application supports Arabic and English locales and loads messages accordingly.

**Section sources**
- [README.md:18-31](file://README.md#L18-L31)
- [app/layout.tsx:14-31](file://app/layout.tsx#L14-L31)
- [i18n.ts:4-17](file://i18n.ts#L4-L17)

## Multi-language Interface
- Supported locales:
  - Arabic (ar) and English (en)
- Switching languages:
  - Use the LanguageToggle component to switch between Arabic and English.
  - The toggle preserves the current path and query/hash segments while switching locales.

- Messages:
  - English messages are loaded from messages/en.json.

**Section sources**
- [i18n.ts:4-17](file://i18n.ts#L4-L17)
- [messages/en.json:1](file://messages/en.json#L1-L2)
- [components/LanguageToggle.tsx:8-47](file://components/LanguageToggle.tsx#L8-L47)

## Initial User Account Creation
- Seed default users:
  - Run the seed script to create default users and a default school with subscription.
  - The script creates Super Admin, Admin, and Employee accounts with predefined emails and passwords.
  - If SEED_* environment variables are not provided, default values are used.

- Seed script command:
  - Command: npm run seed:users

- Behavior:
  - Creates a default school and subscription if none exists.
  - Upserts user profiles and ensures authentication users exist with confirmed emails.

**Section sources**
- [scripts/create-default-users.mjs:191-223](file://scripts/create-default-users.mjs#L191-L223)
- [package.json:13](file://package.json#L13)

## Common Setup Issues and Solutions
- Missing Supabase environment variables:
  - Symptom: Application throws an error indicating missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
  - Solution: Add the required environment variables to your environment configuration and restart the development server.

- Missing Supabase service role key:
  - Symptom: Error indicates missing SUPABASE_SERVICE_ROLE_KEY when running the seed script.
  - Solution: Provide the service role key in environment variables and rerun the seed script.

- Supabase configuration errors:
  - Symptom: Errors related to Supabase settings being invalid.
  - Solution: Verify Supabase URL and keys are correct and match your local or remote Supabase project.

- RBAC session initialization failures:
  - Symptom: Errors when initializing RBAC session cookies.
  - Solution: Ensure the RBAC secret is configured on the server and that the user profile is accessible.

**Section sources**
- [lib/supabase.ts:8-18](file://lib/supabase.ts#L8-L18)
- [lib/supabase-server.ts:11-15](file://lib/supabase-server.ts#L11-L15)
- [lib/supabase-server.ts:43-45](file://lib/supabase-server.ts#L43-L45)
- [app/api/rbac/session/route.ts:14-20](file://app/api/rbac/session/route.ts#L14-L20)

## Deployment Preparation
- Build the application:
  - Command: npm run build
- Production server:
  - Command: npm run start
- Content Security Policy and headers:
  - The Next.js configuration sets CSP, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy, and HSTS in production.
- Internationalization plugin:
  - The Next.js configuration integrates next-intl with requestConfig pointing to i18n.ts.

- TypeScript configuration:
  - Strict type checks are enabled incrementally with strictNullChecks and strictFunctionTypes.

**Section sources**
- [package.json:7-8](file://package.json#L7-L8)
- [next.config.ts:50-94](file://next.config.ts#L50-L94)
- [tsconfig.json:11-16](file://tsconfig.json#L11-L16)

## Troubleshooting Guide
- Authentication and session issues:
  - If encountering "AuthSessionMissingError" or unauthorized responses, verify that the user is authenticated and that the session cookie is present.
  - Clear RBAC session cookies if needed and reinitialize the session.

- Access denied errors:
  - If access is denied, check the user's role and permissions against the route access rules.
  - Ensure the school is active and the subscription is valid if required by the route.

- Supabase connectivity:
  - Verify that NEXT_PUBLIC_SUPABASE_URL and the appropriate keys are set.
  - Ensure the Supabase project is reachable and the database migrations have been applied.

**Section sources**
- [lib/auth.ts:156-164](file://lib/auth.ts#L156-L164)
- [lib/auth.ts:106-149](file://lib/auth.ts#L106-L149)
- [lib/supabase.ts:3-19](file://lib/supabase.ts#L3-L19)

## Conclusion
You now have the essential steps to set up the school management system locally, configure Supabase, run migrations, seed initial users, and navigate the admin interface. Use the troubleshooting guide to resolve common issues and prepare for deployment with the provided build and start commands.