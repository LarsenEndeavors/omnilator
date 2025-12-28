#!/usr/bin/env python3
"""
Script to create GitHub issues for Snes9xWasm implementation.
Reads issue data from issues-data.json and creates issues via GitHub CLI.

Usage:
    python3 create_issues.py
    
Requirements:
    - GitHub CLI (gh) installed and authenticated
    - issues-data.json in docs/ directory
"""

import json
import subprocess
import sys
from pathlib import Path

def load_issue_data():
    """Load issue data from JSON file."""
    json_path = Path(__file__).parent.parent / 'docs' / 'issues-data.json'
    with open(json_path, 'r') as f:
        return json.load(f)

def check_gh_cli():
    """Check if GitHub CLI is installed and authenticated."""
    try:
        result = subprocess.run(['gh', 'auth', 'status'], 
                              capture_output=True, 
                              text=True,
                              check=False)
        if result.returncode != 0:
            print("❌ GitHub CLI is not authenticated. Please run: gh auth login")
            return False
        return True
    except FileNotFoundError:
        print("❌ GitHub CLI (gh) is not installed.")
        print("Install it from: https://cli.github.com/")
        return False

def create_issue_body(task):
    """Generate the issue body from task data."""
    body = f"""## Objective
{task['objective']}

## Prerequisites
"""
    if task['prerequisites']:
        for prereq in task['prerequisites']:
            body += f"- {prereq}\n"
    else:
        body += "- None\n"
    
    body += f"""
## Acceptance Criteria
"""
    for criterion in task['acceptanceCriteria']:
        body += f"- [ ] {criterion}\n"
    
    body += f"""
## Time Estimate
{task['timeEstimate']}

## Resources
- Implementation Plan: `docs/SNES9XWASM_IMPLEMENTATION_PLAN.md`
- Task Breakdown: `docs/TASK_BREAKDOWN.md`

## Definition of Done
- [ ] Code changes committed and reviewed
- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] Documentation updated
"""
    return body

def create_issue(repo, task):
    """Create a single GitHub issue."""
    title = f"[{task['id']}] {task['title']}"
    body = create_issue_body(task)
    labels = task['labels']
    
    print(f"Creating issue: {title}")
    
    # Build command
    cmd = [
        'gh', 'issue', 'create',
        '--repo', repo,
        '--title', title,
        '--body', body,
        '--assignee', '@me'
    ]
    
    # Add labels
    for label in labels:
        cmd.extend(['--label', label])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"  ✓ Created {task['id']}: {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ✗ Failed to create {task['id']}: {e.stderr}")
        return False

def main():
    """Main function."""
    print("🚀 Snes9xWasm Implementation - GitHub Issues Creator\n")
    
    # Check prerequisites
    if not check_gh_cli():
        sys.exit(1)
    
    # Load data
    print("📄 Loading issue data...")
    data = load_issue_data()
    repo = data['project']['repository']
    tasks = data['tasks']
    
    print(f"📦 Repository: {repo}")
    print(f"📋 Total tasks: {len(tasks)}\n")
    
    # Confirm
    response = input("Create all issues? (y/N): ")
    if response.lower() != 'y':
        print("Cancelled.")
        return
    
    # Create issues
    created = 0
    failed = 0
    
    for task in tasks:
        if create_issue(repo, task):
            created += 1
        else:
            failed += 1
    
    # Summary
    print(f"\n✅ Summary:")
    print(f"   Created: {created}")
    print(f"   Failed: {failed}")
    print(f"   Total: {len(tasks)}")
    
    if created > 0:
        print(f"\n🔗 View issues: https://github.com/{repo}/issues")
        print(f"\n📋 Next steps:")
        print(f"   1. Create project board")
        print(f"   2. Set up milestone: {data['project']['milestone']}")
        print(f"   3. Organize issues into sprints")
        print(f"   4. Begin Sprint 1!")

if __name__ == '__main__':
    main()
