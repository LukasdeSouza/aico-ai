# Aico AI - Your Code Quality Gatekeeper 🛡️

**Aico** is an intelligent CLI tool that acts as a comprehensive gatekeeper for your code. It combines AI-powered reviews, team-defined rules, security scanning, and CI/CD integration to ensure high quality, security, and consistency across your projects.

## ✨ Features

###  AI-Powered Code Review
- **Semantic Analysis**: Deep understanding of your code changes
- **Multi-Provider Support**: Groq, OpenAI, DeepSeek, Gemini, or local Ollama
- **Auto-Fix Suggestions**: Apply AI-recommended fixes with one click
- **Parallel Processing**: Fast reviews even for large diffs

###  Team Rules Engine
- **Custom Standards**: Define your team's code quality rules
- **Naming Conventions**: Enforce camelCase, PascalCase, UPPER_SNAKE_CASE
- **Complexity Limits**: Max function length, cyclomatic complexity, nesting depth
- **Forbidden Patterns**: Block console.log, debugger, TODO comments, etc.
- **Security Checks**: Detect hardcoded secrets, eval() usage, and more

### 🛡️ Security Vulnerability Scanning
- **Dependency Scanning**: Integrates with npm/yarn/pnpm audit
- **Code Vulnerability Detection**: 10+ security pattern categories
  - Hardcoded secrets (API keys, passwords, tokens)
  - SQL injection vulnerabilities
  - XSS vulnerabilities
  - Command injection risks
  - Path traversal issues
  - Insecure cryptography
  - And more...
- **CWE Mapping**: Each vulnerability mapped to CWE codes
- **Severity Scoring**: Critical, High, Moderate, Low classifications

###  CI/CD Integration
- **Multiple Output Formats**: JSON, XML (JUnit), GitHub Actions, Text
- **Exit Codes**: Configurable failure thresholds
- **File Output**: Save reports as artifacts
- **GitHub Actions**: Ready-to-use workflow templates
- **GitLab CI**: Pre-configured pipeline examples

###  AI Commit Messages
- **Conventional Commits**: Automatic generation following standards
- **Context-Aware**: Based on your actual code changes
- **Interactive**: Edit, regenerate, or accept suggestions

###  Additional Features
- **Git Hook Integration**: Seamless Husky integration for pre-push/pre-commit
- **Silent Mode**: Non-blocking reviews for flexible workflows
- **Global Config**: Configure once, use everywhere
- **Local-First Option**: Complete privacy with Ollama

---

## 📦 Installation

Aico AI is available on both **npm** and **GitHub Packages**. Choose the option that works best for you:

### Option 1: Install from npm (Recommended)

**Global Installation:**
```bash
npm install -g aico-ai
```

**Project-Specific Installation:**
```bash
npm install --save-dev aico-ai
```

### Option 2: Install from GitHub Packages

**Prerequisites:** You need a GitHub Personal Access Token with `read:packages` scope.

1. **Configure npm to use GitHub Packages:**
   ```bash
   # Create .npmrc in your project or home directory
   echo "@lukasddesouza:registry=https://npm.pkg.github.com" >> .npmrc
   echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> .npmrc
   ```

2. **Install the package:**
   ```bash
   # Global installation
   npm install -g @lukasddesouza/aico-ai
   
   # Project installation
   npm install --save-dev @lukasddesouza/aico-ai
   ```

📖 **For detailed GitHub Packages setup instructions, see [GITHUB_PACKAGES.md](./GITHUB_PACKAGES.md)**

### Verify Installation
```bash
aico --version
```

