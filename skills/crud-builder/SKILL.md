# CRUD Builder

## Description
Generates complete CRUD (Create, Read, Update, Delete) operations for entities including API calls, UI components, and state management.

## When to Use
- Need to manage a data entity
- Building admin panels or data management interfaces
- Adding new resource types to the application

## Instructions
1. Identify the entity and its properties
2. Define data types and interfaces
3. Generate API service layer for all operations
4. Create React hooks for data operations
5. Build UI components (list, form, modal)
6. Integrate with existing state management

## Expected Input
```
Entity: User
Properties:
- id: string
- name: string
- email: string
- role: 'admin' | 'user' | 'guest'
- createdAt: Date
Operations needed: list, create, update, delete, detail
```

## Expected Output
```
/api/users.api.ts      - API functions (getUsers, createUser, updateUser, deleteUser)
/hooks/useUsers.ts     - React hooks with loading/error states
/components/Users/     - UserList, UserForm, UserRow, UserModal
/types/user.types.ts   - User, CreateUserDTO, UpdateUserDTO
```

## Example Usage
```
User: Build CRUD for "Product" entity with image upload support
Assistant: [Generates complete CRUD with file upload handling, validation, and responsive table/modal UI]
```
