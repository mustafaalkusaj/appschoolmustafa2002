# acceptance-criteria-writer

## name

Acceptance Criteria Writer

## description

Transforms requirements and user stories into clear, testable acceptance criteria. This skill ensures that everyone has the same understanding of when a task is "done done."

**When to use this skill:**
- After creating a user story or feature request
- Before starting implementation
- During sprint planning to clarify scope
- When writing pull request descriptions
- When handoff between team members occurs
- Any time "done" is ambiguous

## instructions

1. **Identify the User Story**
   - Who is the user?
   - What do they want to accomplish?
   - Why do they need it?
   - What's the expected outcome?

2. **Determine Acceptance Criteria Types**
   - **Functional**: What the system must do
   - **Non-functional**: Performance, security, accessibility
   - **Edge cases**: Error handling, boundary conditions
   - **Negative cases**: What should NOT happen

3. **Write SMART Criteria**
   - **Specific**: Clear, unambiguous
   - **Measurable**: Can be verified
   - **Achievable**: Technically feasible
   - **Relevant**: Aligns with user need
   - **Time-bound**: Includes relevant timing if applicable

4. **Use Given-When-Then Format** (for behavioral criteria)
   ```
   Given [context]
   When [action]
   Then [expected outcome]
   ```

5. **Include Both Happy Path and Edge Cases**
   - Primary success scenario
   - Error conditions
   - Loading states
   - Empty states

6. **Make Criteria Testable**
   - Can a QA engineer write a test from this?
   - Can you verify this with a simple check?
   - Is it falsifiable?

7. **Review and Refine**
   - Remove subjective language ("should", "probably")
   - Use active voice
   - Be concrete ("show error message" not "be user-friendly")

## expected input

- A feature description or user story
- Optional: technical constraints
- Optional: existing acceptance criteria (for review)
- Optional: testing requirements

## expected output

A structured acceptance criteria document containing:
- User story recap
- Functional acceptance criteria (numbered)
- Non-functional acceptance criteria
- Edge case criteria
- Negative test criteria
- Definition of done checklist

## example usage

```
User: As a student, I want to submit my homework assignment so that my teacher can grade it

[Using acceptance-criteria-writer]

Output:
# Acceptance Criteria: Submit Homework Assignment

## User Story
As a student, I want to submit my homework assignment so that my teacher can grade it.

## Functional Acceptance Criteria

### Core Submission
1. Given I am logged in as a student, When I navigate to the assignments page, Then I see a list of pending assignments with due dates.

2. Given I am on an assignment detail page, When I click "Submit Homework", Then a file picker dialog opens.

3. Given I have selected a file, When I confirm submission, Then the file uploads and I see a success confirmation with submission timestamp.

4. Given I have submitted a file, When the upload completes, Then my submission appears in "My Submissions" with status "Submitted".

### File Validation
5. Given I try to upload a file, When the file exceeds 50MB, Then I see an error message "File size exceeds 50MB limit".

6. Given I try to upload a file, When the file type is not .pdf, .doc, .docx, or .txt, Then I see an error message "File type not supported".

7. Given I try to upload, When no file is selected, Then the submit button remains disabled.

### Deadline Handling
8. Given an assignment is past due, When I attempt to submit, Then I see a warning "This assignment is past due. Late submissions may have penalty."

9. Given an assignment is 24 hours past due, When I attempt to submit, Then I see an error "Submission deadline has passed".

### Multiple Submissions
10. Given I have already submitted for an assignment, When I submit again, Then the new file replaces the previous submission.

11. Given I have submitted, When I view my submission, Then I can see the submission history with timestamps.

## Non-Functional Acceptance Criteria

### Performance
12. Given a file under 10MB, When I upload, Then the upload completes within 5 seconds on a stable connection.

13. Given the upload starts, When I lose connection briefly, Then the upload can resume from where it left off.

### Accessibility
14. Given I use a screen reader, When I submit homework, Then all elements are properly labeled and navigable.

### Security
15. Given I am submitting, When I upload, Then the file is scanned for malware before storage.

## Edge Cases

16. Given my upload is in progress, When I close the browser, Then I see a warning dialog "Upload in progress. Are you sure you want to leave?"

17. Given the server returns an error during upload, When I retry, Then I can resume from the beginning (no partial upload corruption).

18. Given multiple students submit simultaneously, When uploads process, Then no submissions are lost or corrupted.

## Definition of Done

- [ ] Code implemented per functional criteria
- [ ] Unit tests covering submission logic
- [ ] Integration tests for upload flow
- [ ] UI tested on Chrome, Firefox, Safari
- [ ] Mobile responsiveness verified
- [ ] Accessibility audit passed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Product owner sign-off
```
