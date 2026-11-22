# thesammy2010.com

The website at https://thesammy2010.com: a Create React App (TypeScript) app
deployed to GitHub Pages. It has Go Heavier, Finance and admin pages, and the
squash group's pages under `/squash`. All of them talk to
`api.thesammy2010.com` (`../api.thesammy2010.com`).

## Commands

- `npm start` runs it locally. It calls `REACT_APP_API_URL`, or
  `http://localhost:8000` when that isn't set. `.env.production` has the real
  API.
- `CI=true npm test` runs the tests once (Jest via react-scripts).
- `npx tsc --noEmit` type-checks the code.
- Husky's pre-commit hook runs lint-staged. Prettier is set to parse
  everything as TypeScript, so a new Markdown file needs adding to
  `.prettierignore`, as README.md and this file are.
- Deploys go to GitHub Pages (`.github/workflows/gh-pages.yml`). Don't
  deploy unless asked.

## Squash (`/squash`)

- Routes are in `src/App.tsx`, pages in `src/pages/squash/`, and components
  and logic in `src/components/squash/`.
- `components/squash/api.ts` has the types that mirror the API's
  `src/schemas/squash`, and every squash request. Keep it in step with the
  API and with How2Squash's `SharedSquash/SquashModels.swift`.
- Access comes from `GET /squash/players/me` (`useSquashAccess`), not from
  roles. Squash is for players, plus admins who don't play.
- Scoring live (`LiveScorer.tsx`) sends each rally against the match's
  `version`. A 409 comes back as `StaleMatchError` carrying the current match.
- Service boxes (`serve.ts`) and game/match rules (`format.ts`) mirror the
  API's `src/resolvers/squash/scoring.py` and `matches.py`, and the app's
  `SquashServiceBox.swift`. Change them together. Sides take turns to serve
  first in each game, from the API's spin of the racket.

## Conventions

- Comments are plain English sentences explaining why, at the density of the
  file around them. Pure logic sits in `.ts` files beside a `.test.ts`.
- Commit messages and PR titles are short imperative sentences. Work on a
  `leop/<topic>` branch and merge by PR.
- Update this file when the commands, layout or API contract change.
