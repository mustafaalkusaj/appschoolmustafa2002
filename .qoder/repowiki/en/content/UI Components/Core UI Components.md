# Core UI Components

<cite>
**Referenced Files in This Document**
- [button.tsx](file://components/ui/button.tsx)
- [toast.tsx](file://components/toast.tsx)
- [skeleton.tsx](file://components/skeleton.tsx)
- [card.tsx](file://components/ui/card.tsx)
- [stats-card.tsx](file://components/ui/stats-card.tsx)
- [layout.tsx](file://app/layout.tsx)
- [providers.tsx](file://app/[locale]/providers.tsx)
- [fee-notifications/page.tsx](file://app/[locale]/fee-notifications/page.tsx)
- [monitoring/page.tsx](file://app/[locale]/monitoring/page.tsx)
- [super-admin/page.tsx](file://app/[locale]/super-admin/page.tsx)
- [StatisticsCards.tsx](file://app/[locale]/dashboard/_components/StatisticsCards.tsx)
- [FinancialAnalysisPanel.tsx](file://app/[locale]/dashboard/_components/FinancialAnalysisPanel.tsx)
- [types.ts](file://app/[locale]/dashboard/_components/types.ts)
</cite>

## Update Summary
**Changes Made**
- Added new Card system component with multiple sub-components
- Added new Stats Card component with variants, trends, and decorative elements
- Added KPIGrid utility for organizing StatsCards
- Updated component architecture to include standardized card-based UI patterns
- Enhanced dashboard and analytics components with new standardized components

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
This document describes the core UI primitive components used throughout the application: Button, Toast, Skeleton, Card system, and Stats Card components. It explains variants, sizes, states, styling options, accessibility, responsive behavior, animations, and composition patterns. It also provides usage examples with code snippet paths and guidance for integrating and extending these components.

**Updated** Added new standardized Card system and Stats Card components that replace custom-styled elements with reusable, accessible components.

## Project Structure
The core UI primitives live under the components directory and are wired into the Next.js app shell via providers and layout. The new Card system provides a foundation for building consistent, accessible card-based interfaces.

```mermaid
graph TB
A["app/layout.tsx<br/>Wraps app with Providers and ToastProvider"] --> B["app/[locale]/providers.tsx<br/>ThemeProvider, RoleProvider, BrandingProvider"]
A --> C["components/toast.tsx<br/>ToastProvider, useToast, ToastItem"]
D["components/ui/button.tsx<br/>Button component"] --> E["Usage sites<br/>(e.g., page files)"]
F["components/skeleton.tsx<br/>Skeleton primitives"] --> G["Usage sites<br/>(e.g., page files)"]
H["components/ui/card.tsx<br/>Card system (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)"] --> I["Usage sites<br/>(e.g., dashboard components)"]
J["components/ui/stats-card.tsx<br/>StatsCard with variants and trends"] --> K["Dashboard analytics<br/>(StatisticsCards, FinancialAnalysisPanel)"]
```

**Diagram sources**
- [layout.tsx:14-31](file://app/layout.tsx#L14-L31)
- [providers.tsx:7-22](file://app/[locale]/providers.tsx#L7-L22)
- [toast.tsx:214-276](file://components/toast.tsx#L214-L276)
- [button.tsx:15-35](file://components/ui/button.tsx#L15-L35)
- [skeleton.tsx:29-221](file://components/skeleton.tsx#L29-L221)
- [card.tsx:1-79](file://components/ui/card.tsx#L1-L79)
- [stats-card.tsx:1-96](file://components/ui/stats-card.tsx#L1-L96)

**Section sources**
- [layout.tsx:14-31](file://app/layout.tsx#L14-L31)
- [providers.tsx:7-22](file://app/[locale]/providers.tsx#L7-L22)

## Core Components
This section documents the five core UI primitives and how to use them effectively.

- Button
  - Variants: default, outline
  - Sizes: default, sm
  - States: focus-visible ring, disabled pointer-events and opacity
  - Styling: Tailwind-style classes composed via a helper; supports className override
  - Accessibility: Inherits native button semantics; focus-visible ring included
  - Composition: Accepts all native button props; integrates with form controls and links

- Toast
  - Types: success, error, warning, info
  - Positioning: Fixed top-start (RTL-aware)
  - Timing: Defaults to ~3.5 seconds; configurable per toast
  - Interaction: Click to dismiss; animated slide-in and fade-out; progress bar
  - Theming: Light/dark variants with theme-aware colors and backdrop blur
  - Composition: Provider exposes useToast hook; limited to 4 concurrent toasts

- Skeleton
  - Purpose: Loading states and progressive enhancement
  - Variants: StatCard, Table, Analysis, StudentCard, Dashboard, StudentsPage, PaymentsPage
  - Styling: Uses CSS variables for theme adaptation; RTL-friendly
  - Composition: Compose skeletons to match page layouts; wrap real content

- Card System
  - Foundation: Card component with accessible markup and theme-aware styling
  - Composition: CardHeader, CardTitle, CardDescription, CardContent, CardFooter sub-components
  - Variants: Default card styling with border, background, and shadow
  - Accessibility: Proper semantic structure with forwardRef support
  - Composition: Build complex card-based interfaces with consistent spacing and typography

- Stats Card
  - Purpose: Display key performance indicators with icons and trends
  - Variants: primary, info, success, warning, danger, neutral
  - Features: Label, value, icon, optional description and trend indicator
  - Styling: Rounded corners (32px), subtle shadows, hover effects, gradient accents
  - Animation: Smooth transitions, hover scaling, gradient opacity effects
  - Composition: Built on Card system with specialized styling and interactive elements

**Section sources**
- [button.tsx:3-9](file://components/ui/button.tsx#L3-L9)
- [button.tsx:15-35](file://components/ui/button.tsx#L15-L35)
- [toast.tsx:7-21](file://components/toast.tsx#L7-L21)
- [toast.tsx:214-276](file://components/toast.tsx#L214-L276)
- [skeleton.tsx:29-221](file://components/skeleton.tsx#L29-L221)
- [card.tsx:1-79](file://components/ui/card.tsx#L1-L79)
- [stats-card.tsx:1-96](file://components/ui/stats-card.tsx#L1-L96)

## Architecture Overview
The Button component is a presentational component with minimal logic. The Toast system is a provider pattern exposing a context hook for imperative notifications. Skeleton components are pure presentational utilities. The new Card system provides a foundation for building consistent, accessible card-based interfaces, while Stats Cards offer specialized components for displaying key metrics.

```mermaid
classDiagram
class Button {
+variant : "default" | "outline"
+size : "default" | "sm"
+className : string
+rest props
}
class ToastProvider {
+children : ReactNode
+contextValue : { success, error, warning, info }
}
class ToastItem {
+toast : Toast
+onRemove(id) : void
}
class Skeleton {
+StatCardSkeleton()
+TableSkeleton(rows, cols)
+AnalysisSkeleton()
+StudentCardSkeleton()
+DashboardSkeleton()
+StudentsPageSkeleton()
+PaymentsPageSkeleton()
}
class CardSystem {
+Card
+CardHeader
+CardTitle
+CardDescription
+CardContent
+CardFooter
}
class StatsCard {
+label : string
+value : string | number
+icon : LucideIcon
+variant : "primary" | "info" | "success" | "warning" | "danger" | "neutral"
+trend : {value, label, variant}
+description : string
}
CardSystem --> StatsCard : "foundation for"
```

**Diagram sources**
- [button.tsx:6-9](file://components/ui/button.tsx#L6-L9)
- [button.tsx:15-35](file://components/ui/button.tsx#L15-L35)
- [toast.tsx:16-21](file://components/toast.tsx#L16-L21)
- [toast.tsx:214-276](file://components/toast.tsx#L214-L276)
- [toast.tsx:99-211](file://components/toast.tsx#L99-L211)
- [skeleton.tsx:29-221](file://components/skeleton.tsx#L29-L221)
- [card.tsx:1-79](file://components/ui/card.tsx#L1-L79)
- [stats-card.tsx:1-96](file://components/ui/stats-card.tsx#L1-L96)

## Detailed Component Analysis

### Button Component
- Props and behavior
  - Variant and size control base styles and spacing
  - Focus-visible ring ensures keyboard accessibility
  - Disabled state prevents interaction and dims opacity
  - className composes additional styles safely
- Styling and customization
  - Uses a helper to filter falsy classes and join strings
  - Supports overriding base styles via className
- Accessibility
  - Inherits native button semantics; ensure labels for icons
  - Focus ring is visible for keyboard users
- Responsive behavior
  - Size classes adjust height and padding; suitable for small screens
- Usage examples
  - Integration: Import Button and render with props
  - Styling variations: Pass className to augment base styles
  - Composition: Combine with icons and form controls

```mermaid
flowchart TD
Start(["Render Button"]) --> CheckVariant{"Variant?"}
CheckVariant --> |default| ApplyDefault["Apply default background and text color"]
CheckVariant --> |outline| ApplyOutline["Apply border and transparent background"]
ApplyDefault --> CheckSize{"Size?"}
ApplyOutline --> CheckSize
CheckSize --> |default| ApplyDefaultSize["Apply default height and padding"]
CheckSize --> |sm| ApplySmSize["Apply small height and compact padding"]
ApplyDefaultSize --> FocusState["Focus-visible ring enabled"]
ApplySmSize --> FocusState
FocusState --> DisabledState{"Disabled?"}
DisabledState --> |Yes| DisableInteraction["Disable pointer events and reduce opacity"]
DisabledState --> |No| Render["Render button element with props"]
DisableInteraction --> Render
```

**Diagram sources**
- [button.tsx:15-35](file://components/ui/button.tsx#L15-L35)

**Section sources**
- [button.tsx:3-9](file://components/ui/button.tsx#L3-L9)
- [button.tsx:15-35](file://components/ui/button.tsx#L15-L35)

### Toast Component
- API surface
  - useToast returns imperative methods: success, error, warning, info
  - Each method accepts a message and optional duration
- Rendering and behavior
  - ToastProvider renders a fixed-position container
  - ToastItem animates in, shows progress, and fades out on close
  - Automatic dismissal via requestAnimationFrame loop
  - Duplicate suppression within a short interval
- Theming and appearance
  - Light/dark configs define colors, backgrounds, borders, and progress colors
  - Direction is RTL-aware
- Accessibility and UX
  - Click to dismiss; no auto-close on hover by default
  - Progress bar indicates remaining time
- Usage examples
  - Integration: Wrap app with ToastProvider in the app shell
  - Invocation: Call useToast().success(...) in response to actions
  - Duration: Pass a custom duration for persistent notifications

```mermaid
sequenceDiagram
participant U as "User Action"
participant P as "Page Component"
participant H as "useToast()"
participant TP as "ToastProvider"
participant TI as "ToastItem"
U->>P : Trigger action
P->>H : Call success(message, duration?)
H->>TP : Add toast to state
TP->>TI : Render toast item
TI->>TI : Animate slide-in
TI->>TI : Start progress countdown
TI->>TI : Auto-dismiss when progress completes
TI->>TP : Request removal
TP->>TI : Fade out and unmount
```

**Diagram sources**
- [toast.tsx:27-31](file://components/toast.tsx#L27-L31)
- [toast.tsx:214-276](file://components/toast.tsx#L214-L276)
- [toast.tsx:99-211](file://components/toast.tsx#L99-L211)

**Section sources**
- [toast.tsx:7-21](file://components/toast.tsx#L7-L21)
- [toast.tsx:27-31](file://components/toast.tsx#L27-L31)
- [toast.tsx:214-276](file://components/toast.tsx#L214-L276)
- [toast.tsx:99-211](file://components/toast.tsx#L99-L211)

### Skeleton Component
- Purpose
  - Provide lightweight loading placeholders while content loads
- Variants
  - StatCardSkeleton, TableSkeleton(rows, cols), AnalysisSkeleton, StudentCardSkeleton
  - DashboardSkeleton, StudentsPageSkeleton, PaymentsPageSkeleton
- Styling and responsiveness
  - Uses CSS variables for theme-aware surfaces and borders
  - Adapts to RTL layouts
- Composition
  - Build complex skeletons by composing smaller pieces
  - Replace actual content with skeletons during fetch lifecycle

```mermaid
flowchart TD
Start(["Show Loading State"]) --> ChooseVariant{"Select Skeleton Variant"}
ChooseVariant --> StatCard["StatCardSkeleton"]
ChooseVariant --> Table["TableSkeleton(rows, cols)"]
ChooseVariant --> Analysis["AnalysisSkeleton"]
ChooseVariant --> Student["StudentCardSkeleton"]
ChooseVariant --> Dashboard["DashboardSkeleton"]
ChooseVariant --> StudentsPage["StudentsPageSkeleton"]
ChooseVariant --> PaymentsPage["PaymentsPageSkeleton"]
StatCard --> Render["Render skeleton nodes"]
Table --> Render
Analysis --> Render
Student --> Render
Dashboard --> Render
StudentsPage --> Render
PaymentsPage --> Render
Render --> End(["Content Fetch Complete"])
```

**Diagram sources**
- [skeleton.tsx:29-221](file://components/skeleton.tsx#L29-L221)

**Section sources**
- [skeleton.tsx:29-221](file://components/skeleton.tsx#L29-L221)

### Card System Component
- Foundation and accessibility
  - Provides semantic HTML structure with forwardRef support
  - Accessible by default with proper role and focus handling
  - Theme-aware styling using CSS variables
- Composition pattern
  - CardHeader: Organizes header content with proper spacing
  - CardTitle: Semantic heading with consistent typography
  - CardDescription: Supporting text with muted styling
  - CardContent: Main content area with proper padding
  - CardFooter: Footer area with flex alignment
- Styling and customization
  - Rounded corners (12px), subtle borders, and soft shadows
  - Background adapts to theme context
  - All sub-components accept className overrides
- Usage patterns
  - Build complex card-based interfaces
  - Maintain consistent spacing and typography
  - Support both light and dark themes seamlessly

```mermaid
flowchart TD
Start(["Card System"]) --> Card["Card<br/>Main container"]
Card --> CardHeader["CardHeader<br/>Header area"]
CardHeader --> CardTitle["CardTitle<br/>Primary heading"]
CardHeader --> CardDescription["CardDescription<br/>Supporting text"]
Card --> CardContent["CardContent<br/>Main content"]
Card --> CardFooter["CardFooter<br/>Footer area"]
Card --> Styles["Theme-aware styling<br/>CSS variables"]
Card --> Accessibility["Accessible markup<br/>forwardRef support"]
```

**Diagram sources**
- [card.tsx:1-79](file://components/ui/card.tsx#L1-L79)

**Section sources**
- [card.tsx:1-79](file://components/ui/card.tsx#L1-L79)

### Stats Card Component
- Purpose and design philosophy
  - Specialized component for displaying key metrics and KPIs
  - Combines Card system foundation with specialized styling
  - Focus on visual hierarchy and data presentation
- Variants and theming
  - Six predefined variants: primary, info, success, warning, danger, neutral
  - Each variant uses consistent color schemes with alpha transparency
  - Hover effects with scaling and shadow enhancements
- Interactive features
  - Smooth transitions and hover animations
  - Icon scaling effect on hover
  - Subtle gradient background that appears on hover
- Data presentation
  - Clear label hierarchy with uppercase tracking
  - Large, readable values with bold typography
  - Optional trend indicators with directional context
  - Descriptive text for additional context
- Composition patterns
  - Built-in responsive grid layout via KPIGrid utility
  - Flexible sizing with span capabilities
  - Consistent spacing and alignment
- Usage examples
  - Dashboard analytics and reporting
  - Financial summaries and performance metrics
  - Business intelligence and monitoring panels

```mermaid
flowchart TD
Start(["StatsCard Component"]) --> Structure["Card Foundation<br/>Built on Card system"]
Structure --> Content["Content Area<br/>Label, Value, Description"]
Content --> Trend["Optional Trend Indicator<br/>Value + Label + Variant"]
Content --> Icon["Icon Area<br/>Rounded container with variant colors"]
Icon --> Animation["Hover Effects<br/>Scale, Shadow, Gradient"]
Animation --> Grid["KPIGrid Integration<br/>Responsive layout"]
```

**Diagram sources**
- [stats-card.tsx:1-96](file://components/ui/stats-card.tsx#L1-L96)

**Section sources**
- [stats-card.tsx:1-96](file://components/ui/stats-card.tsx#L1-L96)

## Dependency Analysis
- Button depends on React and receives native button attributes; no external runtime dependencies
- Toast depends on React context, next-themes for theme detection, and an icon component
- Skeleton is a pure presentational module with no external runtime dependencies
- Card system depends on React and Tailwind CSS utilities
- Stats card depends on Card system, Lucide icons, and brand utilities
- Layout and providers integrate ToastProvider into the app shell

```mermaid
graph LR
L["app/layout.tsx"] --> P["app/[locale]/providers.tsx"]
L --> TP["components/toast.tsx"]
TP --> TH["next-themes"]
TP --> AI["components/AppIcon"]
BTN["components/ui/button.tsx"] -.->|"used by"| Pages["Page components"]
SKEL["components/skeleton.tsx"] -.->|"used by"| Pages
CARD["components/ui/card.tsx"] --> STATSCARD["components/ui/stats-card.tsx"]
STATSCARD -.->|"used by"| Dashboard["Dashboard components"]
```

**Diagram sources**
- [layout.tsx:14-31](file://app/layout.tsx#L14-L31)
- [providers.tsx:7-22](file://app/[locale]/providers.tsx#L7-L22)
- [toast.tsx:214-276](file://components/toast.tsx#L214-L276)
- [button.tsx:15-35](file://components/ui/button.tsx#L15-L35)
- [skeleton.tsx:29-221](file://components/skeleton.tsx#L29-L221)
- [card.tsx:1-79](file://components/ui/card.tsx#L1-L79)
- [stats-card.tsx:1-96](file://components/ui/stats-card.tsx#L1-L96)

**Section sources**
- [layout.tsx:14-31](file://app/layout.tsx#L14-L31)
- [providers.tsx:7-22](file://app/[locale]/providers.tsx#L7-L22)
- [toast.tsx:214-276](file://components/toast.tsx#L214-L276)

## Performance Considerations
- Button
  - Stateless functional component; minimal re-render cost
  - Prefer className overrides for style changes to avoid prop churn
- Toast
  - requestAnimationFrame used for smooth progress animation
  - Limited to a small number of toasts to keep DOM light
  - Avoid frequent rapid toasts to prevent stacking
- Skeleton
  - Stateless placeholders; very low overhead
  - Use appropriate variants to minimize DOM nesting
- Card System
  - Lightweight wrapper components with minimal overhead
  - ForwardRef optimization for better performance
  - CSS variables for efficient theme switching
- Stats Card
  - Optimized with CSS transitions and transforms
  - Efficient hover effects using transform properties
  - Minimal JavaScript with extensive CSS-based animations

## Troubleshooting Guide
- Toast not appearing
  - Ensure ToastProvider wraps the app shell
  - Verify useToast is called within the provider context
- Toast duplicates
  - The system suppresses identical toasts within a short interval
  - Adjust message or type, or increase the interval between invocations
- Button focus ring missing
  - Ensure focus-visible styles are not overridden by global CSS
  - Confirm variant and size classes are applied
- Skeleton not adapting to theme
  - Ensure CSS variables for theme surfaces are defined
  - Verify RTL direction is set appropriately
- Card component not rendering
  - Ensure Card system is properly imported
  - Verify sub-components are used correctly (CardHeader, CardContent, etc.)
- Stats Card styling issues
  - Check variant names match available options
  - Verify Lucide icons are properly imported
  - Ensure brand utilities are configured correctly

**Section sources**
- [layout.tsx:20-28](file://app/layout.tsx#L20-L28)
- [toast.tsx:27-31](file://components/toast.tsx#L27-L31)
- [toast.tsx:227-237](file://components/toast.tsx#L227-L237)
- [button.tsx:22-24](file://components/ui/button.tsx#L22-L24)
- [skeleton.tsx:3-5](file://components/skeleton.tsx#L3-L5)
- [card.tsx:1-79](file://components/ui/card.tsx#L1-L79)
- [stats-card.tsx:1-96](file://components/ui/stats-card.tsx#L1-L96)

## Conclusion
The Button, Toast, Skeleton, Card system, and Stats Card components form the foundation of the UI toolkit. They emphasize simplicity, accessibility, and theme-awareness. The new Card system provides a robust foundation for building consistent, accessible card-based interfaces, while Stats Cards offer specialized components for displaying key metrics. Integrate them via the app shell, compose them thoughtfully for loading states and data presentation, and extend them through className overrides and custom variants as needed.

**Updated** Added new standardized Card system and Stats Card components that replace custom-styled elements with reusable, accessible components.

## Appendices

### Usage Examples (by snippet path)
- Button
  - Basic usage and variants/sizes: [button.tsx:15-35](file://components/ui/button.tsx#L15-L35)
  - Styling augmentation: [button.tsx:21-30](file://components/ui/button.tsx#L21-L30)
- Toast
  - Provider integration: [layout.tsx:20-28](file://app/layout.tsx#L20-L28)
  - Hook usage and invocation: [fee-notifications/page.tsx:176-180](file://app/[locale]/fee-notifications/page.tsx#L176-L180), [monitoring/page.tsx:302-306](file://app/[locale]/monitoring/page.tsx#L302-L306), [super-admin/page.tsx:494-498](file://app/[locale]/super-admin/page.tsx#L494-L498)
  - Custom duration: [toast.tsx:227-237](file://components/toast.tsx#L227-L237)
- Skeleton
  - Page-level skeletons: [skeleton.tsx:133-165](file://components/skeleton.tsx#L133-L165), [skeleton.tsx:168-197](file://components/skeleton.tsx#L168-L197), [skeleton.tsx:200-221](file://components/skeleton.tsx#L200-L221)
- Card System
  - Basic card usage: [FinancialAnalysisPanel.tsx:9](file://app/[locale]/dashboard/_components/FinancialAnalysisPanel.tsx#L9)
  - Card composition: [StatisticsCards.tsx:28](file://app/[locale]/dashboard/_components/StatisticsCards.tsx#L28)
- Stats Card
  - Dashboard integration: [StatisticsCards.tsx:32](file://app/[locale]/dashboard/_components/StatisticsCards.tsx#L32)
  - KPI grid usage: [StatisticsCards.tsx:31](file://app/[locale]/dashboard/_components/StatisticsCards.tsx#L31)
  - Variant customization: [StatisticsCards.tsx:36](file://app/[locale]/dashboard/_components/StatisticsCards.tsx#L36)

**Section sources**
- [button.tsx:15-35](file://components/ui/button.tsx#L15-L35)
- [layout.tsx:20-28](file://app/layout.tsx#L20-L28)
- [fee-notifications/page.tsx:176-180](file://app/[locale]/fee-notifications/page.tsx#L176-L180)
- [monitoring/page.tsx:302-306](file://app/[locale]/monitoring/page.tsx#L302-L306)
- [super-admin/page.tsx:494-498](file://app/[locale]/super-admin/page.tsx#L494-L498)
- [toast.tsx:227-237](file://components/toast.tsx#L227-L237)
- [skeleton.tsx:133-165](file://components/skeleton.tsx#L133-L165)
- [skeleton.tsx:168-197](file://components/skeleton.tsx#L168-L197)
- [skeleton.tsx:200-221](file://components/skeleton.tsx#L200-L221)
- [FinancialAnalysisPanel.tsx:9](file://app/[locale]/dashboard/_components/FinancialAnalysisPanel.tsx#L9)
- [StatisticsCards.tsx:28](file://app/[locale]/dashboard/_components/StatisticsCards.tsx#L28)
- [StatisticsCards.tsx:31](file://app/[locale]/dashboard/_components/StatisticsCards.tsx#L31)
- [StatisticsCards.tsx:32](file://app/[locale]/dashboard/_components/StatisticsCards.tsx#L32)
- [StatisticsCards.tsx:36](file://app/[locale]/dashboard/_components/StatisticsCards.tsx#L36)