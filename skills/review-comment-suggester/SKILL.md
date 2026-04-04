# Review Comment Suggester

## Name
review-comment-suggester

## Description
Generates constructive, specific code review comments with inline suggestions for improvements.

## When to Use
- During code review to draft feedback
- For automated PR reviews
- When preparing review summaries
- To ensure consistent, constructive feedback

## Instructions

### Comment Types

**1. Blocker (Must Fix)**
```
🚨 [BLOCKER] Line X: Description
Why: Explanation of the problem
Suggestion: How to fix it
```

**2. Issue (Should Fix)**
```
⚠️ [ISSUE] Line X: Description
Context: Why this matters
Suggestion: Alternative approach
```

**3. Nit (Optional)**
```
💡 [NIT] Line X: Minor suggestion
Just a preference, not blocking
```

**4. Question**
```
❓ Line X: Question
Trying to understand the logic here...
```

**5. Praise**
```
✅ Great approach here!
Nice handling of the edge case
```

### Best Practices
1. **Be specific**: Reference exact lines
2. **Explain why**: Not just what, but the reasoning
3. **Be constructive**: Offer solutions, not just criticism
4. **Distinguish severity**: Blockers vs nits
5. **Acknowledge good work**: Balance critique with praise
6. **Keep it actionable**: Comments should lead to action

### Tone Guidelines
- Use "we" not "you" ("we could" not "you should")
- Ask questions when unsure
- Explain technical reasoning
- Be kind and professional

## Expected Input
- Code diff or specific code segments
- Context about what the PR does
- Reviewer's assessment of quality

## Expected Output
- Structured comments with:
  - Line reference
  - Severity level
  - Explanation
  - Optional suggestion

## Example Usage

**Input:**
```javascript
// PR adds this function
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}
```

**Output:**
```
## Suggested Review Comments

---

❓ **Line 2: Why use `let` instead of `const`?**
Is `total` reassigned anywhere? If not, const would be safer.

---

💡 **[NIT] Line 3: Consider using reduce**
```javascript
const total = items.reduce((sum, item) => sum + item.price, 0);
```
This is more declarative, but the current version is fine.

---

✅ **Line 5: Good handling of numeric precision**
Unlike the previous implementation, this avoids floating point issues.
```

---

**Input:**
```python
# Security-sensitive code
password = request.POST['password']
query = f"SELECT * FROM users WHERE password='{password}'"
```

**Output:**
```
## Suggested Review Comments

---

🚨 **[BLOCKER] Line 2: SQL Injection Vulnerability**
User input is directly interpolated into SQL query. An attacker could
injection: password=' OR '1'='1

**Fix:**
```python
cursor.execute("SELECT * FROM users WHERE password=?", (password,))
```
Use parameterized queries for all user input.

---

🚨 **[BLOCKER] Line 1: Password Comparison Issue**
Never store or compare passwords directly. Use proper hashing.

**Fix:**
```python
from werkzeug.security import check_password_hash
user = User.query.filter_by(email=email).first()
if user and check_password_hash(user.password_hash, password):
    # login success
```
```
