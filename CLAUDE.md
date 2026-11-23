# thesammy2010.com

The website at https://thesammy2010.com: a Create React App (TypeScript) app
deployed to GitHub Pages. It has Go Heavier, Finance and admin pages, and the
squash group's pages under `/squash`. All of them talk to
`api.thesammy2010.com` (`../api.thesammy2010.com`).

## Commands

- `npm start` runs it locally, calling `REACT_APP_API_URL`.
  `.env.development` sets that to `http://localhost:8000`, but the gitignored
  `.env.development.local`, where it exists, overrides it. That file serves
  the site over https at https://local.thesammy2010.com:3000 (the name Sign in
  with Apple needs, with mkcert's certificate in `.cert/`) and calls the API
  at https://local.thesammy2010.com:8443, so run the API there too (see its
  CLAUDE.md). Plain http://127.0.0.1:3000 then gets an empty reply.
  `.env.production` has the real API.
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
- A completed match only counts towards records once both sides have
  confirmed its result (`confirmation` on the match). Anything the site
  works out itself from matches filters with `counts()` in `api.ts`, as the
  API's own figures do. `ConfirmResult` on a match page confirms or disputes
  it, and Home lists `resultsToConfirm`.
- Access comes from `GET /squash/players/me` (`useSquashAccess`), not from
  roles. Squash is for players, plus admins who don't play.
- Scoring live (`LiveScorer.tsx`) sends each rally against the match's
  `version`. A 409 comes back as `StaleMatchError` carrying the current match.
- Game/match rules (`format.ts`) mirror the API's
  `src/resolvers/squash/scoring.py` and `matches.py`. Change them together.
  Sides take turns to serve first in each game, from the API's spin of the
  racket.
- The service box comes from the API (`serving_box`, `can_choose_box`), so
  the website, phone and watch show the same one, and Switch box sends
  `PUT .../box` (`squashApi.chooseBox`). `serve.ts` works it out locally only
  for an API from before, or a side picked here to serve first that the API
  doesn't have serving, and mirrors the app's `SquashServiceBox.swift`.

## Conventions

- Colours come from `src/theme.css`, with a light and a dark value each,
  so the site works in dark mode. The page follows the device, or the
  toggle in the top bar (`src/theme.ts`, kept in localStorage and set as
  `data-theme` on `<html>`). A new colour needs a token there rather than a
  hex value in a stylesheet.

- Comments are plain English sentences explaining why, at the density of the
  file around them. Pure logic sits in `.ts` files beside a `.test.ts`.
- Commit messages and PR titles are short imperative sentences. Work on a
  `leop/<topic>` branch and merge by PR.
- Update this file when the commands, layout or API contract change.
