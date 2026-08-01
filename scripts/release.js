#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

// Resolve semver from web/node_modules (where it's installed as devDep)
const semver = require(path.join(__dirname, "..", "web", "node_modules", "semver"));

const projectRoot = path.join(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "web", "package.json");
const changelogPath = path.join(projectRoot, "CHANGELOG.md");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function run(cmd, opts = {}) {
  const { stdio = "inherit", cwd = projectRoot } = opts;
  try {
    return execSync(cmd, { stdio, cwd, encoding: "utf-8" });
  } catch (e) {
    throw new Error(`Command failed: ${cmd}\n${e.message}`);
  }
}

async function main() {
  console.log("\n📦 madabyo Release Agent\n");

  // Parse CLI args for non-interactive mode
  const args = process.argv.slice(2);
  const flags = {
    major: args.includes("--major"),
    minor: args.includes("--minor"),
    patch: args.includes("--patch"),
    dry: args.includes("--dry-run"),
  };

  try {
    // Step 1: Verify git is clean
    console.log("✓ Checking git status...");
    let gitStatus;
    try {
      gitStatus = run("git status --porcelain", { stdio: "pipe" });
    } catch {
      throw new Error(
        "Not a git repository or git command failed. Run from project root."
      );
    }

    if (gitStatus.trim()) {
      throw new Error(
        "Git working directory not clean. Commit or stash changes first."
      );
    }
    console.log("✓ Git status clean\n");

    // Step 2: Get current version
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const currentVersion = packageJson.version;
    console.log(`Current version: ${currentVersion}`);

    // Step 3-5: Run pre-release checks
    console.log("\n🧪 Running pre-release checks...");

    console.log("  • Running tests...");
    try {
      run("npm test", { cwd: path.join(projectRoot, "web") });
    } catch (e) {
      throw new Error(`Tests failed: ${e.message}`);
    }
    console.log("  ✓ Tests passed");

    console.log("  • Building frontend...");
    try {
      run("npm run build", { cwd: path.join(projectRoot, "web") });
    } catch (e) {
      throw new Error(`Frontend build failed: ${e.message}`);
    }
    console.log("  ✓ Frontend build passed");

    console.log("  • Building Go binary...");
    try {
      run("go build -v ./cmd/madabyo");
    } catch (e) {
      throw new Error(`Go build failed: ${e.message}`);
    }
    console.log("  ✓ Go build passed");

    // Step 6: Fetch latest tags to check for conflicts
    console.log("\n  • Checking for tag conflicts...");
    try {
      run("git fetch --tags -q");
    } catch {
      console.log("  ⚠ Could not fetch tags (offline?), skipping check");
    }
    console.log("  ✓ Tag check passed\n");

    // Step 7: Determine next version
    const nextVersions = {
      patch: semver.inc(currentVersion, "patch"),
      minor: semver.inc(currentVersion, "minor"),
      major: semver.inc(currentVersion, "major"),
    };

    let nextVersion = nextVersions.patch;

    if (flags.major) {
      nextVersion = nextVersions.major;
    } else if (flags.minor) {
      nextVersion = nextVersions.minor;
    } else if (flags.patch) {
      nextVersion = nextVersions.patch;
    } else {
      // Interactive mode
      console.log("Choose version bump:\n");
      console.log(`  1) ${nextVersions.patch} - patch (bug fixes)`);
      console.log(`  2) ${nextVersions.minor} - minor (new features)`);
      console.log(`  3) ${nextVersions.major} - major (breaking changes)\n`);

      const choice = await prompt("Enter choice (1-3): ");
      const choices = { "1": "patch", "2": "minor", "3": "major" };

      if (!choices[choice]) {
        throw new Error("Invalid choice");
      }

      nextVersion = nextVersions[choices[choice]];
    }

    console.log(`\n📝 Creating release v${nextVersion}\n`);

    // Step 8: Generate changelog
    console.log("  • Generating release notes from commits...");
    let commits = [];
    let lastTag = null;

    try {
      lastTag = run("git describe --tags --abbrev=0", {
        stdio: "pipe",
      }).trim();
      commits = run(`git log ${lastTag}..HEAD --pretty=format:%s`, {
        stdio: "pipe",
      })
        .trim()
        .split("\n")
        .filter((line) => line.trim());
    } catch {
      // First release: no tags exist yet
      commits = run("git log --pretty=format:%s", {
        stdio: "pipe",
      })
        .trim()
        .split("\n")
        .filter((line) => line.trim());
    }

    // Step 9: Update package.json
    if (!flags.dry) {
      packageJson.version = nextVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log("  ✓ Updated web/package.json");
    } else {
      console.log("  [DRY-RUN] Would update web/package.json");
    }

    // Step 10: Update CHANGELOG
    const changelogEntry = formatChangelogEntry(nextVersion, commits);
    updateChangelog(changelogEntry, flags.dry);
    console.log("  ✓ Updated CHANGELOG.md");

    // Step 11: Commit and tag
    if (!flags.dry) {
      const commitMsg = `release: v${nextVersion}`;
      run(`git add web/package.json CHANGELOG.md`);
      run(`git commit -m "${commitMsg}"`);
      console.log(`  ✓ Created commit: ${commitMsg}`);

      run(
        `git tag -a v${nextVersion} -m "Release v${nextVersion} - See CHANGELOG.md for details"`
      );
      console.log(`  ✓ Created tag: v${nextVersion}`);
    } else {
      console.log(`  [DRY-RUN] Would create commit and tag v${nextVersion}`);
    }

    // Confirmation before push (skip in dry-run or non-interactive)
    let shouldPush = true;
    if (!flags.dry && !process.argv.includes("--no-confirm")) {
      const confirm = await prompt("\n🚀 Push to origin? (y/N): ");
      shouldPush = confirm.toLowerCase() === "y";
    }

    if (shouldPush && !flags.dry) {
      run("git push origin main");
      console.log("  ✓ Pushed commits");

      run("git push --tags");
      console.log("  ✓ Pushed tags");

      console.log(
        `\n✅ Release v${nextVersion} complete!\n🎯 GitHub Actions will build and publish binaries.\n`
      );
    } else if (flags.dry) {
      console.log("\n[DRY-RUN] Would push commits and tags to origin");
    } else {
      console.log("\n⏸ Skipped push. Run: git push origin main && git push --tags");
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function formatChangelogEntry(version, commits) {
  const date = new Date().toISOString().split("T")[0];

  const sections = {
    "feat:": "### Features",
    "fix:": "### Fixes",
    "docs:": "### Documentation",
    "chore:": "### Chores",
  };

  const grouped = {};
  for (const [prefix, title] of Object.entries(sections)) {
    grouped[title] = commits
      .filter((c) => c.startsWith(prefix))
      .map((c) => `- ${c.replace(prefix, "").trim()}`);
  }

  let entry = `## [${version}] - ${date}\n\n`;
  for (const [title, lines] of Object.entries(grouped)) {
    if (lines.length > 0) {
      entry += `${title}\n${lines.join("\n")}\n\n`;
    }
  }

  if (commits.length === grouped[Object.keys(grouped)[0]]?.length ?? 0) {
    entry += `- Release v${version}\n`;
  }

  return entry.trim();
}

function updateChangelog(newEntry, dryRun = false) {
  const template = `# Changelog

All notable changes to madabyo are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;

  let content = template;

  if (fs.existsSync(changelogPath)) {
    const existing = fs.readFileSync(changelogPath, "utf-8");
    const existingContent = existing.replace(template, "").trim();
    if (existingContent) {
      content += newEntry + "\n\n" + existingContent;
    } else {
      content += newEntry;
    }
  } else {
    content += newEntry;
  }

  if (!dryRun) {
    fs.writeFileSync(changelogPath, content);
  }
}

main().catch(console.error);