[![npm version](https://badge.fury.io/js/aico-ai.svg)](https://www.npmjs.com/package/aico-ai)
[![GitHub Package](https://img.shields.io/badge/GitHub%20Packages-%40lukasddesouza%2Faico--ai-blue)](https://github.com/LukasdeSouza/aico-ai/packages)

---

##  Quick Start

### 1. Initialize Aico

Run the interactive setup wizard:

```bash
aico init
```

This will guide you through:
- ✅ Selecting your AI provider (Groq, OpenAI, DeepSeek, Ollama, Gemini)
- ✅ Configuring your API key (or Ollama URL)
- ✅ Choosing your preferred AI model
- ✅ Setting up Git hooks (optional)

**Example:**
```
? Which AI provider would you like to use?
  ❯ Groq (Fast & Free tier)
    OpenAI (GPT-4o, etc.)
    DeepSeek (Powerful & Cheap)
    Ollama (Local & Private)
    Google Gemini

? Enter your groq API Key: gsk_...
? Model name (default: llama-3.3-70b-versatile): [Enter]
? Would you like to setup Aico as a pre-push git hook? Yes

✓ Configuration saved globally in ~/.aicorc for groq!
✓ Husky pre-push hook configured!
```

### 2. Setup Team Rules (Recommended)

Initialize team-specific code quality standards:

```bash
aico rules init
```

This creates `.aico/rules.json` with sensible defaults. Customize it for your team:

```json
{
  "version": "1.0",
  "description": "Team code quality standards",
  "rules": {
    "forbidden": [
      {
        "pattern": "console\\.log",
        "severity": "warn",
        "message": "Remove console.log before committing"
      }
    ],
    "complexity": {
      "maxFunctionLength": 50,
      "maxCyclomaticComplexity": 10
    },
    "security": {
      "noHardcodedSecrets": true,
      "noEval": true
    }
  }
}
```

### 3. Start Using Aico

```bash
# Review your staged changes
git add .
aico review

# Generate AI commit message
aico commit

# Run security scan
aico security scan

# Validate against team rules
aico rules validate
```

---

## 📚 Complete Command Reference

### Core Commands

#### `aico init`
Interactive setup wizard for configuring Aico.

```bash
aico init
```

**What it does:**
- Prompts for AI provider selection
- Configures API keys or Ollama URL
- Sets up preferred AI model
- Optionally configures Git hooks

---

#### `aico review`
AI-powered code review of staged changes.

```bash
aico review [options]
```

**Options:**
- `--silent`, `-s`: Run without blocking (non-interactive)

**Example:**
```bash
git add .
aico review
```

**What it does:**
- Analyzes git diff of staged changes
- Identifies bugs, security issues, code smells
- Suggests improvements with fix options
- Applies team rules validation

---

#### `aico commit`
Generate AI-powered commit messages.

```bash
aico commit
```

**What it does:**
- Analyzes staged changes
- Generates Conventional Commit message
- Allows editing, regeneration, or acceptance
- Commits with the final message

**Example:**
```bash
git add .
aico commit

# Output:
# Suggested message: feat(auth): add JWT token validation
# 
# What would you like to do?
#   ❯ Accept and commit
#     Edit message
#     Regenerate
#     Abort
```

---

### Team Rules Commands

#### `aico rules init`
Initialize team rules configuration.

```bash
aico rules init
```

**What it does:**
- Creates `.aico/rules.json` with default template
- Includes examples for all rule types
- Ready to customize for your team

---

#### `aico rules list`
Display all active team rules.

```bash
aico rules list
```

**Output:**
```
📋 Team Rules Configuration

Version: 1.0
Total Rules: 15

Categories:
  • forbidden: 3 rule(s)
  • complexity: 4 rule(s)
  • security: 4 rule(s)

🚫 Forbidden Patterns:
  ⚠️ console\.log
     Remove console.log before committing
  ❌ debugger
     Remove debugger statement before committing
```

---

#### `aico rules validate`
Validate staged changes against team rules.

```bash
aico rules validate
```

**What it does:**
- Checks staged files against all team rules
- Reports violations with severity levels
- Exits with code 1 if errors found (CI-friendly)

**Example Output:**
```
⚠️  Found 3 rule violation(s):

src/index.js:
  ⚠️ [WARN] Remove console.log before committing
     Found 2 occurrence(s)
  ❌ [ERROR] Potential hardcoded secret detected
  ⚠️ [WARN] Function exceeds maximum length of 50 lines

Summary: 1 error(s), 2 warning(s)
```

---

### Security Commands

#### `aico security scan`
Full security scan (dependencies + code + configuration).

```bash
aico security scan [--output <file>]
```

**Options:**
- `--output <file>`: Save report to JSON file

**What it scans:**
- **Dependencies**: npm/yarn/pnpm audit integration
- **Code**: 10+ vulnerability patterns
- **Configuration**: .env exposure, debug mode

**Example:**
```bash
aico security scan

# Output:
# 🛡️  Security Scan Results
# 
# Dependencies:
#   ❌ lodash@4.17.15 - High Severity
#      CVE-2020-8203: Prototype Pollution
#      Fix: Update to lodash@4.17.21
# 
# Code Issues:
#   🔴 src/api.js:42
#      Potential SQL Injection
#      CWE-89
# 
# Summary: 3 vulnerabilities found (1 high, 2 moderate)
```

---

#### `aico security check`
Check specific security areas.

```bash
aico security check --dependencies  # Check dependencies only
aico security check --code          # Check code only
```

**Use cases:**
- Quick dependency checks in CI
- Code-only scans for pre-commit hooks
- Focused security audits

---

#### `aico security report`
Generate detailed security report.

```bash
aico security report
```

**What it does:**
- Performs full security scan
- Generates `security-report.json`
- Includes timestamp, summary, all vulnerabilities
- Provides recommendations

**Report Structure:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {
    "total": 5,
    "critical": 1,
    "high": 2,
    "moderate": 2,
    "low": 0
  },
  "dependencies": [...],
  "codeVulnerabilities": [...],
  "recommendations": [...]
}
```

---

### CI/CD Commands

#### `aico ci`
Run in CI/CD mode with machine-readable output.

```bash
aico ci [options]
```

**Options:**
- `--format <type>`: Output format (json, xml, github, text)
- `--output <file>`: Save to file
- `--fail-on-error`: Exit 1 if errors found
- `--fail-on-warn`: Exit 1 if warnings found
- `--severity <level>`: Filter by severity (error, warn, info)

**Examples:**
```bash
# JSON output for parsing
aico ci --format json --output report.json

# Fail pipeline on errors
aico ci --fail-on-error

# GitHub Actions annotations
aico ci --format github

# JUnit XML for CI tools
aico ci --format xml --output junit.xml
```

---

### Utility Commands

#### `aico help`
Display help information.

```bash
aico help
```

#### `aico --version`
Display version number.

```bash
aico --version
```

---

## 🔧 Configuration

### Global Configuration (~/.aicorc)

Aico stores global settings in `~/.aicorc`:

```json
{
  "provider": "groq",
  "providers": {
    "groq": {
      "apiKey": "gsk_...",
      "model": "llama-3.3-70b-versatile"
    },
    "openai": {
      "apiKey": "sk-...",
      "model": "gpt-4o-mini"
    },
    "ollama": {
      "baseUrl": "http://localhost:11434",
      "model": "llama3"
    }
  }
}
```

### Environment Variables

Override config with environment variables:

```bash
# AI Provider API Keys
export GROQ_API_KEY="gsk_..."
export OPENAI_API_KEY="sk-..."
export DEEPSEEK_API_KEY="sk-..."
export GEMINI_API_KEY="..."

# Provider Selection
export AICO_PROVIDER="groq"
```

### Team Rules (.aico/rules.json)

Project-specific code quality standards:

```json
{
  "version": "1.0",
  "description": "Team code quality standards",
  "rules": {
    "naming": {
      "functions": "camelCase",
      "classes": "PascalCase",
      "constants": "UPPER_SNAKE_CASE"
    },
    "complexity": {
      "maxFunctionLength": 50,
      "maxCyclomaticComplexity": 10,
      "maxNestingDepth": 4,
      "maxFileLength": 500
    },
    "forbidden": [
      {
        "pattern": "console\\.log",
        "severity": "warn",
        "message": "Remove console.log before committing"
      },
      {
        "pattern": "debugger",
        "severity": "error",
        "message": "Remove debugger statement"
      },
      {
        "pattern": "TODO:|FIXME:",
        "severity": "warn",
        "message": "Unresolved TODO/FIXME found"
      }
    ],
    "required": [
      {
        "pattern": "^/\\*\\*[\\s\\S]*?\\*/\\s*function",
        "severity": "warn",
        "message": "Functions should have JSDoc comments"
      }
    ],
    "security": {
      "noHardcodedSecrets": true,
      "noEval": true,
      "noInnerHTML": true,
      "requireInputValidation": true
    },
    "teamStandards": {
      "requireErrorHandling": true,
      "requireTypeAnnotations": false,
      "preferConst": true
    }
  },
  "ignore": [
    "*.test.js",
    "*.spec.ts",
    "dist/**",
    "build/**"
  ]
}
```

---

##  Use Cases & Examples

### Use Case 1: Pre-Push Code Review

**Setup:**
```bash
aico init
# Select "Yes" for Git hooks
```

**Usage:**
```bash
git add .
git push  # Aico automatically reviews before push
```

**What happens:**
1. Aico intercepts the push
2. Reviews all staged changes
3. Shows issues and suggestions
4. Allows you to fix or proceed

---

### Use Case 2: Team Code Quality Standards

**Setup:**
```bash
aico rules init
# Edit .aico/rules.json for your team
git add .aico/rules.json
git commit -m "chore: add team code quality rules"
```

**Usage:**
```bash
# Before committing
aico rules validate

# In CI/CD
aico rules validate || exit 1
```

**Benefits:**
- Consistent code quality across team
- Automated enforcement
- No manual code review for style issues

---

### Use Case 3: Security Audits

**Regular Security Scans:**
```bash
# Weekly security audit
aico security scan --output security-audit-$(date +%Y%m%d).json

# Check for new dependency vulnerabilities
aico security check --dependencies

# Pre-release security check
aico security scan
```

**CI/CD Security Gate:**
```yaml
# .github/workflows/security.yml
- name: Security Scan
  run: aico security scan
  # Fails if critical/high vulnerabilities found
```

---

### Use Case 4: CI/CD Integration

**GitHub Actions:**
```yaml
name: Code Quality
on: [push, pull_request]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Aico
        run: npm install -g aico-ai
      
      - name: Run Code Review
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: |
          git add -A
          aico ci --format json --output report.json --fail-on-error
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: code-quality-report
          path: report.json
```

**GitLab CI:**
```yaml
code-quality:
  stage: test
  image: node:18
  script:
    - npm install -g aico-ai
    - git add -A
    - aico ci --format json --output report.json --fail-on-error
  artifacts:
    reports:
      junit: report.xml
    paths:
      - report.json
  only:
    - merge_requests
    - main
```

---

### Use Case 5: AI-Powered Commit Messages

**Interactive Mode:**
```bash
git add .
aico commit

# Aico generates: "feat(auth): add JWT token validation"
# You can: Accept, Edit, Regenerate, or Abort
```

**Benefits:**
- Consistent commit message format
- Saves time writing messages
- Follows Conventional Commits standard
- Context-aware descriptions

---

## 🏆 Why Choose Aico?

### vs. IDE Extensions (Copilot, Cursor)
- ✅ **Team-First**: Shared standards across all developers
- ✅ **IDE-Agnostic**: Works with any editor
- ✅ **Git-Native**: Integrates at the git level
- ✅ **Enforceable**: Can block commits/pushes

### vs. Traditional Linters (ESLint, Prettier)
- ✅ **AI-Powered**: Understands context and intent
- ✅ **Semantic Analysis**: Beyond syntax checking
- ✅ **Security Scanning**: Built-in vulnerability detection
- ✅ **Auto-Fix**: AI suggests and applies fixes

### vs. Code Review Tools (SonarQube, Codacy)
- ✅ **Lightweight**: No server setup required
- ✅ **Fast**: Local execution, instant feedback
- ✅ **Flexible**: Multiple AI providers
- ✅ **Privacy**: Local-first option with Ollama

---

## Documentation

-  **[Official Documentation](https://aico-ai.vercel.app)** - Visit our full documentation website
-  **[Team Rules Guide](./TEAM_RULES_GUIDE.md)** - Complete guide to configuring team rules
-  **[CI/CD Integration Guide](./CI_CD_INTEGRATION_GUIDE.md)** - Detailed CI/CD setup instructions
-  **[Product Roadmap](./PRODUCT_ROADMAP.md)** - Upcoming features and priorities
-  **[Issue Tracker](https://github.com/LukasdeSouza/aico-ai/issues)** - Report bugs or request features

---

## Contributing

We welcome contributions! Whether it's:

- 🐛 **Bug Reports**: Found an issue? Let us know!
- 💡 **Feature Requests**: Have an idea? We'd love to hear it!
- 📝 **Documentation**: Help improve our docs
- 🔧 **Code Contributions**: Submit a pull request

**Getting Started:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

##  Supported AI Providers

| Provider | Speed | Cost | Privacy | Best For |
|----------|-------|------|---------|----------|
| **Groq** | ⚡⚡⚡ | 💰 Free tier | ☁️ Cloud | Fast, free reviews |
| **OpenAI** | ⚡⚡ | 💰💰 Paid | ☁️ Cloud | High quality, GPT-4 |
| **DeepSeek** | ⚡⚡ | 💰 Cheap | ☁️ Cloud | Cost-effective |
| **Ollama** | ⚡ | 💰 Free | 🔒 Local | Privacy, offline |
| **Gemini** | ⚡⚡ | 💰 Free tier | ☁️ Cloud | Google ecosystem |

---

##  Security & Privacy

- **API Keys**: Stored locally in `~/.aicorc` (never committed)
- **Code Privacy**: Only diffs are sent to AI providers
- **Local Option**: Use Ollama for complete privacy
- **No Telemetry**: We don't collect any usage data
- **Open Source**: Audit the code yourself

---

## License

ISC License - see [LICENSE](LICENSE) file for details

---

##  Acknowledgments

- Built with ❤️ by [Lucas Silva](https://github.com/LukasdeSouza)
- Powered by AI providers: Groq, OpenAI, DeepSeek, Ollama, Gemini
- Inspired by the need for better code quality tools

---

## Support

- 📧 Email: projetos@codetechsoftware.com.br
- 🐛 Issues: [GitHub Issues](https://github.com/LukasdeSouza/aico-ai/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/LukasdeSouza/aico-ai/discussions)

<script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="seekjobs" data-color="#40DCA5" data-emoji="🤖"  data-font="Cookie" data-text="Buy me a coffee" data-outline-color="#000000" data-font-color="#ffffff" data-coffee-color="#FFDD00" ></script>

---

## ⭐ Show Your Support

If you find Aico AI useful, please consider:

- **⭐ Starring the repository** on [GitHub](https://github.com/LukasdeSouza/aico-ai) - It helps others discover the project!
- **🐛 Reporting bugs** or **💡 suggesting features** via [GitHub Issues](https://github.com/LukasdeSouza/aico-ai/issues)
- **📢 Sharing** with your team and developer community
- **🤝 Contributing** - We're open source and welcome contributions!

<script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="seekjobs" data-color="#40DCA5" data-emoji="🤖"  data-font="Cookie" data-text="Buy me a coffee" data-outline-color="#000000" data-font-color="#ffffff" data-coffee-color="#FFDD00" ></script>

<div align="center">

### 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=LukasdeSouza/aico-ai&type=Date)](https://star-history.com/#LukasdeSouza/aico-ai&Date)

</div>

---

## Contributing

We welcome contributions! Whether it's:

- 🐛 **Bug Reports**: Found an issue? Let us know!
- 💡 **Feature Requests**: Have an idea? We'd love to hear it!
- 📝 **Documentation**: Help improve our docs
- 🔧 **Code Contributions**: Submit a pull request

**Getting Started:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Development Setup:**
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/aico-ai.git
cd aico-ai

# Install dependencies
npm install

# Test locally
node index.js --help

# Make your changes and test
node index.js review
```

**Contribution Guidelines:**
- Follow the existing code style
- Write clear commit messages (we use [Conventional Commits](https://www.conventionalcommits.org/))
- Add tests for new features
- Update documentation as needed
- Be respectful and constructive

---

<div align="center">

**⭐ Star us on GitHub • 🤝 Contribute • 📢 Share**

**Made with ❤️ by the open source community**

[Report Bug](https://github.com/LukasdeSouza/aico-ai/issues) · [Request Feature](https://github.com/LukasdeSouza/aico-ai/issues) · [Documentation](./TEAM_RULES_GUIDE.md)

</div>
