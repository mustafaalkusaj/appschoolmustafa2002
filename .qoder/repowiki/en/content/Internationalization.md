# Internationalization

<cite>
**Referenced Files in This Document**
- [i18n.ts](file://i18n.ts)
- [next.config.ts](file://next.config.ts)
- [messages/en.json](file://messages/en.json)
- [messages/ar.json](file://messages/ar.json)
- [app/layout.tsx](file://app/layout.tsx)
- [app/[locale]/layout.tsx](file://app/[locale]/layout.tsx)
- [app/[locale]/error.tsx](file://app/[locale]/error.tsx)
- [components/LanguageToggle.tsx](file://components/LanguageToggle.tsx)
- [components/LocaleHtmlAttributes.tsx](file://components/LocaleHtmlAttributes.tsx)
- [lib/locale-routing.ts](file://lib/locale-routing.ts)
- [lib/legacy-locale.ts](file://lib/legacy-locale.ts)
- [lib/formatting.ts](file://lib/formatting.ts)
- [app/[locale]/providers.tsx](file://app/[locale]/providers.tsx)
</cite>

## Update Summary
**Changes Made**
- Replaced LegacyLocaleBridge component with new LocaleHtmlAttributes component
- Updated global layout files to properly handle Arabic language support with right-to-left text direction
- Enhanced locale-aware metadata handling through dynamic HTML attribute management
- Maintained backward compatibility while improving RTL/LTR directionality handling

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document explains the internationalization (i18n) system for multi-language support and localization in the application. It focuses on Arabic and English language support, right-to-left (RTL) layout handling, bidirectional text rendering, and cultural adaptation. It documents Next.js i18n configuration, locale routing, dynamic language switching, the message catalog system, locale-specific formatting, and the integration with UI components, form validation, and error message localization. It also covers locale bridging for legacy systems, testing strategies, and practical examples for extending the system.

## Project Structure
The i18n implementation spans server-side configuration, client-side providers, routing utilities, message catalogs, and UI components:
- Server request configuration loads locale-specific messages and enforces supported locales.
- Client-side providers and layouts integrate Next Intl and manage RTL/LTR directionality.
- Routing utilities normalize and manipulate locale prefixes in URLs.
- Message catalogs provide translations for navigation, common actions, authentication, access gates, and health checks.
- UI components implement language toggling and modern locale-aware HTML attribute management.

```mermaid
graph TB
subgraph "Server"
I18N["getRequestConfig<br/>i18n.ts"]
Cfg["next.config.ts"]
end
subgraph "Client"
Layout["app/[locale]/layout.tsx"]
RootLayout["app/layout.tsx"]
Intl["NextIntlClientProvider"]
Toggle["LanguageToggle.tsx"]
HtmlAttrs["LocaleHtmlAttributes.tsx"]
end
subgraph "Routing"
LR["lib/locale-routing.ts"]
end
subgraph "Messages"
EN["messages/en.json"]
AR["messages/ar.json"]
end
Cfg --> I18N
I18N --> EN
I18N --> AR
Layout --> Intl
Layout --> HtmlAttrs
RootLayout --> Layout
Toggle --> LR
```

**Diagram sources**
- [i18n.ts:1-18](file://i18n.ts#L1-L18)
- [next.config.ts:47-49](file://next.config.ts#L47-L49)
- [app/[locale]/layout.tsx:12-43](file://app/[locale]/layout.tsx#L12-L43)
- [app/layout.tsx:14-31](file://app/layout.tsx#L14-L31)
- [components/LanguageToggle.tsx:12-47](file://components/LanguageToggle.tsx#L12-L47)
- [components/LocaleHtmlAttributes.tsx:6-16](file://components/LocaleHtmlAttributes.tsx#L6-L16)
- [lib/locale-routing.ts:1-50](file://lib/locale-routing.ts#L1-L50)
- [messages/en.json:1-2](file://messages/en.json#L1-L2)
- [messages/ar.json:1-2](file://messages/ar.json#L1-L2)

**Section sources**
- [i18n.ts:1-18](file://i18n.ts#L1-L18)
- [next.config.ts:47-49](file://next.config.ts#L47-L49)
- [app/[locale]/layout.tsx:12-43](file://app/[locale]/layout.tsx#L12-L43)
- [app/layout.tsx:14-31](file://app/layout.tsx#L14-L31)
- [lib/locale-routing.ts:1-50](file://lib/locale-routing.ts#L1-L50)
- [messages/en.json:1-2](file://messages/en.json#L1-L2)
- [messages/ar.json:1-2](file://messages/ar.json#L1-L2)

## Core Components
- Request configuration: Loads locale-specific messages and rejects unsupported locales.
- Client provider and layout: Wrap pages with Next Intl and set HTML lang/dir.
- Locale routing utilities: Normalize, detect, strip, and prepend locale prefixes.
- Message catalogs: JSON files keyed by categories and keys for each locale.
- Language toggle: Switches between Arabic and English and preserves query/hash.
- Locale HTML attributes: Dynamically manages HTML lang and dir attributes based on current locale.

**Section sources**
- [i18n.ts:1-18](file://i18n.ts#L1-L18)
- [app/[locale]/layout.tsx:16-43](file://app/[locale]/layout.tsx#L16-L43)
- [lib/locale-routing.ts:1-50](file://lib/locale-routing.ts#L1-L50)
- [messages/en.json:1-2](file://messages/en.json#L1-L2)
- [messages/ar.json:1-2](file://messages/ar.json#L1-L2)
- [components/LanguageToggle.tsx:12-47](file://components/LanguageToggle.tsx#L12-L47)
- [components/LocaleHtmlAttributes.tsx:6-16](file://components/LocaleHtmlAttributes.tsx#L6-L16)

## Architecture Overview
The i18n pipeline integrates server and client layers:
- Server: Validates and resolves locale, imports messages, and forwards them to the client.
- Client: Initializes Next Intl with messages, applies HTML lang/dir, and renders localized content.
- Routing: Ensures URLs carry a locale prefix and supports switching without losing query/hash.
- HTML Attributes: Dynamically manages HTML lang and dir attributes for proper RTL/LTR handling.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant NextCfg as "next.config.ts"
participant Server as "getRequestConfig (i18n.ts)"
participant Messages as "messages/*.json"
participant ClientLayout as "app/[locale]/layout.tsx"
participant Intl as "NextIntlClientProvider"
participant HtmlAttrs as "LocaleHtmlAttributes.tsx"
Browser->>NextCfg : "Build-time plugin registration"
Browser->>Server : "HTTP request with Accept-Language"
Server->>Server : "Normalize locale"
Server->>Messages : "Import locale messages"
Messages-->>Server : "Translation dictionary"
Server-->>ClientLayout : "Locale + messages"
ClientLayout->>Intl : "Provide locale + messages"
ClientLayout->>HtmlAttrs : "Set HTML lang/dir"
HtmlAttrs-->>Browser : "Dynamic locale metadata"
Intl-->>Browser : "Localized UI rendered"
```

**Diagram sources**
- [next.config.ts:47-49](file://next.config.ts#L47-L49)
- [i18n.ts:6-17](file://i18n.ts#L6-L17)
- [messages/en.json:1-2](file://messages/en.json#L1-L2)
- [messages/ar.json:1-2](file://messages/ar.json#L1-L2)
- [app/[locale]/layout.tsx:24-43](file://app/[locale]/layout.tsx#L24-L43)
- [components/LocaleHtmlAttributes.tsx:10-13](file://components/LocaleHtmlAttributes.tsx#L10-L13)

## Detailed Component Analysis

### Next.js i18n Configuration and Request Handling
- Supported locales are enforced server-side; unknown locales trigger a 404.
- Messages are dynamically imported based on the resolved locale.
- The configuration is registered via the Next.js plugin in next.config.ts.

```mermaid
flowchart TD
Start(["Server request"]) --> Detect["Detect Accept-Language or route segment"]
Detect --> Normalize["Normalize to 'ar' or 'en'"]
Normalize --> Check{"Supported?"}
Check --> |No| NotFound["notFound()"]
Check --> |Yes| ImportMsg["Import messages/<locale>.json"]
ImportMsg --> ReturnCfg["Return { locale, messages }"]
NotFound --> End(["Exit"])
ReturnCfg --> End
```

**Diagram sources**
- [i18n.ts:6-17](file://i18n.ts#L6-L17)

**Section sources**
- [i18n.ts:1-18](file://i18n.ts#L1-L18)
- [next.config.ts:47-49](file://next.config.ts#L47-L49)

### Client Provider and Locale Routing
- The root app layout sets default HTML attributes for the application shell.
- The locale layout initializes Next Intl with messages and applies lang/dir per locale.
- Static generation emits locale-specific routes.

```mermaid
sequenceDiagram
participant Root as "app/layout.tsx"
participant Locale as "app/[locale]/layout.tsx"
participant Intl as "NextIntlClientProvider"
participant HtmlAttrs as "LocaleHtmlAttributes.tsx"
Root->>Locale : "Render with locale param"
Locale->>Locale : "normalizeLocale()"
Locale->>Locale : "load messages/<locale>.json"
Locale->>Intl : "Provide { locale, messages }"
Intl->>HtmlAttrs : "Set HTML lang/dir"
HtmlAttrs-->>Locale : "Dynamic attributes applied"
```

**Diagram sources**
- [app/layout.tsx:14-31](file://app/layout.tsx#L14-L31)
- [app/[locale]/layout.tsx:12-43](file://app/[locale]/layout.tsx#L12-L43)
- [components/LocaleHtmlAttributes.tsx:10-13](file://components/LocaleHtmlAttributes.tsx#L10-L13)

**Section sources**
- [app/layout.tsx:14-31](file://app/layout.tsx#L14-L31)
- [app/[locale]/layout.tsx:12-43](file://app/[locale]/layout.tsx#L12-L43)

### Locale HTML Attributes Component
- **Updated** The new LocaleHtmlAttributes component dynamically manages HTML lang and dir attributes.
- Extracts locale from Next.js route parameters.
- Uses useEffect to update document.documentElement attributes when locale changes.
- Provides clean separation between locale routing logic and HTML attribute management.

```mermaid
flowchart TD
Init["Mount LocaleHtmlAttributes"] --> GetParams["Get locale from useParams()"]
GetParams --> SetAttrs["Set document.documentElement.lang/dir"]
SetAttrs --> Effect["useEffect cleanup"]
Effect --> Update["Update on locale changes"]
```

**Diagram sources**
- [components/LocaleHtmlAttributes.tsx:6-16](file://components/LocaleHtmlAttributes.tsx#L6-L16)

**Section sources**
- [components/LocaleHtmlAttributes.tsx:6-16](file://components/LocaleHtmlAttributes.tsx#L6-L16)

### Locale Routing Utilities
- Normalize and detect locale from URL segments.
- Strip or prepend locale prefixes safely.
- Sanitize paths to prevent malformed redirects.

```mermaid
flowchart TD
A["Input pathname"] --> B{"Has locale prefix?"}
B --> |Yes| C["Strip prefix"]
B --> |No| D["Keep pathname"]
C --> E["Return localized path"]
D --> E
```

**Diagram sources**
- [lib/locale-routing.ts:18-43](file://lib/locale-routing.ts#L18-L43)

**Section sources**
- [lib/locale-routing.ts:1-50](file://lib/locale-routing.ts#L1-L50)

### Message Catalog System
- Two catalogs exist: English and Arabic.
- Keys are grouped by functional domains (navigation, common actions, auth, access gates, health checks).
- Client-side layouts import the appropriate catalog for the current locale.

```mermaid
graph LR
EN["messages/en.json"] --> Layout["app/[locale]/layout.tsx"]
AR["messages/ar.json"] --> Layout
Layout --> Intl["NextIntlClientProvider"]
```

**Diagram sources**
- [messages/en.json:1-2](file://messages/en.json#L1-L2)
- [messages/ar.json:1-2](file://messages/ar.json#L1-L2)
- [app/[locale]/layout.tsx:32-32](file://app/[locale]/layout.tsx#L32-L32)

**Section sources**
- [messages/en.json:1-2](file://messages/en.json#L1-L2)
- [messages/ar.json:1-2](file://messages/ar.json#L1-L2)
- [app/[locale]/layout.tsx:32-32](file://app/[locale]/layout.tsx#L32-L32)

### Language Toggle Component
- Determines the current locale from the URL and computes the next locale.
- Preserves query and hash when navigating.
- Uses client-side router replace to update the URL without triggering a full reload.

```mermaid
sequenceDiagram
participant User as "User"
participant Toggle as "LanguageToggle.tsx"
participant Router as "next/navigation"
participant LR as "lib/locale-routing.ts"
User->>Toggle : "Click switch"
Toggle->>LR : "getLocaleFromPath()"
Toggle->>LR : "stripLocaleFromPath()"
Toggle->>LR : "localizeAppPath()"
Toggle->>Router : "router.replace(targetHref)"
Router-->>User : "URL updated (same page)"
```

**Diagram sources**
- [components/LanguageToggle.tsx:12-47](file://components/LanguageToggle.tsx#L12-L47)
- [lib/locale-routing.ts:18-43](file://lib/locale-routing.ts#L18-L43)

**Section sources**
- [components/LanguageToggle.tsx:12-47](file://components/LanguageToggle.tsx#L12-L47)
- [lib/locale-routing.ts:18-43](file://lib/locale-routing.ts#L18-L43)

### Locale Detection and Fallback Mechanisms
- Server-side normalization defaults to Arabic if no locale is provided.
- Unsupported locales trigger a 404.
- Client-side routing utilities default to Arabic when unknown or missing.

```mermaid
flowchart TD
Start(["Locale input"]) --> Empty{"Empty?"}
Empty --> |Yes| Fallback["Default to 'ar'"]
Empty --> |No| Known{"Known locale?"}
Known --> |Yes| Keep["Keep input"]
Known --> |No| Fallback
Fallback --> End(["Normalized"])
Keep --> End
```

**Diagram sources**
- [i18n.ts:7-11](file://i18n.ts#L7-L11)
- [lib/locale-routing.ts:10-16](file://lib/locale-routing.ts#L10-L16)

**Section sources**
- [i18n.ts:7-11](file://i18n.ts#L7-L11)
- [lib/locale-routing.ts:10-16](file://lib/locale-routing.ts#L10-L16)

### RTL Layout Handling and Bidirectional Text Rendering
- The root layout sets default HTML attributes for the app shell.
- The locale layout applies lang/dir per locale.
- The new LocaleHtmlAttributes component provides dynamic HTML attribute management for proper RTL/LTR handling.

**Updated** Enhanced RTL handling through dedicated component that manages HTML lang and dir attributes dynamically based on current locale.

```mermaid
graph TB
Root["app/layout.tsx<br/>lang='ar', dir='rtl'"] --> Locale["app/[locale]/layout.tsx<br/>lang=locale, dir=locale==='ar'?'rtl':'ltr'"]
Locale --> HtmlAttrs["LocaleHtmlAttributes.tsx<br/>dynamic lang/dir"]
```

**Diagram sources**
- [app/layout.tsx:20-20](file://app/layout.tsx#L20-L20)
- [app/[locale]/layout.tsx:37-37](file://app/[locale]/layout.tsx#L37-L37)
- [components/LocaleHtmlAttributes.tsx:10-13](file://components/LocaleHtmlAttributes.tsx#L10-L13)

**Section sources**
- [app/layout.tsx:20-20](file://app/layout.tsx#L20-L20)
- [app/[locale]/layout.tsx:37-37](file://app/[locale]/layout.tsx#L37-L37)
- [components/LocaleHtmlAttributes.tsx:10-13](file://components/LocaleHtmlAttributes.tsx#L10-L13)

### Locale-Specific Formatting for Dates and Numbers
- Number formatting uses a fixed locale for consistency.
- Date formatting converts strings/dates to a specific locale.

```mermaid
flowchart TD
InNum["Number input"] --> NumFmt["formatNumber(n) -> toLocaleString('en-US')"]
InDate["Date input"] --> DateFmt["formatDate(d) -> toLocaleDateString('en-US')"]
```

**Diagram sources**
- [lib/formatting.ts:1-3](file://lib/formatting.ts#L1-L3)

**Section sources**
- [lib/formatting.ts:1-3](file://lib/formatting.ts#L1-L3)

### Integration with UI Components, Forms, and Error Localization
- UI components can consume translations from the Next Intl client provider.
- Error boundaries under locale routes render localized messages and preserve RTL directionality.
- The language toggle integrates with routing utilities to maintain query/hash during transitions.

**Section sources**
- [app/[locale]/layout.tsx:35-43](file://app/[locale]/layout.tsx#L35-L43)
- [app/[locale]/error.tsx:12-48](file://app/[locale]/error.tsx#L12-L48)
- [components/LanguageToggle.tsx:19-47](file://components/LanguageToggle.tsx#L19-L47)

## Dependency Analysis
The i18n system exhibits clear separation of concerns:
- Server configuration depends on message catalogs and enforces supported locales.
- Client layouts depend on routing utilities and Next Intl.
- UI components depend on routing utilities for navigation and on the provider for translations.
- **Updated** LocaleHtmlAttributes component depends on routing utilities and Next.js params for dynamic attribute management.

```mermaid
graph LR
I18N["i18n.ts"] --> EN["messages/en.json"]
I18N --> AR["messages/ar.json"]
Layout["app/[locale]/layout.tsx"] --> I18N
Layout --> LR["lib/locale-routing.ts"]
Layout --> HtmlAttrs["components/LocaleHtmlAttributes.tsx"]
Toggle["LanguageToggle.tsx"] --> LR
HtmlAttrs --> LR
```

**Diagram sources**
- [i18n.ts:6-17](file://i18n.ts#L6-L17)
- [messages/en.json:1-2](file://messages/en.json#L1-L2)
- [messages/ar.json:1-2](file://messages/ar.json#L1-L2)
- [app/[locale]/layout.tsx:35-43](file://app/[locale]/layout.tsx#L35-L43)
- [lib/locale-routing.ts:18-43](file://lib/locale-routing.ts#L18-L43)
- [components/LanguageToggle.tsx:19-26](file://components/LanguageToggle.tsx#L19-L26)
- [components/LocaleHtmlAttributes.tsx:7-8](file://components/LocaleHtmlAttributes.tsx#L7-L8)

**Section sources**
- [i18n.ts:6-17](file://i18n.ts#L6-L17)
- [app/[locale]/layout.tsx:35-43](file://app/[locale]/layout.tsx#L35-L43)
- [lib/locale-routing.ts:18-43](file://lib/locale-routing.ts#L18-L43)
- [components/LanguageToggle.tsx:19-26](file://components/LanguageToggle.tsx#L19-L26)
- [components/LocaleHtmlAttributes.tsx:7-8](file://components/LocaleHtmlAttributes.tsx#L7-L8)

## Performance Considerations
- Dynamic imports of message catalogs occur per request; caching and static generation reduce overhead.
- **Updated** LocaleHtmlAttributes component uses efficient useEffect cleanup and only updates when locale changes.
- Prefer predefining translation keys to minimize runtime lookups and improve cache hits.

## Troubleshooting Guide
- Unsupported locale: The server triggers a 404 for unknown locales; ensure the locale is one of the supported values.
- Incorrect directionality: Verify that HTML lang/dir are set correctly in both root and locale layouts.
- Missing translations: Confirm that the message catalog contains the required keys for the active locale.
- **Updated** HTML attributes not updating: Ensure LocaleHtmlAttributes component is properly mounted and receiving correct locale from route params.

**Section sources**
- [i18n.ts:9-11](file://i18n.ts#L9-L11)
- [app/layout.tsx:20-20](file://app/layout.tsx#L20-L20)
- [app/[locale]/layout.tsx:37-37](file://app/[locale]/layout.tsx#L37-L37)
- [components/LocaleHtmlAttributes.tsx:10-13](file://components/LocaleHtmlAttributes.tsx#L10-L13)

## Conclusion
The i18n system combines server-side locale enforcement, client-side Next Intl integration, robust routing utilities, and modern HTML attribute management to deliver a cohesive multilingual experience. Arabic and English are supported with proper RTL handling and cultural adaptation. The replacement of LegacyLocaleBridge with LocaleHtmlAttributes provides cleaner, more efficient locale-aware metadata handling while maintaining backward compatibility.

## Appendices

### Practical Examples

- Adding a new language
  - Create a new message catalog file under messages/<new_locale>.json with the same structure as existing catalogs.
  - Extend supported locales in the server configuration and routing utilities.
  - Update static generation parameters to include the new locale segment.

- Translating a component
  - Consume translations via the Next Intl client provider in the locale layout.
  - Reference translation keys from the appropriate domain (e.g., common, nav, auth).

- Handling locale-specific content
  - Use the locale routing utilities to construct localized paths.
  - Preserve query and hash when switching languages using the language toggle.

- Integrating with forms and validation
  - Localize placeholder, title, and aria-label attributes using the LocaleHtmlAttributes component for proper RTL/LTR handling.
  - Ensure validation messages are drawn from the message catalog and rendered conditionally based on the active locale.

- Testing strategies
  - Unit tests for locale routing utilities to verify normalization and prefix handling.
  - Snapshot tests for UI components under both Arabic and English locales.
  - End-to-end tests for language switching that assert URL updates and content localization.
  - Test HTML attribute updates in LocaleHtmlAttributes component for proper RTL/LTR behavior.

### Migration from LegacyLocaleBridge
**Updated** For projects migrating from LegacyLocaleBridge to LocaleHtmlAttributes:

1. Remove LegacyLocaleBridge component from layouts
2. Add LocaleHtmlAttributes component to app/[locale]/layout.tsx
3. Verify HTML lang/dir attributes are properly managed
4. Test RTL/LTR behavior across different locales
5. Ensure no conflicts with existing locale routing logic

**Section sources**
- [components/LocaleHtmlAttributes.tsx:6-16](file://components/LocaleHtmlAttributes.tsx#L6-L16)
- [app/[locale]/layout.tsx:36-36](file://app/[locale]/layout.tsx#L36-L36)