# CI/CD Integration Guide - Aico AI

Complete guide for integrating Aico AI into your CI/CD pipelines.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Command Reference](#command-reference)
4. [Output Formats](#output-formats)
5. [GitHub Actions Integration](#github-actions-integration)
6. [GitLab CI Integration](#gitlab-ci-integration)
7. [Other CI/CD Platforms](#other-cicd-platforms)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The `aico ci` command enables automated code quality checks in CI/CD pipelines with:

- **Multiple output formats** (JSON, XML, GitHub Actions, Text)
- **Configurable exit codes** (fail on errors, warnings, or specific severity)
- **File output support** (save reports for artifacts)
- **Severity filtering** (focus on specific issue types)
- **Team rules integration** (combines AI review + custom rules)

---

## Quick Start

### Basic Usage

```bash
# Run CI review with default text output
aico ci

# Run with JSON output
aico ci --format json

# Save report to file
aico ci --format json --output report.json

# Fail pipeline on errors
aico ci --fail-on-error

# Fail pipeline on warnings or errors
aico ci --fail-on-warn
```

### Installation in CI

```bash
# Install globally
npm install -g aico-ai

# Or use npx (no installation needed)
npx aico-ai ci --format json
```

---

## Command Reference

### Basic Command

```bash
aico ci [options]
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--format <type>` | Output format: `json`, `xml`, `github`, `text` | `--format json` |
| `--output <file>` | Save output to file | `--output report.json` |
| `--fail-on-error` | Exit with code 1 if errors found | `--fail-on-error` |
| `--fail-on-warn` | Exit with code 1 if warnings found | `--fail-on-warn` |
| `--severity <level>` | Filter by severity: `error`, `warn`, `info` | `--severity error` |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (no issues or issues below threshold) |
| `1` | Failure (issues found based on flags) |

---

## Output Formats

### 1. JSON Format

**Use case:** Machine-readable, perfect for parsing and custom integrations

```bash
aico ci --format json --output report.json
```

**Output structure:**

```json
{
  "summary": {
    "totalIssues": 5,
    "errors": 2,
    "warnings": 3,
    "info": 0
  },
  "issues": [
    {
      "file": "src/index.js",
      "line": 42,
      "column": null,
      "severity": "error",
      "message": "Potential SQL injection vulnerability",
      "suggestion": "Use parameterized queries",
      "rule": "security/sql-injection"
    }
  ],
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "duration": 12.5,
    "provider": "groq",
    "model": "llama-3.3-70b-versatile",
    "version": "1.0.16"
  }
}
```

### 2. XML Format (JUnit Compatible)

**Use case:** CI/CD platforms that support JUnit test reports

```bash
aico ci --format xml --output report.xml
```

**Output structure:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="aico-review" tests="5" failures="2" errors="0" skipped="3" time="12.5">
    <testcase name="src/index.js" classname="code-review">
      <failure message="Potential SQL injection vulnerability" type="security/sql-injection">
        File: src/index.js
        Line: 42
        Potential SQL injection vulnerability
        Suggestion: Use parameterized queries
      </failure>
    </testcase>
  </testsuite>
</testsuites>
```

### 3. GitHub Actions Format

**Use case:** GitHub Actions annotations (shows issues inline in PR)

```bash
aico ci --format github
```

**Output structure:**

```
::error file=src/index.js,line=42::Potential SQL injection vulnerability
::warning file=src/utils.js,line=15::console.log found
```

### 4. Text Format

**Use case:** Human-readable output for logs

```bash
aico ci --format text
```

**Output structure:**

```
=== Aico Code Review Summary ===

Total Issues: 5
  Errors: 2
  Warnings: 3
  Info: 0

=== Issues ===

src/index.js:
  [ERROR] Potential SQL injection vulnerability
    Suggestion: Use parameterized queries
  [WARN] console.log found
    Suggestion: Remove before committing

Duration: 12.50s
```

---

## GitHub Actions Integration

### Option 1: Using the Template (Recommended)

Copy `.github/workflows/aico-review.yml` to your repository:

```yaml
name: Aico Code Review

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  code-review:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Aico AI
        run: npm install -g aico-ai
      
      - name: Run Aico Review
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: |
          git add -A
          aico ci --format json --output aico-report.json --fail-on-error
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: aico-report
          path: aico-report.json
```

### Option 2: Minimal Setup

```yaml
name: Code Review

on: [push, pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g aico-ai
      - run: aico ci --format github --fail-on-error
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
```

### Setup Instructions

1. **Add API Key to Secrets:**
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `GROQ_API_KEY`
   - Value: Your Groq API key

2. **Commit the workflow file:**
   ```bash
   git add .github/workflows/aico-review.yml
   git commit -m "ci: add Aico code review"
   git push
   ```

3. **Verify:**
   - Go to Actions tab in your repository
   - You should see the workflow running

---

## GitLab CI Integration

### Using the Template

Copy `.gitlab-ci.yml` to your repository:

```yaml
stages:
  - code-quality

aico-review:
  stage: code-quality
  image: node:18
  
  before_script:
    - npm install -g aico-ai
  
  script:
    - git add -A
    - aico ci --format json --output aico-report.json --fail-on-error
  
  artifacts:
    when: always
    paths:
      - aico-report.json
    reports:
      junit: aico-report.xml
    expire_in: 30 days
  
  only:
    - merge_requests
    - main
    - develop
  
  variables:
    GROQ_API_KEY: $GROQ_API_KEY
```

### Setup Instructions

1. **Add API Key to CI/CD Variables:**
   - Go to Settings → CI/CD → Variables
   - Click "Add variable"
   - Key: `GROQ_API_KEY`
   - Value: Your Groq API key
   - Check "Mask variable"

2. **Commit the CI file:**
   ```bash
   git add .gitlab-ci.yml
   git commit -m "ci: add Aico code review"
   git push
   ```

---

## Other CI/CD Platforms

### Jenkins

```groovy
pipeline {
    agent any
    
    environment {
        GROQ_API_KEY = credentials('groq-api-key')
    }
    
    stages {
        stage('Code Review') {
            steps {
                sh 'npm install -g aico-ai'
                sh 'git add -A'
                sh 'aico ci --format xml --output report.xml --fail-on-error'
            }
        }
    }
    
    post {
        always {
            junit 'report.xml'
            archiveArtifacts artifacts: 'report.xml', allowEmptyArchive: true
        }
    }
}
```

### CircleCI

```yaml
version: 2.1

jobs:
  code-review:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - run:
          name: Install Aico
          command: npm install -g aico-ai
      - run:
          name: Run Review
          command: |
            git add -A
            aico ci --format json --output report.json --fail-on-error
      - store_artifacts:
          path: report.json

workflows:
  review:
    jobs:
      - code-review
```

### Bitbucket Pipelines

```yaml
pipelines:
  default:
    - step:
        name: Code Review
        image: node:18
        script:
          - npm install -g aico-ai
          - git add -A
          - aico ci --format json --output report.json --fail-on-error
        artifacts:
          - report.json
```

### Azure Pipelines

```yaml
trigger:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
  
  - script: npm install -g aico-ai
    displayName: 'Install Aico'
  
  - script: |
      git add -A
      aico ci --format json --output report.json --fail-on-error
    displayName: 'Run Code Review'
    env:
      GROQ_API_KEY: $(GROQ_API_KEY)
  
  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: 'report.json'
      artifactName: 'aico-report'
```

---

## Best Practices

### 1. Use Appropriate Failure Thresholds

```bash
# Strict: Fail on any error
aico ci --fail-on-error

# Moderate: Fail on errors and warnings
aico ci --fail-on-warn

# Lenient: Only report, don't fail
aico ci
```

### 2. Save Reports as Artifacts

Always save reports for later review:

```yaml
- name: Upload Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: aico-report
    path: aico-report.json
```

### 3. Run on Pull Requests

Focus on PR reviews to catch issues early:

```yaml
on:
  pull_request:
    branches: [ main, develop ]
```

### 4. Use Caching

Cache npm packages to speed up CI:

```yaml
- name: Cache npm
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 5. Combine with Team Rules

Ensure team rules are committed to the repository:

```bash
git add .aico/rules.json
git commit -m "chore: add team code quality rules"
```

### 6. Filter by Severity

Focus on critical issues in CI:

```bash
# Only check for errors
aico ci --severity error --fail-on-error

# Only check for warnings
aico ci --severity warn --fail-on-warn
```

### 7. Use Different Configs for Different Branches

```yaml
# Strict for main branch
- name: Review (Main)
  if: github.ref == 'refs/heads/main'
  run: aico ci --fail-on-warn

# Lenient for feature branches
- name: Review (Feature)
  if: github.ref != 'refs/heads/main'
  run: aico ci --fail-on-error
```

---

## Troubleshooting

### Issue: "No staged changes found"

**Solution:** Ensure files are staged before running:

```bash
git add -A
aico ci
```

### Issue: "Invalid API Key"

**Solution:** Check that your API key is correctly set:

```bash
# GitHub Actions
echo ${{ secrets.GROQ_API_KEY }}

# GitLab CI
echo $GROQ_API_KEY

# Local testing
echo $GROQ_API_KEY
```

### Issue: "Command not found: aico"

**Solution:** Ensure Aico is installed:

```bash
npm install -g aico-ai
# or
npx aico-ai ci
```

### Issue: Pipeline fails but no issues shown

**Solution:** Check exit codes and use `--fail-on-error` explicitly:

```bash
aico ci --fail-on-error
echo "Exit code: $?"
```

### Issue: Large diffs timeout

**Solution:** The CI command automatically handles large diffs with parallel processing. If timeouts occur, consider:

```bash
# Review only specific severity
aico ci --severity error

# Or split into multiple jobs
```

### Issue: XML report not recognized

**Solution:** Ensure the XML format is used and path is correct:

```yaml
artifacts:
  reports:
    junit: aico-report.xml  # Must match output filename
```

---

## Advanced Usage

### Custom Reporting Script

```javascript
// parse-report.js
import fs from 'fs';

const report = JSON.parse(fs.readFileSync('aico-report.json', 'utf8'));

console.log(`Total Issues: ${report.summary.totalIssues}`);
console.log(`Errors: ${report.summary.errors}`);
console.log(`Warnings: ${report.summary.warnings}`);

// Custom logic
if (report.summary.errors > 5) {
  console.error('Too many errors!');
  process.exit(1);
}
```

### Slack Notifications

```yaml
- name: Notify Slack
  if: failure()
  run: |
    curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Code review failed! Check the report."}' \
    ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Email Reports

```yaml
- name: Email Report
  if: always()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Aico Code Review Report
    body: file://aico-report.json
    to: team@example.com
    from: ci@example.com
    attachments: aico-report.json
```

---

## Examples

### Example 1: Strict CI for Production

```yaml
name: Production Review

on:
  push:
    branches: [ main ]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g aico-ai
      - run: |
          git add -A
          aico ci --format json --output report.json --fail-on-warn
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: production-review
          path: report.json
```

### Example 2: Lenient CI for Development

```yaml
name: Development Review

on:
  pull_request:
    branches: [ develop ]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g aico-ai
      - run: |
          git add -A
          aico ci --format github
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        continue-on-error: true
```

### Example 3: Multi-Format Reports

```yaml
- name: Generate Reports
  run: |
    git add -A
    aico ci --format json --output report.json
    aico ci --format xml --output report.xml
    aico ci --format text --output report.txt
  env:
    GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}

- name: Upload All Reports
  uses: actions/upload-artifact@v3
  with:
    name: all-reports
    path: |
      report.json
      report.xml
      report.txt
```

---

## Summary

The `aico ci` command provides flexible, powerful code quality checks for any CI/CD platform:

✅ **Multiple output formats** for different use cases
✅ **Configurable failure thresholds** for different environments
✅ **Team rules integration** for consistent standards
✅ **Easy setup** with provided templates
✅ **Platform agnostic** - works everywhere

For more information, see the [main README](./README.md) or run `aico help`.
