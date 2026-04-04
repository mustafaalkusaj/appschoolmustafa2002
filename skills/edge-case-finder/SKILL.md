# Edge Case Finder

## Name
edge-case-finder

## Description
Systematically identifies edge cases and boundary conditions that are often overlooked. Helps create comprehensive test coverage by finding scenarios at the limits of normal operation.

### When to Use
- Improving test coverage
- Reviewing test completeness
- Testing numeric/boundary logic
- Validating error handling
- Testing input validation

## Instructions

### 1. Analyze Input Space
- Identify all input parameters
- Map data types and ranges
- List allowed values
- Identify required vs optional
- Note format constraints

### 2. Apply Edge Case Techniques
- Boundary value analysis
- Equivalence partitioning
- Null/undefined handling
- Empty collections and strings
- Maximum/minimum values
- Special characters and encoding
- Type coercion scenarios

### 3. Identify Contextual Edges
- Concurrency edge cases
- Timing and race conditions
- Resource limits (memory, connections)
- State transition boundaries
- Lifecycle events
- Error recovery paths

### 4. Document Edge Cases
- List all identified edge cases
- Categorize by severity
- Prioritize for testing
- Design test for each case
- Implement and verify

## Expected Input
- Function/method signature
- Input validation rules
- Business logic specifications
- Error handling requirements
- Type definitions

## Expected Output
- Comprehensive edge case list
- Categorized by type (boundary, null, empty, etc.)
- Test case recommendations
- Priority assessment
- Implementation guidance

## Example Usage

```
User: Find edge cases for a function that validates age (integer, 0-150).

Assistant:
Edge Cases Identified:
1. Boundary: age = 0 (minimum valid)
2. Boundary: age = 150 (maximum valid)
3. Boundary: age = -1 (below minimum)
4. Boundary: age = 151 (above maximum)
5. Null/undefined: age = null
6. Type: age = "25" (string)
7. Type: age = 25.5 (float)
8. Type: age = NaN
9. Type: age = Infinity
10. Empty: age = "" (empty string)
11. Special: age = 0x19 (hex, equals 25)
12. Overflow: age = 1.8e308
```
