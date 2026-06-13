# Release Note Writer

## Name
release-note-writer

## Description
Generates clear, user-focused release notes that communicate what changed and why, helping users understand the impact of updates.

## When to Use
- Before releasing a new version
- When updating CHANGELOG.md
- For GitHub Releases
- For internal release communications
- When preparing deployment announcements

## Instructions

### Release Note Structure

```markdown
# Version X.Y.Z (YYYY-MM-DD)

## Breaking Changes ⚠️
- Description of breaking changes and migration steps

## New Features ✨
- Feature 1 with brief description
- Feature 2 with brief description

## Improvements 🚀
- Performance improvements
- UX enhancements
- Documentation updates

## Bug Fixes 🐛
- Fixed issue where...
- Resolved crash when...

## Security 🔒
- Security improvements or patches

## Deprecations ⚠️
- Features being deprecated and alternatives

## Migration Guide
Step-by-step instructions for upgrading
```

### Best Practices

**Do:**
- Lead with user value, not implementation
- Use present tense ("Adds" not "Added")
- Be specific ("Supports OAuth2" not "Improved auth")
- Include version numbers for dependencies
- Mention migration steps for breaking changes

**Don't:**
- Use technical jargon without context
- List every commit (save for git log)
- Include internal refactoring unless user-facing
- Use vague descriptions ("miscellaneous fixes")

### Audience Levels
- **End users**: What can they do now?
- **Developers**: API changes, migration steps
- **Operations**: Configuration changes, deprecations

### Version Numbering (SemVer)
- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, backward compatible

## Expected Input
- Previous version number
- List of commits/changes since last release
- Categorized changes
- Breaking changes (if any)

## Expected Output
- Formatted release notes
- Categorized by change type
- User-focused descriptions
- Migration guide if needed

## Example Usage

**Input:**
```
Version: 2.5.0
Previous: 2.4.2
Commits:
- feat: add dark mode
- feat: support custom themes
- fix: login timeout issue
- fix: memory leak in dashboard
- perf: faster page load
- docs: update README
Breaking: API rate limit changed from 100 to 1000 req/hour
```

**Output:**
```
# Release Notes - Version 2.5.0

*Released: 2024-01-15*

## Breaking Changes ⚠️
- **API Rate Limit Updated**: The rate limit has changed from 100 to 1000
  requests per hour. If you were hitting the old limit, you may need to
  update your client configuration.
  See [Migration Guide](#migration-guide) below.

## New Features ✨
- **Dark Mode**: Toggle dark mode from settings. Your preference is saved
  automatically.
- **Custom Themes**: Create and apply custom color themes. Access via
  Settings → Appearance → Custom Theme.

## Improvements 🚀
- **Faster Page Loads**: Dashboard now loads 40% faster thanks to improved
  caching and lazy loading.
- **Documentation**: Updated README with new examples and troubleshooting guide.

## Bug Fixes 🐛
- Fixed login timeout issue that occurred after 30 minutes of inactivity
- Resolved memory leak in the dashboard component that caused slowdowns

## Migration Guide

### API Rate Limit
```javascript
// Old configuration (no longer valid)
const config = { rateLimit: 100 };

// New configuration
const config = { rateLimit: 1000 }; // or omit for default
```

The old configuration will work but use the new default.
```

---

**Input:**
```
Hotfix version: 2.4.3
Previous: 2.4.2
Critical fix for payment processing bug
```

**Output:**
```
# Release Notes - Version 2.4.3 (Hotfix)

*Released: 2024-01-10*

## Critical Bug Fix 🐛
- **Payment Processing**: Fixed an issue where payments could fail silently
  for amounts over $1,000. All affected transactions have been automatically
  reprocessed. If you experienced failed payments on January 8-9, please
  check your transaction history.

*This is a hotfix release. No other changes were made.*
```
