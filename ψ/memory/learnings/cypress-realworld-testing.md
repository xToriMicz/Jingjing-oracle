# Cypress Real World App — Testing Patterns

**Source**: `cypress-io/cypress-realworld-app`
**Studied**: 2026-03-10

A full-stack payment application (React + Express + lowdb) built by Cypress as the canonical reference for real-world E2E, API, and component testing patterns.

---

## App Architecture

- **Frontend**: React + TypeScript + Material-UI, state managed by XState machines
- **Backend**: Express API on port 3001, JSON file database via lowdb (zero external DB deps)
- **Auth**: Local session auth (cookie-based), with optional Auth0/Okta/Cognito/Google swap-in
- **Data**: Seed file at `data/database-seed.json`, reseeded on every `yarn dev` and before each test

---

## Test Structure

```
cypress/
  tests/
    api/           # Pure API tests via cy.request() — no browser UI
    ui/            # Full E2E through the browser
    ui-auth-providers/  # 3rd-party auth (Auth0, Okta, Cognito, Google)
  support/
    commands.ts    # Custom commands
    e2e.ts         # Global beforeEach hooks
    utils.ts       # Helpers (isMobile)
    auth-provider-commands/  # Provider-specific login commands
  fixtures/        # Static test data (JSON)
src/
  components/*.cy.tsx  # Component tests (co-located with source)
  __tests__/           # Unit tests
```

---

## Key Testing Patterns

### 1. Database Seeding Per Test

Every `beforeEach` calls `cy.task("db:seed")` to reset the database via an API endpoint. This guarantees test isolation — no test depends on another's state.

```ts
beforeEach(() => {
  cy.task("db:seed");
  // ...setup intercepts and login
});
```

The `db:seed` task is defined in `cypress.config.ts` and hits `POST /testData/seed` on the backend.

### 2. Custom Selectors: `data-test` Attributes

Two custom commands abstract element selection away from CSS classes:

```ts
cy.getBySel("signin-username")     // exact: [data-test=signin-username]
cy.getBySelLike("amount-input")    // partial: [data-test*=amount-input]
```

This decouples tests from styling. Components use `data-test` attributes that survive CSS refactors.

### 3. Multiple Login Strategies

| Command | How | When to use |
|---|---|---|
| `cy.login()` | Types into UI form | Testing the login flow itself |
| `cy.loginByApi()` | `cy.request("POST", "/login")` | API tests, fastest |
| `cy.loginByXstate()` | Sends XState event directly | UI tests that need auth but aren't testing login |

The XState approach (`win.authService.send("LOGIN", {...})`) bypasses the UI entirely while keeping the app in a properly authenticated state. This is the preferred method for non-auth UI tests.

### 4. Network Intercepts and Aliases

Tests intercept API calls to wait for them explicitly rather than using arbitrary timeouts:

```ts
cy.intercept("POST", "/transactions").as("createTransaction");
cy.intercept("GET", "/users*").as("allUsers");

// ...perform action...
cy.wait("@createTransaction");
```

GraphQL requests are aliased by inspecting the operation name:

```ts
cy.intercept("POST", apiGraphQL, (req) => {
  if (req.body.operationName === "CreateBankAccount") {
    req.alias = "gqlCreateBankAccountMutation";
  }
});
```

### 5. Mobile-Responsive Testing

A helper function checks viewport width against a breakpoint:

```ts
export const isMobile = () =>
  Cypress.config("viewportWidth") < Cypress.env("mobileViewportWidthBreakpoint");
```

Tests conditionally handle mobile-specific UI (e.g., hamburger menu, sidebar toggle). CI runs the same test suite at both desktop (1280x1000) and mobile (375x667) viewports.

### 6. Direct State Machine Interaction

Custom commands bypass UI by talking to XState services exposed on `window`:

```ts
cy.window().then((win) => {
  win.createTransactionService.send("SET_USERS", payload);
  win.createTransactionService.send("CREATE", { ...createPayload });
});
```

