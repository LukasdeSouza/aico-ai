# Team Rules Guide

> Complete guide to using Aico's Team Rules feature for enforcing consistent code quality standards across your team.

---

## Overview

Team Rules allow you to define and enforce custom code quality standards that are specific to your team or project. Unlike generic linting tools, Aico's Team Rules integrate with AI-powered reviews to provide context-aware feedback that aligns with your team's conventions.

## Quick Start

### 1. Initialize Team Rules

```bash
aico rules init
```

This creates a `.aico/rules.json` file in your project with a default template.

### 2. Customize Your Rules

Edit `.aico/rules.json` to match your team's standards:

```json
{
  "version": "1.0",
  "rules": {
    "naming": {
      "functions": "camelCase",
      "classes": "PascalCase",
      "constants": "UPPER_SNAKE_CASE"
    },
    "complexity": {
      "maxFunctionLength": 50,
      "maxCyclomaticComplexity": 10
    },
    "forbidden": [
      {
        "pattern": "console\\.log",
        "severity": "warn",
        "message": "Remove console.log before committing"
      }
    ]
  }
}
```

### 3. Validate Your Code

```bash
# Validate staged changes
aico rules validate

# Or run during normal review (rules are automatically applied)
aico review
```

### 4. List Active Rules

```bash
aico rules list
```

---

## 📋 Configuration Reference

### Complete Configuration Structure

```json
{
  "version": "1.0",
  "description": "Team code quality standards",
  "rules": {
    "naming": { /* Naming conventions */ },
    "complexity": { /* Complexity limits */ },
    "forbidden": [ /* Forbidden patterns */ ],
    "required": [ /* Required patterns */ ],
    "security": { /* Security rules */ }
  },
  "ignore": [ /* Files to ignore */ ],
  "teamStandards": { /* Team-specific standards */ },
  "aiPromptEnhancement": { /* AI integration */ }
}
```

---

## Naming Conventions

Define naming conventions for different code elements:

```json
{
  "rules": {
    "naming": {
      "functions": "camelCase",      // myFunction
      "classes": "PascalCase",        // MyClass
      "constants": "UPPER_SNAKE_CASE", // MY_CONSTANT
      "variables": "camelCase"        // myVariable
    }
  }
}
```

**Supported Conventions:**
- `camelCase` - myVariableName
- `PascalCase` - MyClassName
- `snake_case` - my_variable_name
- `UPPER_SNAKE_CASE` - MY_CONSTANT
- `kebab-case` - my-file-name

---

## Complexity Limits

Set limits to keep code maintainable:

```json
{
  "rules": {
    "complexity": {
      "maxFunctionLength": 50,        // Max lines per function
      "maxCyclomaticComplexity": 10,  // Max complexity score
      "maxNestingDepth": 4,           // Max nesting levels
      "maxFileLength": 500            // Max lines per file
    }
  }
}
```

**What These Mean:**
- **maxFunctionLength**: Prevents overly long functions that are hard to understand
- **maxCyclomaticComplexity**: Limits the number of decision points (if/else, loops, etc.)
- **maxNestingDepth**: Prevents deeply nested code structures
- **maxFileLength**: Keeps files at a manageable size

---

## Forbidden Patterns

Block specific code patterns:

```json
{
  "rules": {
    "forbidden": [
      {
        "pattern": "console\\.log",
        "severity": "warn",
        "message": "Remove console.log before committing. Use a proper logging library.",
        "exclude": ["*.test.js", "*.spec.ts"]
      },
      {
        "pattern": "debugger",
        "severity": "error",
        "message": "Remove debugger statement"
      },
      {
        "pattern": "TODO:|FIXME:",
        "severity": "warn",
        "message": "Unresolved TODO/FIXME found. Create a ticket or resolve it."
      },
      {
        "pattern": "\\.only\\(",
        "severity": "error",
        "message": "Remove .only() from tests before committing"
      }
    ]
  }
}
```

**Pattern Syntax:**
- Use JavaScript regex patterns
- Escape special characters: `\\.` for `.`, `\\(` for `(`
- Use `|` for OR: `TODO:|FIXME:`

**Severity Levels:**
- `error` - Blocks the commit/push
- `warn` - Shows warning but allows proceeding
- `info` - Informational only

**Exclude Option:**
- Specify file patterns to exclude from this rule
- Supports glob patterns: `*.test.js`, `src/**/*.spec.ts`

---

## Required Patterns

Enforce that certain patterns must be present:

