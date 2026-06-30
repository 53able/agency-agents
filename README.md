# Agency Agents Skills

Agency Agents converted to the open agent skills repository layout used by the
Vercel Labs Skills CLI.

## Structure

Each agent is available as one skill:

```text
skills/
  backend-architect/
    SKILL.md
  frontend-developer/
    SKILL.md
```

Every `SKILL.md` keeps the original agent frontmatter, including `name` and
`description`, so Skills CLI discovery can list and install the collection.

## Usage

```bash
npx skills add <owner>/<repo> --list
npx skills add <owner>/<repo> --skill backend-architect
npx skills use <owner>/<repo>@backend-architect
```

For a local checkout:

```bash
npx skills add .
npx skills add . --skill backend-architect
```

## Validation

```bash
npm run validate
```

The validation script checks that every skill lives at
`skills/<slug>/SKILL.md`, includes required frontmatter, and has a unique
normalized skill name.

## Sync From Upstream

Keep this fork in the Skills CLI layout by regenerating `skills/` from a clean
checkout of the upstream `msitarzewski/agency-agents` repository.

```bash
git clone https://github.com/msitarzewski/agency-agents.git ../agency-agents-upstream
npm run sync:upstream -- ../agency-agents-upstream
npm run validate
```

For later updates:

```bash
git -C ../agency-agents-upstream pull
npm run sync:upstream -- ../agency-agents-upstream
npm run validate
```

This avoids merge conflicts between upstream's category-based agent layout and
this fork's `skills/<slug>/SKILL.md` layout. Commit and push the regenerated
`skills/` directory after validation passes.
