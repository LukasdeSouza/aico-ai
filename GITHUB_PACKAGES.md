# GitHub Packages Setup Guide

This guide explains how to publish and install the `aico-ai` package from GitHub Packages.

## 📦 Dual Publishing Strategy

The `aico-ai` package is published to **two registries**:

1. **npm Registry** (default): `aico-ai`
2. **GitHub Packages**: `@lukasddesouza/aico-ai`

Both packages are identical in functionality. Choose the registry that best fits your workflow.

---

## 🚀 For Package Maintainers (Publishing)

### Prerequisites

1. **GitHub Personal Access Token** with the following scopes:
   - `write:packages` - To publish packages
   - `read:packages` - To download packages
   - `repo` - To access repository (if private)

2. **npm Token** (for npm publishing)
   - Get from https://www.npmjs.com/settings/YOUR_USERNAME/tokens

### Creating a GitHub Personal Access Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a descriptive name (e.g., "aico-ai GitHub Packages")
4. Select the following scopes:
   - ✅ `write:packages`
   - ✅ `read:packages`
   - ✅ `repo` (if repository is private)
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't see it again!)

### Setting Up Repository Secrets

For automated publishing via GitHub Actions, add these secrets to your repository:

1. Go to your repository on GitHub
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**
4. Add the following secrets:

   - **Name:** `NPM_TOKEN`
     - **Value:** Your npm authentication token
   
   - **Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions

### Publishing Workflow

The package is automatically published when you create a new release:

#### Option 1: Automatic Publishing (Recommended)

1. **Update version in package.json:**
   ```bash
   npm version patch  # or minor, or major
   ```

2. **Push the version commit and tag:**
   ```bash
   git push && git push --tags
   ```

3. **Create a GitHub Release:**
   - Go to your repository on GitHub
   - Click **"Releases"** → **"Create a new release"**
   - Select the tag you just pushed
   - Add release notes
   - Click **"Publish release"**

4. **GitHub Actions will automatically:**
   - Publish to npm as `aico-ai`
   - Publish to GitHub Packages as `@lukasddesouza/aico-ai`

#### Option 2: Manual Publishing

**To npm:**
```bash
npm publish
```

**To GitHub Packages:**
```bash
# 1. Authenticate with GitHub Packages
npm login --scope=@lukasddesouza --registry=https://npm.pkg.github.com

# 2. Temporarily update package.json name
# Change "name": "aico-ai" to "name": "@lukasddesouza/aico-ai"

# 3. Update publishConfig in package.json
# "publishConfig": {
#   "registry": "https://npm.pkg.github.com"
# }

# 4. Publish
npm publish

# 5. Restore package.json to original state
git checkout package.json
```

---

## 📥 For Package Users (Installing)

### Installing from npm (Default)

This is the standard installation method:

```bash
npm install -g aico-ai
```

### Installing from GitHub Packages

#### Step 1: Authenticate with GitHub Packages

Create a `.npmrc` file in your project root (or use the global `~/.npmrc`):

```bash
# Copy the template
cp .npmrc.template .npmrc
```

Edit `.npmrc` and replace `TOKEN` with your GitHub Personal Access Token:

```
@lukasddesouza:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

**Important:** Never commit `.npmrc` with your token to git! It's already in `.gitignore`.

#### Step 2: Install the Package

**Global installation:**
```bash
npm install -g @lukasddesouza/aico-ai
```

**Project installation:**
```bash
npm install --save-dev @lukasddesouza/aico-ai
```

#### Alternative: Using npm login

Instead of creating `.npmrc`, you can authenticate via CLI:

```bash
npm login --scope=@lukasddesouza --registry=https://npm.pkg.github.com
```

Then enter:
- **Username:** Your GitHub username
- **Password:** Your GitHub Personal Access Token
- **Email:** Your GitHub email

---

## 🔐 Security Best Practices

### For Maintainers

1. **Never commit tokens to git**
   - `.npmrc` is in `.gitignore`
   - Use GitHub Secrets for CI/CD

2. **Use scoped tokens**
   - Create separate tokens for different purposes
   - Regularly rotate tokens

3. **Enable 2FA**
   - Enable two-factor authentication on both npm and GitHub

### For Users

1. **Protect your tokens**
   - Never share your Personal Access Token
   - Don't commit `.npmrc` with tokens

2. **Use read-only tokens when possible**
   - For installation, you only need `read:packages` scope

3. **Use environment variables in CI/CD**
   ```bash
   echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" > .npmrc
   ```

---

## 🆚 npm vs GitHub Packages: Which Should I Use?

### Use **npm** if:
- ✅ You want the simplest installation experience
- ✅ You're installing globally (`npm install -g`)
- ✅ You don't need GitHub-specific features
- ✅ You want maximum compatibility

### Use **GitHub Packages** if:
- ✅ You prefer GitHub-native workflows
- ✅ You want tighter integration with GitHub repositories
- ✅ You're already using GitHub for dependency management
- ✅ You need private packages (with GitHub Teams/Enterprise)

---

## 🐛 Troubleshooting

### "Unable to authenticate" error

**Problem:** npm can't authenticate with GitHub Packages

**Solution:**
1. Verify your token has `read:packages` scope
2. Check that `.npmrc` is properly configured
3. Ensure the token hasn't expired

```bash
# Test authentication
npm whoami --registry=https://npm.pkg.github.com
```

### "Package not found" error

**Problem:** npm can't find `@lukasddesouza/aico-ai`

**Solution:**
1. Ensure you're using the scoped name: `@lukasddesouza/aico-ai`
2. Check that `.npmrc` has the correct registry mapping
3. Verify the package has been published

### "Permission denied" error

**Problem:** Can't publish to GitHub Packages

**Solution:**
1. Verify your token has `write:packages` scope
2. Ensure you're the repository owner or have write access
3. Check that the package name matches the repository owner

---

## 📚 Additional Resources

- [GitHub Packages Documentation](https://docs.github.com/en/packages)
- [npm Documentation](https://docs.npmjs.com/)
- [Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [Managing Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

---

## 💬 Support

If you encounter any issues:

- 📧 Email: projetos@codetechsoftware.com.br
- 🐛 Issues: [GitHub Issues](https://github.com/LukasdeSouza/aico-ai/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/LukasdeSouza/aico-ai/discussions)

---

## 📝 License

ISC License - see [LICENSE](LICENSE) file for details