```json
{
  "rules": {
    "required": [
      {
        "pattern": "^/\\*\\*[\\s\\S]*?\\*/\\s*(export\\s+)?(async\\s+)?function",
        "severity": "warn",
        "message": "Public functions should have JSDoc comments",
        "filePattern": "*.js"
      },
      {
        "pattern": "^'use strict'",
        "severity": "error",
        "message": "Files must start with 'use strict'",
        "filePattern": "*.js"
      }
    ]
  }
}
```

**filePattern Option:**
- Apply rule only to specific file types
- Examples: `*.js`, `*.ts`, `src/**/*.tsx`

---

## 🛡️Security Rules

Enable built-in security checks:

```json
{
  "rules": {
    "security": {
      "noHardcodedSecrets": true,    // Detect API keys, passwords
      "noEval": true,                 // Block eval() usage
      "noInnerHTML": true,            // Warn about XSS risks
      "requireInputValidation": true  // Suggest input validation
    }
  }
}
```

**Security Checks:**
- **noHardcodedSecrets**: Detects patterns like `apiKey = "..."`, `password = "..."`
- **noEval**: Blocks dangerous `eval()` usage
- **noInnerHTML**: Warns about XSS vulnerabilities with `.innerHTML`
- **requireInputValidation**: Suggests validation for user inputs

---

## Ignore Patterns

Exclude files from rule checking:

```json
{
  "ignore": [
    "*.test.js",
    "*.spec.ts",
    "*.test.tsx",
    "*.spec.jsx",
    "dist/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "*.min.js",
    "*.bundle.js",
    "vendor/**",
    "third-party/**"
  ]
}
```

**Common Patterns:**
- Test files: `*.test.js`, `*.spec.ts`
- Build outputs: `dist/**`, `build/**`
- Dependencies: `node_modules/**`, `vendor/**`
- Minified files: `*.min.js`, `*.bundle.js`

---

## 👥 Team Standards

Define team-wide coding standards:

```json
{
  "teamStandards": {
    "requireErrorHandling": true,      // Require try-catch blocks
    "requireTypeAnnotations": false,   // Require TypeScript types
    "preferConst": true,               // Prefer const over let
    "noVarKeyword": true,              // Block var usage
    "requireStrictMode": false         // Require 'use strict'
  }
}
```

---

## AI Prompt Enhancement

Customize how AI reviews incorporate your rules:

```json
{
  "aiPromptEnhancement": {
    "enabled": true,
    "customInstructions": "Focus on code maintainability, security, and performance. Follow our team's naming conventions and complexity limits. Pay special attention to error handling and input validation."
  }
}
```

**How It Works:**
- When enabled, your team rules are automatically included in AI review prompts
- The AI will check for violations of your custom rules
- Custom instructions provide additional context to the AI

---

##  Usage Examples

### Example 1: React Project

```json
{
  "version": "1.0",
  "description": "React project standards",
  "rules": {
    "naming": {
      "functions": "camelCase",
      "classes": "PascalCase",
      "constants": "UPPER_SNAKE_CASE"
    },
    "complexity": {
      "maxFunctionLength": 100,
      "maxFileLength": 300
    },
    "forbidden": [
      {
        "pattern": "console\\.(log|error|warn)",
        "severity": "warn",
        "message": "Use proper logging library",
        "exclude": ["*.test.jsx"]
      },
      {
        "pattern": "dangerouslySetInnerHTML",
        "severity": "error",
        "message": "Avoid dangerouslySetInnerHTML - XSS risk"
      }
    ],
    "security": {
      "noHardcodedSecrets": true,
      "noInnerHTML": true
    }
  },
  "ignore": [
    "*.test.jsx",
    "*.stories.jsx",
    "build/**",
    "public/**"
  ],
  "teamStandards": {
    "requireErrorHandling": true,
    "preferConst": true,
    "noVarKeyword": true
  }
}
```

### Example 2: Node.js API

```json
{
  "version": "1.0",
  "description": "Node.js API standards",
  "rules": {
    "naming": {
      "functions": "camelCase",
      "classes": "PascalCase",
      "constants": "UPPER_SNAKE_CASE"
    },
    "complexity": {
      "maxFunctionLength": 50,
      "maxCyclomaticComplexity": 10
    },
    "forbidden": [
      {
        "pattern": "console\\.log",
        "severity": "error",
        "message": "Use logger.info() instead"
      },
      {
        "pattern": "process\\.exit",
        "severity": "warn",
        "message": "Avoid process.exit() in library code"
      }
    ],
    "required": [
      {
        "pattern": "try\\s*\\{[\\s\\S]*?\\}\\s*catch",
        "severity": "warn",
        "message": "API endpoints should have error handling"
      }
    ],
    "security": {
      "noHardcodedSecrets": true,
      "noEval": true,
      "requireInputValidation": true
    }
  },
  "teamStandards": {
    "requireErrorHandling": true,
    "preferConst": true,
    "noVarKeyword": true
  }
}
```