This speeds up test setup without sacrificing the ability to test the real app behavior.

### 7. Database Assertions from Tests

The `cy.database()` command queries the backend database directly to verify side effects:

```ts
cy.database("find", "users", { id: contact.id })
  .its("balance")
  .should("equal", expectedBalance);
```

Under the hood, this calls `cy.task("find:database")` which hits the test data API and uses lodash `find`/`filter`.

### 8. Visual Regression with Percy

Tests include `cy.visualSnapshot()` calls at key states. The custom command wraps `cy.percySnapshot()` with the full test title and current viewport dimensions.

---

## Custom Commands Summary

| Command | Purpose |
|---|---|
| `getBySel` / `getBySelLike` | Select by `data-test` attribute (exact/partial) |
| `login` / `loginByApi` / `loginByXstate` | Auth at different layers (UI / API / state machine) |
| `logoutByXstate` / `switchUserByXstate` | User switching without UI interaction |
| `createTransaction` | Create transaction via XState, bypassing form |
| `database` | Query test database (find/filter) |
| `pickDateRange` | Interact with calendar date picker |
| `setTransactionAmountRange` | Set slider range via React component props |
| `nextTransactionFeedPage` | Trigger pagination via XState service |
| `visualSnapshot` | Percy visual regression snapshot |
| `reactComponent` | Access React fiber from a DOM element |

---

## CI/CD Configuration

GitHub Actions workflow in `.github/workflows/main.yml`:

1. **Install job**: checkout, install deps, type-check, lint, unit tests, build
2. **Parallel E2E jobs**: 5 containers each for Chrome, Chrome Mobile, Firefox, Firefox Mobile
3. Uses `cypress-io/github-action@v6` with `parallel: true` and `record: true` (Cypress Cloud)
4. Mobile tests override viewport: `{"e2e":{"viewportWidth":375,"viewportHeight":667}}`
5. `fail-fast: false` — one test failure does not cancel other parallel containers
6. Build artifacts are uploaded/downloaded between jobs to avoid rebuilding

---

## Best Practices Extracted

1. **Seed before every test** — never rely on test ordering or shared state
2. **Use `data-test` attributes** — resilient selectors that survive style changes
3. **Wait on network, not time** — `cy.intercept()` + `cy.wait("@alias")` instead of `cy.wait(ms)`
4. **Login at the right layer** — use UI login only when testing auth; use API/state for everything else
5. **Test both viewports** — same suite runs at desktop and mobile dimensions in CI
6. **Retry on failure** — `retries: { runMode: 2 }` in config for CI stability
7. **Remove caching headers** — global `beforeEach` strips `if-none-match` to prevent 304s
8. **Throttle for realism** — mobile tests throttle API responses to 1 Mbps to simulate 3G
9. **Parallelize in CI** — matrix strategy with 5 containers per browser for speed
10. **Type your commands** — `global.d.ts` declares all custom commands on `Cypress.Chainable`

---

## Practical Tips for Web Testing Automation

- **Co-locate component tests** with source files (`*.cy.tsx` next to `*.tsx`)
- **Use `cy.intercept()` middleware** mode to modify all requests globally (e.g., stripping headers)
- **Expose app internals on `window`** in test builds for direct state manipulation
- **Use `cy.request()` for API tests** — no browser overhead, faster execution, same auth cookies
- **Context blocks** group related scenarios: `context("GET /transactions", ...)` within a `describe`
- **Dynamic test generation** with `forEach` over arrays — e.g., testing search by each user attribute
- **Use `{ force: true }` sparingly** — only when elements are covered by overlays (MUI backdrops)
- **Validate both UI and database** — check the UI shows correct values AND the DB has correct state
- **Fixture files** for static stub data; `cy.task()` for dynamic database queries
- **Code coverage** via `@cypress/code-coverage` — start with `dev:coverage`, run with `coverage=true`
