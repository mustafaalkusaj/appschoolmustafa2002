# UI Component Generator

## Name
ui-component-generator

## Description
Generates React/TypeScript UI components from natural language descriptions. Creates reusable, well-structured components following modern React patterns with proper typing, props interfaces, and state management.

### When to Use
- Need to quickly scaffold a new UI component
- Want a starting point for a complex component
- Need to create multiple related components for a feature
- Want to ensure consistent component structure across the codebase

## Instructions

### Step 1: Analyze the Request
1. Identify the component type (button, form, card, modal, etc.)
2. Determine required props and their types
3. Identify state requirements (useState, useReducer, etc.)
4. Note any interactivity requirements
5. Check existing codebase patterns for consistency

### Step 2: Generate Component Structure
1. Create functional component with TypeScript interface for props
2. Add necessary imports (React hooks, icons, utilities)
3. Implement component logic and state
4. Build JSX structure following atomic design principles
5. Add prop types and default values
6. Export as named and/or default export

### Step 3: Validation
1. Ensure all props are properly typed
2. Verify accessibility attributes (aria-*, keyboard support)
3. Check for missing edge cases (loading, error, empty states)
4. Confirm component follows project conventions

## Expected Input
```
Component description including:
- Component name/type
- Visual elements and layout
- Interactive behaviors
- Required props and optional props
- State management needs
- Any specific styling requirements
```

## Expected Output
```
A complete React/TypeScript component file containing:
- TypeScript interface for props
- Functional component with proper naming
- State management if needed
- Accessible markup with semantic HTML
- Styled elements (CSS modules, Tailwind, styled-components)
- Proper export statements
```

## Example Usage

**Input:**
```
Generate a user profile card component with avatar, name, role, and action buttons (edit, delete). Include hover effects and loading state.
```

**Output:**
```tsx
// UserProfileCard.tsx
import { useState } from 'react';
import './UserProfileCard.css';

interface UserProfileCardProps {
  name: string;
  role: string;
  avatarUrl?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export function UserProfileCard({
  name,
  role,
  avatarUrl,
  onEdit,
  onDelete,
  isLoading = false,
}: UserProfileCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (isLoading) {
    return <div className="profile-card skeleton" aria-busy="true" />;
  }

  return (
    <article
      className={`profile-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={avatarUrl || '/default-avatar.png'}
        alt={`${name}'s avatar`}
        className="profile-card__avatar"
      />
      <h3 className="profile-card__name">{name}</h3>
      <p className="profile-card__role">{role}</p>
      <div className="profile-card__actions">
        <button onClick={onEdit} aria-label="Edit profile">
          Edit
        </button>
        <button onClick={onDelete} aria-label="Delete profile">
          Delete
        </button>
      </div>
    </article>
  );
}
```