### Example 3: TypeScript Project

```json
{
  "version": "1.0",
  "description": "TypeScript project standards",
  "rules": {
    "naming": {
      "functions": "camelCase",
      "classes": "PascalCase",
      "constants": "UPPER_SNAKE_CASE",
      "variables": "camelCase"
    },
    "complexity": {
      "maxFunctionLength": 75,
      "maxCyclomaticComplexity": 15,
      "maxFileLength": 400
    },
    "forbidden": [
      {
        "pattern": "any\\s+\\w+",
        "severity": "warn",
        "message": "Avoid using 'any' type. Use specific types instead."
      },
      {
        "pattern": "@ts-ignore",
        "severity": "error",
        "message": "Do not use @ts-ignore. Fix the type error instead."
      }
    ],
    "security": {
      "noHardcodedSecrets": true,
      "noEval": true
    }
  },
  "ignore": [
    "*.test.ts",
    "*.spec.ts",
    "dist/**",
    "*.d.ts"
  ],
  "teamStandards": {
    "requireTypeAnnotations": true,
    "requireErrorHandling": true,
    "preferConst": true,
    "noVarKeyword": true
  }
}
```

---

## Workflow Integration

### Pre-commit Hook

Validate rules before committing:

```bash
# .husky/pre-commit
#!/bin/sh
aico rules validate
```

### Pre-push Hook

Run full review with rules:

```bash
# .husky/pre-push
#!/bin/sh
aico review
```

### CI/CD Pipeline

```yaml
# .github/workflows/code-quality.yml
name: Code Quality
on: [push, pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Aico
        run: npm install -g aico-ai
      - name: Validate Team Rules
        run: aico rules validate
```

---

## Best Practices

### 1. Start Simple
Begin with a few critical rules and expand gradually:
```json
{
  "rules": {
    "forbidden": [
      { "pattern": "console\\.log", "severity": "warn" },
      { "pattern": "debugger", "severity": "error" }
    ]
  }
}
```

### 2. Use Appropriate Severity Levels
- `error` for critical issues (security, breaking changes)
- `warn` for style and best practices
- `info` for suggestions

### 3. Document Your Rules
Add clear messages explaining why rules exist:
```json
{
  "pattern": "var\\s+",
  "severity": "error",
  "message": "Use 'const' or 'let' instead of 'var' to avoid hoisting issues and improve code clarity"
}
```

### 4. Exclude Test Files When Appropriate
Tests often need different standards:
```json
{
  "pattern": "console\\.log",
  "severity": "warn",
  "exclude": ["*.test.js", "*.spec.ts"]
}
```

### 5. Version Control Your Rules
Commit `.aico/rules.json` to your repository so the entire team uses the same standards.

### 6. Review and Update Regularly
Schedule quarterly reviews of your team rules to ensure they still serve your needs.

---

## Troubleshooting

### Rules Not Being Applied

**Problem:** Rules don't seem to affect reviews

**Solutions:**
1. Verify `.aico/rules.json` exists in project root
2. Check JSON syntax is valid: `cat .aico/rules.json | jq`
3. Ensure `aiPromptEnhancement.enabled` is `true`
4. Run `aico rules list` to verify rules are loaded

### Regex Patterns Not Matching

**Problem:** Forbidden patterns aren't being detected

**Solutions:**
1. Test your regex: Use an online regex tester
2. Remember to escape special characters: `\\.` for `.`
3. Use `\\s` for whitespace, `\\w` for word characters
4. Check file isn't in ignore list

### Too Many False Positives

**Problem:** Rules trigger on valid code

**Solutions:**
1. Add `exclude` patterns to specific rules
2. Adjust severity from `error` to `warn`
3. Refine regex patterns to be more specific
4. Add files to global `ignore` list

---

## Additional Resources

- [Main README](./README.md) - General Aico documentation
- [Product Roadmap](./PRODUCT_ROADMAP.md) - Upcoming features
- [GitHub Issues](https://github.com/LukasdeSouza/aico-ai/issues) - Report bugs or request features

---

## 🤝 Contributing

Have ideas for new rule types or improvements? We'd love to hear them!

1. Open an issue describing your idea
2. Submit a pull request with your changes
3. Share your team's rule configurations as examples

---

**Last Updated:** 2024-01-15
**Version:** 1.0
