# [PROJECT_NAME] Constitution

<!-- Example: Spec Constitution, TaskFlow Constitution, etc. -->

## Core Principles

### [PRINCIPLE_1_NAME]

<!-- Example: I. Library-First -->

[PRINCIPLE_1_DESCRIPTION]

<!-- Example: Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries -->

<!--
Sync Impact Report

- Version change: template -> 1.0.0
- Modified principles:
	- [PRINCIPLE_1_NAME] -> I. Standards de Qualité du Code
	- [PRINCIPLE_2_NAME] -> II. Architecture & Organisation
	- [PRINCIPLE_3_NAME] -> III. Standards de Tests
	- [PRINCIPLE_4_NAME] -> IV. Performance
	- [PRINCIPLE_5_NAME] -> V. Sécurité
- Added sections: Experience Utilisateur, Paiement, Documentation, CI/CD, Règle d'Or
- Removed placeholders: All bracketed placeholders replaced
-- Templates requiring review: ✅ .specify/templates/plan-template.md
						  ✅ .specify/templates/spec-template.md
						  ✅ .specify/templates/tasks-template.md
						  ✅ .specify/templates/constitution-template.md (reference used)
- Commands templates: none found under .specify/templates/commands/ (none to update)
- Follow-up TODOs:
	- NONE: No remaining unexplained bracket tokens. All placeholders resolved.

-->

```markdown
# Souplesse Fitness Constitution

## Core Principles

### I. Standards de Qualité du Code

- MUST enable TypeScript `strict: true` across the repository; any deviation
  requires documented justification. Runtime validation on the server is
  REQUIRED (Zod recommended).
- Use of `any` is PROHIBITED except where a documented exception exists.
- Centralize shared types in the `/types` directory.
- Rationale: Strong typing prevents class of runtime errors and improves
  maintainability and refactorability.

### II. Architecture & Organisation

- Adhere to Nuxt structure: `/app` for UI only, `/server` for business logic
  and DB access. No business logic in UI components.
- Follow Clean Architecture: API → Services → Repository → DB. No direct DB
  calls from routes; prefer dependency injection for testability.
- Centralized middleware for role checks: `admin`, `coach`, `client` with
  server-side enforcement REQUIRED.
- Rationale: Clear separations reduce coupling and make security enforcement
  reliable.

### III. Standards de Tests

- Global coverage target: MINIMUM 80%; critical services (payment,
  authentication) MUST be 100% covered with unit and integration tests.
- Test suite types: unit tests for services/utils, integration tests for API,
  and E2E for flows (auth, payment, reservation).
- Tests MUST be isolated, reproducible in CI, and mock external services
  (Stripe, PayPal). Use an isolated test database for integration tests.
- Rationale: High test coverage ensures reliability for business-critical
  flows and safe deployments.

### IV. Performance

- Frontend: lazy-load routes/pages, dynamic import for heavy components,
  optimize images, and avoid unnecessary libraries.
- Backend: index critical DB columns, enforce pagination, eliminate N+1
  queries, and use caching strategically where justified.
- Performance objectives: LCP < 2.5s, API average < 300ms, TTFB optimized.

### V. Sécurité

- Hash passwords with bcrypt; JWTs must have short expirations and use
  refresh tokens securely. Store secrets in environment variables only.
- Strict input validation server-side; enforce CSRF protection and rate
  limiting on auth and payment endpoints. No secret keys in frontend code.
- Rationale: Protect user data, payment integrity and limit attack surface.

## Experience Utilisateur, Paiement & Documentation

### UX & Accessibilité

- Design mobile-first, provide immediate feedback on loading/success/error
  states, and ensure error messages are explicit and actionable.
- Accessibility: labels for inputs, keyboard navigation, and contrast
  meeting WCAG guidelines.

### Paiement & Transactions

- Server-side webhook verification is MANDATORY. Never trust client-only
  payment validation.
- Log transactions thoroughly and ensure idempotency for payment requests.

### Documentation

- JSDoc is REQUIRED for critical services. Update `README.md` for each
  feature that materially changes usage or setup. Only keep comments that
  add clear value.

### Règle d'Or

Every added code artifact MUST be: tested, typed, performant, secure, and
architecturally consistent. No compromises on quality.

## Development Workflow & Quality Gates

- CI pipeline steps (blocking): install → lint → type-check → tests → build.
- ESLint and Prettier are REQUIRED; no warnings permitted in production.
- Pull requests modifying architecture, security, or critical services must
  include tests, documentation updates, and a brief migration plan if needed.

## Governance

All constitutional amendments MUST follow this procedure:

- Propose change via a documented PR referencing the Constitution and the
  reason for change.
- Include an explicit migration plan and tests for any behavioral changes.
- Approval requires at least two reviewers, one of whom must be a
  repository maintainer.
- Versioning policy: semantic versioning for the constitution itself:
  - MAJOR when removing or redefining non-backwards-compatible principles.
  - MINOR when adding a principle or materially expanding guidance.
  - PATCH for wording clarifications, typos, or non-semantic refinements.

**Version**: 1.0.0 | **Ratified**: 2026-03-01 | **Last Amended**: 2026-03-01
```

- Server-side webhook verification is MANDATORY. Never trust client-only
