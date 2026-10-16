# Export the Full Build as Code Files for GitHub

## Goal

Package the entire sandbox build (5D elemental universe / Powers of Ten globe) as a clean, GitHub-ready source bundle the user can download and push to a repository.

## What gets included

- All source: `src/` (Sandbox.tsx, powersOfTen.ts, routes, ui components, styles.css, router/start/server files)
- Config: `package.json`, `bun.lock`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `eslint.config.js`, `components.json`, `.prettierrc`, `.prettierignore`
- `public/` (favicon, robots.txt)
- Tests: `src/test/`
- A rewritten `README.md` with: what the app is, feature overview, prerequisites (Node 20+ or Bun), install/run/build commands, tech stack, and step-by-step GitHub upload instructions (`git init`, commit, push, or GitHub web upload)

## What gets excluded

- `node_modules/`, `tsconfig.tsbuildinfo` (generated)
- Git metadata (`.git`, `.workspace`)
- `.lovable/` private metadata
- Logs and build output

## Steps

1. Assemble a clean staging folder under `/tmp/export/` by copying only the files above (no node_modules, no build artifacts, no `.git`, no `.lovable`).
2. Adjust the staged `package.json` name to `elemental-universe-sandbox` (current name is the generic template name `tanstack_start_ts`) so the repo reads well on GitHub.
3. Write the new `README.md` into the staged folder (project description, run instructions, GitHub push guide).
4. Recursively list every staged entry (including hidden files) and verify nothing unwanted or missing before packaging.
5. Create `elemental-universe-sandbox-source.zip` in `/tmp`, inspect its entries, then copy it into Files at `/mnt/documents`.
6. Verify the ZIP integrity and total file count; report to the user with the artifact preview.

## Notes

- No changes to the running app — source stays untouched; only copies are staged.
- Dependencies (three@0.160.0, tone@14.8.49, TanStack Start, Tailwind v4) install from `package.json`/lockfile, so nothing proprietary is bundled.
- Deliverable: one ZIP in Files containing the complete runnable project, plus the README inside it covering local run and GitHub upload steps.
