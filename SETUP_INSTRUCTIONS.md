# GitHub Packages Setup - Quick Start Guide

This guide will help you complete the GitHub Packages setup for your `aico-ai` package.

## ✅ What's Already Done

All the code and configuration files have been created:

- ✅ `package.json` - Updated with publishConfig
- ✅ `.npmrc.template` - Template for users to authenticate
- ✅ `.github/workflows/publish.yml` - Automated publishing workflow
- ✅ `GITHUB_PACKAGES.md` - Complete documentation
- ✅ `README.md` - Updated with installation instructions

## 🚀 What You Need to Do

### Step 1: Add NPM_TOKEN Secret (Required for npm publishing)

1. **Get your npm token:**
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type
   - Copy the token

2. **Add it to GitHub:**
   - Go to https://github.com/LukasdeSouza/aico-ai/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

### Step 2: Commit and Push These Changes

```bash
# Stage all new files
git add .

# Commit the changes
git commit -m "feat: add GitHub Packages support with dual publishing"

# Push to GitHub
git push origin main
```

### Step 3: Test the Publishing Workflow

You have three options to test:

#### Option A: Create a GitHub Release (Recommended)

1. Go to https://github.com/LukasdeSouza/aico-ai/releases
2. Click "Create a new release"
3. Click "Choose a tag" and create a new tag (e.g., `v1.1.2`)
4. Fill in the release title and description
5. Click "Publish release"
6. The workflow will automatically run and publish to both registries

#### Option B: Manual Workflow Trigger

1. Go to https://github.com/LukasdeSouza/aico-ai/actions
2. Click on "Publish Package" workflow
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

#### Option C: Version Bump and Tag

```bash
# Update version
npm version patch  # or minor, or major

# Push with tags
git push && git push --tags
```

### Step 4: Verify the Packages

After the workflow completes:

1. **Check npm:**
   - Visit: https://www.npmjs.com/package/aico-ai
   - Should show the new version

2. **Check GitHub Packages:**
   - Visit: https://github.com/LukasdeSouza/aico-ai/packages
   - Should show `@lukasddesouza/aico-ai`

## 📦 How Users Will Install

### From npm (Default)
```bash
npm install -g aico-ai
```

### From GitHub Packages
```bash
# 1. Configure authentication
echo "@lukasddesouza:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=GITHUB_TOKEN" >> .npmrc

# 2. Install
npm install -g @lukasddesouza/aico-ai
```

## 🔍 Monitoring the Workflow

When you trigger a release, you can monitor the workflow:

1. Go to https://github.com/LukasdeSouza/aico-ai/actions
2. Click on the latest "Publish Package" run
3. Watch the progress of both jobs:
   - `publish-npm` - Publishes to npm
   - `publish-github-packages` - Publishes to GitHub Packages

## 🐛 Troubleshooting

### "Error: Need to provide a token"
- Make sure you added the `NPM_TOKEN` secret in Step 1

### "Error: 403 Forbidden"
- Check that your npm token has "Automation" permissions
- Verify the token hasn't expired

### "Package already exists"
- Make sure you bumped the version in `package.json`
- You can't republish the same version

### Workflow doesn't trigger
- Make sure you pushed the workflow file to the repository
- Check that you created a release (not just a tag)

## 📚 Additional Resources

- Full documentation: [GITHUB_PACKAGES.md](./GITHUB_PACKAGES.md)
- GitHub Packages docs: https://docs.github.com/en/packages
- npm publishing docs: https://docs.npmjs.com/cli/v8/commands/npm-publish

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ The GitHub Actions workflow completes successfully
2. ✅ Your package appears on npm: https://www.npmjs.com/package/aico-ai
3. ✅ Your package appears on GitHub: https://github.com/LukasdeSouza/aico-ai/packages
4. ✅ Users can install from both registries

## 💡 Tips

- **Always test locally first:** Run `npm pack` to create a tarball and test installation
- **Use semantic versioning:** Follow semver (major.minor.patch) for version numbers
- **Write good release notes:** Help users understand what changed
- **Monitor downloads:** Check npm and GitHub for package statistics

## 🆘 Need Help?

If you encounter any issues:

1. Check the workflow logs in GitHub Actions
2. Review the [GITHUB_PACKAGES.md](./GITHUB_PACKAGES.md) documentation
3. Open an issue if you find a problem with the setup

---

**Ready to publish?** Follow Step 1 and Step 2 above, then create your first release! 🚀
