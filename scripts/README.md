# Scripts Directory

This directory contains automation scripts for the Snes9xWasm implementation project.

## Available Scripts

### create_issues.py

Python script to automatically create all 27 GitHub issues for the Snes9xWasm implementation.

**Usage:**
```bash
# Make sure GitHub CLI is installed and authenticated
gh auth login

# Run the script
python3 scripts/create_issues.py
```

**What it does:**
- Reads issue data from `docs/issues-data.json`
- Creates all 27 tasks as GitHub issues
- Assigns to @LarsenEndeavors
- Adds appropriate labels
- Sets up sprint organization

**Prerequisites:**
- GitHub CLI (gh) installed
- Authenticated with GitHub
- Python 3.6+

**Installation:**
```bash
# macOS
brew install gh

# Linux
sudo apt install gh

# Windows
winget install GitHub.cli

# Authenticate
gh auth login
```

## Files

- `create_issues.py` - Main script for creating GitHub issues
- `../docs/issues-data.json` - Issue data (27 tasks)
- `../docs/GITHUB_ISSUES_CREATION.md` - Detailed documentation

## Quick Start

```bash
# 1. Install GitHub CLI
brew install gh  # or appropriate for your OS

# 2. Authenticate
gh auth login

# 3. Run the script
cd /path/to/omnilator
python3 scripts/create_issues.py

# 4. Confirm when prompted
# Type 'y' and press Enter

# 5. Check your issues
open "https://github.com/LarsenEndeavors/omnilator/issues"
```

## Manual Alternative

If you prefer to create issues manually, refer to `docs/GITHUB_ISSUES_CREATION.md` which contains:
- Detailed issue templates for each task
- Copy-paste ready descriptions
- Acceptance criteria
- Testing requirements

## Next Steps After Creating Issues

1. **Create a Project Board**
   - Go to Projects tab in GitHub
   - Create new project: "Snes9xWasm Implementation"
   - Add columns for each sprint

2. **Set Up Milestone**
   - Go to Issues → Milestones
   - Create milestone: "Snes9xWasm Implementation"
   - Set duration: 6 weeks
   - Add all 27 issues to milestone

3. **Organize Sprints**
   - Use labels (sprint-1 through sprint-6)
   - Add issues to project board
   - Set up sprint columns

4. **Begin Development**
   - Start with SNES-001
   - Follow task dependencies
   - Check off acceptance criteria as you go

## Troubleshooting

**"gh: command not found"**
- GitHub CLI not installed. Follow installation instructions above.

**"gh auth status failed"**
- Not authenticated. Run: `gh auth login`

**"Failed to create issue"**
- Check repository permissions
- Verify you're authenticated as correct user
- Check if labels exist (script will fail if labels don't exist)

**Creating labels first:**
```bash
# Create labels before running script
gh label create "snes9x" --description "SNES9x integration" --color "1d76db"
gh label create "sprint-1" --description "Week 1" --color "0e8a16"
# ... etc for all labels
```

## Support

For issues with the script:
1. Check `docs/GITHUB_ISSUES_CREATION.md` for manual process
2. Open an issue in the repository
3. Contact @LarsenEndeavors
