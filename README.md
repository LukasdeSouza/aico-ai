# Aico AI - Gatekeeper for your code

**Aico** is an intelligent CLI tool that acts as a gatekeeper for your code. It uses AI (powered by Groq) to review your changes before you push them, ensuring high quality, security, and consistency across your projects.

## Features

- 🔍 **AI Code Review**: Semantic analysis of your git diffs to catch bugs, security issues, and code smells.
- ✨ **Apply Fixes**: Automatically apply suggested improvements with a single click.
- 📝 **AI Commit Messages**: Generate high-quality, Conventional Commit messages based on your changes.
- 🤖 **Multi-Provider Support**: Use Groq, OpenAI, Gemini, DeepSeek, or even local models via Ollama.
- 🛡️ **Git Hook Integration**: Seamlessly integrates with Husky to run reviews as a `pre-push` hook.
- 🤫 **Silent Mode**: Run reviews without blocking your workflow.
- 🌍 **Global Config**: Configure your API key once and use it across all your projects.

## Installation

```bash
npm install -g aico-ai
# or
npm install --save-dev aico-ai
```

## Getting Started

1. **Initialize Aico**:
   Run the following command to set up your API key (Groq) and optionally configure Git hooks.
   ```bash
   aico init
   ```

2. **Review your changes**:
   Manually review your staged changes:
   ```bash
   aico review
   ```

3. **Commit with AI**:
   Let Aico write your commit message:
   ```bash
   aico commit
   ```

## Usage

### Commands

- `aico init`: Setup API keys and Git hooks.
- `aico review`: Analyze staged changes and suggest improvements.
- `aico commit`: Generate and apply an AI-suggested commit message.

### Options

- `--silent`, `-s`: Run the review in silent mode (doesn't block the push).

## Configuration

Aico stores its global configuration in `~/.aicorc`. You can also use environment variables:

```bash
GROQ_API_KEY=your_key_here
```

## Why Aico?

While IDE extensions like Copilot or Cursor are great assistants, **Aico** is your project's **Gatekeeper**. It ensures that no matter what IDE your team uses, every piece of code meets the same quality standards before it reaches the remote repository.

## License

ISC
