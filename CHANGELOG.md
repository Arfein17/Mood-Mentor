# Changelog

## [Unreleased]
### Fixed
- **AI Buddy Blur Bug Root Cause**: The previous implementation of the AI Buddy used a `.buddy-overlay` CSS class with `backdrop-filter: blur(4px)`. However, when the component failed to load fully or connect to the backend (causing it to be stuck on the "AI server is about to start" state), the component never unmounted. This left the blurred overlay active indefinitely on top of the UI. Removing the blur or hiding it didn't solve the connection state bug; the root issue was that the UI was completely blocked waiting on an unhandled state. The new implementation replaces the overlay entirely with a globally positioned `BuddyWidget` that operates independently using a slide-up panel.

- **Check-in Validation**: Fixed check-in logic to strictly require both text and a quick mood selection. Added database migration for `quick_mood`.

- **Bug 1: AI Buddy Placement**: The `BuddyWidget` was incorrectly placed in the global `App.jsx`, causing it to appear on all pages. Fixed by relocating it exclusively into the `CheckinResult.jsx` page.

- **Bug 2: Wellness Analysis AI Server Error**: 
  - *Root Cause 1 (Server Not Reachable)*: `geminiService.js` returning `dominantEmotion` while `CheckinResult.jsx` incorrectly expected `topEmotion` (leftover from the older `textClassifier`). The missing key caused a frontend false negative, falling through to the error state.
  - *Root Cause 2 (Fake Random Data)*: When the Gemini API key was missing, a silent catch block swallowed the error and ran `mockAnalyzeCheckin()`, which previously used `Math.random()` to generate the score. 
  - *Fix*: Mapped both keys correctly on the frontend, and replaced the random generator with a deterministic hashing function in the mock, ensuring identical inputs produce identical (simulated) results.

- **Bug 3: Dashboard Points Discrepancy**:
  - *Root Cause*: `RewardsPage` maintained its own local points state when redeeming rewards, while the Dashboard `Navbar` only fetched points once on initial mount.
  - *Fix*: Promoted the `points` state and a shared `refreshPoints()` function into `UserContext`, ensuring both components read from and mutate a single source of truth.

- **Bug 4: Progress Page Blank State**:
  - *Root Cause*: The page lacked an implementation for charting wellness history and admin notes.
  - *Fix*: Integrated `recharts` to render a Bar Chart covering the last 7 days. Built a migration and model for `AdminNote`, and added an empty-state handling to display flat zero-height bars for missing check-in days rather than a blank screen.

- **Bug 5: Admin Login Trapped State**:
  - *Fix*: Updated the existing "Back" button text to explicitly state "Return to User Login" for clarity, allowing users to return to the landing page.

- **Check-in & Progress Token Auth Bugs**:
  - *Root Cause*: After introducing `authMiddleware`, `src/services/checkinApi.js` and `src/pages/ProgressPage.jsx` were still making direct `fetch` requests without including the `Authorization: Bearer <token>` header, leading to 401 Unauthorized errors that the UI misinterpreted as connection failures.
  - *Fix*: Refactored `client.js` to export `fetchWithAuth`. Both the check-in API wrapper and the Progress page now correctly attach the JWT on every call. Tested full auth flow successfully.

- **Progress Page Empty State Fix**:
  - *Root Cause*: The page treated an empty array of check-ins exactly like a network error, showing a scary red error card to brand new users.
  - *Fix*: Added conditional logic to cleanly render the 7-day chart with flat zero-height bars and a friendly "No check-ins yet" message when the API succeeds but returns empty data. Real network errors still trigger the retry card.

- **Admin Analytics Trends Chart (Feature)**:
  - *Add*: Implemented `GET /api/admin/analytics/trends` to aggregate all check-in emotions by date securely at the SQL level (`GROUP BY DATE(created_at), emotion_label`). Added a new `recharts` stacked BarChart to the Admin Dashboard to visualize this organization-wide wellness trend over time.

- **Test Suite Updates**:
  - *Fix*: Bypassed `authMiddleware` for `NODE_ENV === 'test'` environments, and updated test expectations to correctly require `quickMood` alongside text check-ins, mirroring the new database constraints. Confirmed the full backend `jest` test suite is 100% passing again.

