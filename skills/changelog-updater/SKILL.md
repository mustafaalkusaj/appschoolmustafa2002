# Changelog Updater

## Name
changelog-updater

## Description
Maintains and updates the CHANGELOG.md file following standard formats, tracking all notable changes across versions.

## When to Use
- Before releasing a new version
- After significant changes are merged
- During release preparation
- For maintaining project documentation

## Instructions

### Changelog Format (Keep a Changelog)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Vulnerability fixes

## [X.Y.Z] - YYYY-MM-DD
### (Same categories as Unreleased)
```

### Update Process

**1. Track Changes**
As changes are made, note them with conventional commits:
```
feat: add dark mode
fix: resolve login timeout
```

**2. Before Release**
- Collect all changes since last version
- Categorize each change
- Draft new version section
- Insert above "Unreleased" or existing versions

**3. Preserve History**
- Never modify past versions
- Add to "Unreleased" for unreleased changes
- Keep reverse chronological order

### Automation Options
- `standard-version`: Automated versioning and CHANGELOG
- `release-please`: GitHub Action for automated updates
- `commitizen`: Conventional commit tool
- `git-cliff`: Generate changelogs from commits

### Best Practices
1. Update changelog with each meaningful change
2. Focus on user-facing changes
3. Be specific but concise
4. Use consistent tense and formatting
5. Link to issues/PRs when helpful

## Expected Input
- Existing CHANGELOG.md content
- New changes to add
- Version number
- Release date

## Expected Output
- Updated CHANGELOG.md with:
  - New version section
  - Properly categorized changes
  - Correct formatting

## Example Usage

**Input:**
```
Existing CHANGELOG:
...
## [2.4.0] - 2024-01-01
### Added
- User authentication

Current changes to add:
- feat: add dark mode (PR #45)
- feat: add custom themes (PR #47)
- fix: login timeout (PR #48)
- perf: faster loads (PR #50)
Version: 2.5.0
Date: 2024-02-15
```

**Output:**
```
## [2.5.0] - 2024-02-15

### Added
- Dark mode support (#45)
- Custom theme creation and application (#47)

### Fixed
- Login timeout issue after extended inactivity (#48)

### Changed
- Improved page load performance by 40% (#50)

## [2.4.0] - 2024-01-01

### Added
- User authentication
```

---

**Input:**
```
Add hotfix to existing changelog:
Version: 2.4.1
Date: 2024-01-20
Fix: Payment processing bug (PR #52)
```

**Output:**
```
## [2.4.1] - 2024-01-20

### Fixed
- Payment processing failure for amounts over $1,000 (#52)

## [2.4.0] - 2024-01-01
...
```

### Automation Example

**Using standard-version:**
```bash
# Install
npm install --save-dev standard-version

# Update version and changelog
npx standard-version --release-as 2.5.0

# Or auto-detect version bump
npx standard-version
```

**Using commitizen:**
```bash
# Make a commit
git cz
# Select type, fill in message
# Commit is formatted for changelog parsing
```

### Integration with CI/CD
```yaml
# .github/workflows/release.yml
- name: Update Changelog
  run: npx standard-version
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
