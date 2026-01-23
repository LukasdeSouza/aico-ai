# GitHub Packages Setup - TODO List

## Progress Tracker

- [x] 1. Update package.json with publishConfig
- [x] 2. Create .npmrc.template for user reference
- [x] 3. Create GitHub Actions workflow for automated publishing
- [x] 4. Create GITHUB_PACKAGES.md documentation
- [x] 5. Update README.md with GitHub Packages installation instructions
- [ ] 6. Test and verify setup

## Completed Steps

✅ **package.json** - Added publishConfig for npm registry
✅ **.npmrc.template** - Created template with GitHub Packages authentication instructions
✅ **.github/workflows/publish.yml** - Created automated dual-publishing workflow
✅ **GITHUB_PACKAGES.md** - Created comprehensive documentation
✅ **README.md** - Added GitHub Packages installation section with badges

## Next Steps (Manual)

### For You to Complete:

1. **Create GitHub Personal Access Token**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `write:packages`, `read:packages`
   - Copy the token

2. **Add NPM_TOKEN Secret to Repository**
   - Go to: https://github.com/LukasdeSouza/aico-ai/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm authentication token
   - Click "Add secret"

3. **Test the Publishing Workflow**
   - Option A: Create a new release on GitHub
   - Option B: Manually trigger the workflow from Actions tab
   - Option C: Push a new version tag

4. **Verify Packages**
   - Check npm: https://www.npmjs.com/package/aico-ai
   - Check GitHub Packages: https://github.com/LukasdeSouza/aico-ai/packages

## Notes
- Dual publishing to npm and GitHub Packages
- npm: aico-ai (existing)
- GitHub Packages: @lukasddesouza/aico-ai (new)
- Workflow uses GITHUB_TOKEN (automatic) for GitHub Packages
- Workflow uses NPM_TOKEN (secret) for npm publishing
