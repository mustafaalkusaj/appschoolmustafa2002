# Secret Scanner

**Name:** Secret Scanner

**Description:** Scans the codebase to detect and identify exposed secrets, API keys, passwords, private keys, tokens, and other sensitive credentials that should never be committed to version control.

**When to Use:**
- Before committing code to version control
- As a pre-commit hook check
- During security audits
- After adding new API integrations or services
- When onboarding new developers
- After security incidents involving credential exposure

**Instructions:**
1. Scan all files for common secret patterns (API keys, tokens, passwords, keys)
2. Check environment configuration files (.env, config.yaml, etc.)
3. Verify .gitignore properly excludes sensitive files
4. Search for hardcoded credentials in source code
5. Check for secrets in comments or documentation
6. Verify secrets are stored in secure vaults or environment variables
7. Check for rotated/revoked secrets still present in codebase
8. Validate proper secret management practices

**Expected Input:**
- Target directory or file paths to scan
- Optional: custom regex patterns for organization-specific secrets
- Optional: list of known secret types to exclude (test credentials)

**Expected Output:**
- List of all detected secrets with locations (file, line number)
- Type of secret detected (API key, token, password, etc.)
- Severity level (Critical for real secrets, Low for test/example values)
- Recommendation to remove, rotate, or properly manage each secret
- Compliance implications (PCI-DSS, SOC2, etc.)

**Example Usage:**
```
/review-code secret-scanner
Scope: Scan entire codebase for API keys, tokens, and credentials
Exclude: Test/fixture files in tests/ directory
```
