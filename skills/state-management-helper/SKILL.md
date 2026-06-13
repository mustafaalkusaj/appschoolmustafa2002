# State Management Helper

## Description
Assists with implementing state management patterns using React Context, Redux, Zustand, or other state libraries.

## When to Use
- Sharing state across components
- Managing complex application state
- Setting up new state containers

## Instructions
1. Analyze state scope and requirements
2. Choose appropriate state management approach
3. Define state shape and actions
4. Create store/context with typed interface
5. Generate provider component
6. Create custom hooks for usage
7. Handle side effects if needed

## Expected Input
```
State: ShoppingCart
Scope: Global (across app)
Data:
- items: CartItem[]
- couponCode?: string
- shippingMethod: 'standard' | 'express'
Actions: addItem, removeItem, updateQuantity, applyCoupon, setShipping
Persistence: localStorage
```

## Expected Output
```
/store/
├── cartStore.ts          - State definition (Zustand/Redux)
├── cartProvider.tsx       - React provider component
├── useCart.ts            - Custom hook
├── cart.types.ts         - TypeScript interfaces
└── cart.selectors.ts    - Memoized selectors
```

## Example Usage
```
User: Create auth state with user data, tokens, and session management
Assistant: [Sets up auth context with login/logout actions, token refresh, and protected route logic]
```
