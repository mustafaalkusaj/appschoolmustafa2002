# Input Sanitizer

**Name:** Input Sanitizer

**Description:** Reviews and adds proper input sanitization and validation to protect against injection attacks, XSS, SQL injection, command injection, and other input-based vulnerabilities.

**When to Use:**
- When adding new user input handlers
- Before implementing API endpoints that accept user data
- After identifying untrusted input sources
- When integrating with external systems or APIs
- During security code review

**Instructions:**
1. Identify all user input entry points (forms, APIs, file uploads, headers)
2. Map data flow from input to storage/output
3. Review existing validation and sanitization logic
4. Add appropriate sanitization for each input type:
   - HTML/script content (XSS prevention)
   - Database queries (SQL injection prevention)
   - System commands (command injection prevention)
   - File paths (path traversal prevention)
   - Email/URLs (format validation)
5. Implement output encoding where applicable
6. Add whitelist validation where possible
7. Ensure proper error handling without information leakage
8. Document input validation rules

**Expected Input:**
- Target files or modules containing input handlers
- Input source types (user, API, file, environment)
- Context of data usage (HTML, SQL, shell, file system)

**Expected Output:**
- List of identified input points without proper sanitization
- Recommended sanitization functions/methods for each input type
- Code patches showing proper implementation
- Validation rule documentation
- List of sanitized input handlers

**Example Usage:**
```
/review-code input-sanitizer
Scope: Review all API endpoint input handlers
Add sanitization for: SQL queries, HTML output, file paths
Context: User-generated content in JSON APIs
```
