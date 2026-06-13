# Log Analyzer

## Name
log-analyzer

## Description
Parses, filters, and analyzes application logs to identify patterns, errors, and anomalies. Helps extract actionable insights from large log volumes.

**When to use:**
- Investigating production issues with log data
- Finding the root cause of a failure from log files
- Identifying recurring errors or patterns
- Correlating events across multiple log sources
- Extracting performance metrics from logs

## Instructions

1. **Parse log format**: Identify the log format (JSON, plain text, structured)
2. **Filter relevant entries**: Focus on timestamps around the incident
3. **Identify log levels**: Filter by ERROR, WARN, INFO, DEBUG as needed
4. **Search for patterns**: Look for recurring messages, stack traces
5. **Correlate events**: Match timestamps across different log sources
6. **Extract key insights**: Summarize findings with evidence

## Expected Input

- Log content (can be multiple files or streams)
- Time range of interest
- Keywords or patterns to search for
- Log source identifiers

## Expected Output

- Filtered log entries relevant to the investigation
- Timeline of events
- Identified error patterns with frequency counts
- Correlated events across log sources
- Key findings and recommendations

## Example Usage

```
User: Analyze these logs and find what caused the API timeout:
[paste log content]

Skill will:
1. Parse the log format
2. Filter for errors and warnings around the timeout
3. Identify the sequence of events leading to timeout
4. Extract the specific error that caused the issue
```

## Output Format

```markdown
## Log Analysis Report

### Log Summary
- Total entries analyzed: X
- Errors found: X
- Warnings found: X
- Time range: [start] to [end]

### Key Findings
1. [Finding with log evidence]
2. [Finding with log evidence]

### Error Timeline
| Time | Source | Message |
|------|--------|---------|
| ... | ... | ... |

### Recommendations
[actions to address findings]
```
