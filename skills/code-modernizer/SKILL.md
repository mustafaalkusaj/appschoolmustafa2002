# Code Modernizer

## Description
Updates legacy code to use modern JavaScript/TypeScript features, frameworks, and best practices.

## When to Use
- Migrating from class components to hooks
- Updating deprecated APIs
- Modernizing JavaScript to TypeScript
- Upgrading framework versions

## Instructions
1. Analyze codebase and identify outdated patterns
2. Create modernization roadmap
3. Prioritize changes by impact and risk
4. Apply modern patterns incrementally
5. Update dependencies if needed
6. Ensure backward compatibility where required
7. Update tests for new patterns

## Expected Input
```
Target: React components
Current: Class components with componentDidMount, this.setState
Modernize to: Functional components with hooks
Priority:
1. useState for state
2. useEffect for lifecycle
3. Custom hooks for reusable logic
```

## Expected Output
```
Before:
class UserProfile extends Component { ... }

After:
const UserProfile: FC<UserProfileProps> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { ... }, [userId]);
  ...
}
```

## Example Usage
```
User: Modernize the legacy jQuery-based UI to React with TypeScript
Assistant: [Converts jQuery DOM manipulation to React components, translates AJAX calls to fetch/React Query, adds proper TypeScript types]
```
