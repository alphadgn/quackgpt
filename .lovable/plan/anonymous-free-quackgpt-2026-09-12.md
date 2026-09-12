# Anonymous Free QuackGPT

## Goal
Turn QuackGPT into an account-free, free-to-use Ugly Duck Society assistant. Remove sign-in, profiles, wallets, subscriptions, tiers, quotas, saved account history, and all identity-linked backend records. Keep a basic short-window IP limit against automated abuse.

## User experience
- Open directly into the working assistant with no sign-in or sign-up controls.
- Keep Search, Quack Check, and Verify text available to every visitor.
- Remove account, profile, plan, wallet, subscription, usage-counter, logout, settings, and admin-user interfaces.
- Use browser-local conversation history only, so no identity or conversation is saved to the backend.
- Keep the evidence-only Ugly Duck Society scope, citations, timestamps, and fail-closed responses unchanged.

## Visual changes
- Replace the current app background with the uploaded black-clad Ugly Duck Society character image, framed responsively for phone and desktop.
- Replace both circled duck logos—the header mark and large welcome mark—with the uploaded white skull-duck artwork.
- Preserve the `quackGPT` wordmark beside the new artwork.
- Replace the yellow/gold theme with the artwork’s orange across text, controls, borders, focus states, glows, and accents while preserving accessible contrast.

## Backend and data removal
- Make the public chat, retrieval, and text-verification functions anonymous; remove Privy token checks, profiles, tiers, account quotas, account history writes, and identity fields.
- Preserve origin checks, input validation, official-source filtering, evidence sanitization, fail-closed behavior, and short per-IP request limits.
- Permanently delete all identity-linked data: profiles, roles, app users, usage records, NFT bindings, chat history, feedback, and saved text verifications.
- Remove the account-related tables, triggers, database functions, and avatar storage bucket through an additive destructive migration.
- Delete account-only functions for profiles, account administration, subscriptions, checkout, billing portal, usage, NFT verification, feedback, and chat history.
- Retain source ingestion, indexed evidence, official-source administration needed for operations, scheduled ingestion, and security monitoring. Remove their dependencies on visitor accounts; operational access remains backend-only.
- Remove unused Privy, wallet, chain, and payment frontend packages and secrets where they are no longer required.

## Technical details
- Simplify the app provider tree and routes; remove account/settings/admin-user pages and hooks.
- Replace tier-aware message/input types with one anonymous response limit suitable for normal ChatGPT-style use.
- Store current-device history locally with a clear-history action; never send it to the backend.
- Upload the supplied images through the project asset service and reference their asset pointers.
- Update security scanning so it audits the remaining anonymous architecture rather than deleted account tables.

## Verification
- Test anonymous Search, Quack Check, and Verify text end to end without any token.
- Confirm account routes, controls, account network calls, identity tables, and account-only functions are gone.
- Confirm the background and both logo placements on mobile and desktop.
- Run unit tests, type checks, security checks, database checks, and the production build.
- Re-scan source and visible text for sign-in, sign-up, account, profile, wallet, subscription, tier, Privy, and stale yellow theme references.

## Permanent impact
This deletes all existing account-linked records and saved user activity. It cannot preserve or restore those records after the migration runs.
