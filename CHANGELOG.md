# Changelog

## [Unreleased]

### Added
- **Upgraded Mini-Games Suite (Sliding Number Puzzle, Zen Sand Garden, Combos, Difficulty)**:
  - Replaced "Focus Flow" with **Sliding Number Puzzle** (`SlidingPuzzle.jsx`): guaranteed solvable board generation, 3x3 (Quick) and 4x4 (Classic 15) difficulty toggle, move/time tracking, keyboard arrow key navigation, and Mode Points award on completion.
  - Replaced "Color Zen Maze" with **Zen Sand Garden** (`ZenSandGarden.jsx`): interactive HTML5 Canvas with parallel multi-prong wave raking, authentic sand texturing, smooth sand clearing, stone placement, and completion points trigger.
  - Upgraded **Bubble Pop** (`BubblePop.jsx`): rapid pop combo streak counter with dynamic banners (`Combo x3! 🔥`, `Mega x7! ⚡`), pop wave ripple animations, and combo point bonuses.
  - Upgraded **Memory Match** (`MemoryMatch.jsx`): interactive difficulty selector supporting Easy (3x4 - 12 cards), Medium (4x4 - 16 cards), and Hard (4x6 - 24 cards) with expanded 12-icon set and dynamic responsive grid layout.
  - Updated `GamesBox.jsx` and `Games.css` to register the new 5 games and integrate with the daily 10 MP cap. Removed deprecated `FocusFlow.jsx` and `ColorZenMaze.jsx`.
- **Opt-In User Reflections (Replaced Department Predictive Alerts)**:
  - Replaced the department predictive alerts section in `AdminDashboard.jsx` with an anonymized, privacy-gated user reflections card.
  - Strictly consent-gated at the SQL/Sequelize level: queries perform an `INNER JOIN` on `users` with `consent_to_aggregate = true`. Check-ins from non-consenting users are never retrieved or transmitted.
  - Complete PII stripping: endpoints and frontend DTOs strictly expose `display_name` (falling back to `'Anonymous Peer'`). Real `employee_or_student_id`, database IDs, and auth credentials are systematically excluded.
  - Designed modern glassmorphism reflection cards with emotion badges, wellness scores, and timestamps.
  - Created automated Jest tests in `server/tests/adminReflections.test.js` verifying consent isolation and zero PII leakage.

### Added
- **Daily Game Points Cap (10 MP/Day)**:
  - Enforced a server-side daily cap of 10 Mode Points per user for mini-games (`reason = 'mini_game_played'`) in `server/routes/points.js`.
  - Calculates today's points in UTC using `created_at` date boundaries. If today's total is at or above 10, no further game points are awarded while games remain playable for fun.
  - Supports partial awards up to the cap (e.g. 8 points already awarded + 5 requested => awards remaining 2 points).
  - Explicitly isolates non-game point sources (check-ins, challenges, recommendations), ensuring they are completely unaffected by the cap.
  - Added frontend feedback banner in `GamesBox.jsx` and `Games.css` showing friendly notice when the cap is reached: *"You've hit today's game points cap (10/10) — nice session! Points reset tomorrow."*
  - Added automated Jest test suite in `server/tests/gamePointsCap.test.js` covering repeated awards past cap, partial awards, non-game point independence, and next-day cap reset.

### Fixed
- **AI Wellness Buddy Repetitive Music Suggestions & Gemini LLM Integration**:
  - *Root Cause Confirmed*: The previous music suggestion logic in `server/services/geminiService.js` was built around a static, hardcoded lookup table mapping each mood to a single fixed genre and link (`if (userEmotion === 'Happy') return ...; if (userEmotion === 'Sad' || userEmotion === 'Stressed') return ...`). Consequently, every check-in with the same mood was deterministic and returned the verbatim same suggestion. Furthermore, the previous LLM path targeted `gemini-2.5-flash` (scheduled for retirement in October 2026) and lacked anti-repetition instructions or conversation-history awareness.
  - *Fix*:
    - Installed `@google/generative-ai` in `/server` and created dedicated service `server/services/buddyChat.js`.
    - Integrated Google Gemini with primary auto-updating model identifier `gemini-flash-latest` and automatic fallback to `gemini-3.5-flash` (avoiding all `gemini-2.5-*` legacy models). In our tests, `gemini-3.5-flash` was selected as the active serving model due to upstream 503 high-demand on `gemini-flash-latest`.
    - Completely eliminated the static mood-to-genre lookup table.
    - Engineered dynamic system prompts incorporating user emotion, wellness score, trend, and the last 3-5 bot messages with an explicit `STRICT ANTI-REPETITION MANDATE` preventing repeating genres, phrases, games, or links.
    - Instructed model to dynamically generate external search links from whatever musical vibe it invents (e.g. `[genre](https://open.spotify.com/search/...)`), and naturally rotate across music, the 5 mini-games (Breathing Bubble, Bubble Pop, Sliding Puzzle, Memory Match, Zen Sand Garden), mindfulness exercises, and motivational check-ins.
    - Updated `BuddyWidget.jsx` greeting templates to replace obsolete game names with `Zen Sand Garden`.
    - Added graceful in-chat error handling providing friendly wellness responses if the Gemini API key is missing or invalid, preventing 500 errors or app freezes.
    - Updated `.env.example` with `GEMINI_API_KEY=`.
    - Added comprehensive automated test suite `server/tests/buddyChat.test.js` covering multi-session variety, sequential music variation, graceful invalid-key fallbacks, and prompt anti-repetition injection.

- **Browser Autofill Dark Theme Override**:
  - *Root Cause*: When browsers (Chrome, Edge, Safari) autofilled previously entered IDs or credentials, the browser's default `:-webkit-autofill` pseudo-class forced a bright white/light-blue background and dark text on input elements, breaking the dark theme and making text illegible.
  - *Fix*: Added a global autofill override to `src/index.css` applying `-webkit-box-shadow: 0 0 0px 1000px #131927 inset !important;`, `-webkit-text-fill-color: #ffffff !important;`, and `caret-color: #ffffff !important;` across all input, select, and textarea fields. Also added `overflow: hidden;` to `.admin-input-wrapper` in `src/pages/AdminLogin.css` to ensure seamless border-radius clipping.

- **Signup Flow Redirect to Login (No Auto-Login)**:
  - *Root Cause / Previous Behavior*: Creating a new account automatically issued a JWT session token in `POST /api/auth/signup` and logged the user directly into the app dashboard via `LoginSignup.jsx`.
  - *Fix*:
    - Updated backend endpoint `POST /api/auth/signup` in `server/routes/auth.js` to create the account and hashed password as normal, but without issuing or returning a JWT token.
    - Updated `LoginSignup.jsx` so that after a successful signup response, the user is navigated to the Login tab with a green confirmation banner: *"Account created! Please log in with your new ID and password."* No JWT or user object is set or stored in client `localStorage` or `UserContext`.
    - The user must manually enter their ID and password on the Login form to authenticate and obtain their session token.
    - Added automated test suite `server/tests/authSignup.test.js` verifying token absence on signup, database persistence with bcrypt password hashing, and successful subsequent login.

- **Admin Dashboard Header Layout & Back Navigation**:
  - *Root Cause*: The Admin Dashboard rendered an awkward floating `.admin-back-btn` inside the scrollable content area that overlapped layout elements and caused inconsistent header positioning.
  - *Fix*: Extended `Navbar.jsx` to accept `showBack` and `onBack` props, grouping the Brand and a pill-style Back button cleanly in `.navbar-left` with intentional spacing. Removed the rogue in-page back button and updated `AdminDashboard.css` and `App.jsx` for seamless back-navigation to the dashboard or landing view.
- **Broadcast Wellness Suggestion & Delivery to User Mentor Notes**:
  - *Root Cause 1*: The frontend broadcast form executed an unauthenticated raw `fetch()` to `/api/admin/suggestions`, failing `requireAdmin` with 401 Unauthorized and swallowing the error in a generic catch block.
  - *Root Cause 2*: The backend attempted to call `.create()` on `AdminSuggestion`, which was not defined in `server/models/`. Furthermore, the `admin_notes` database table lacked a `department` column and enforced `user_id NOT NULL`.
  - *Root Cause 3*: `GET /api/admin/admin-notes/:userId` strictly required admin privileges (`requireAdmin`), preventing regular authenticated employees from reading mentor notes on their Progress page.
  - *Fix*:
    - Created Sequelize model `AdminNote` (`server/models/adminnote.js`) and database migration `20260915180000-add-department-to-admin-notes.js` adding nullable `department` and allowing nullable `user_id`.
    - Updated `POST /api/admin/broadcast` (and legacy alias `POST /api/admin/suggestions`) to accept `{ message, department }` and insert into `AdminNote`.
    - Updated `GET /api/admin/admin-notes/:userId` to use `requireAuth` and allow both admins and the specific user to view personal notes, global broadcasts (`department IS NULL OR department = 'ALL'`), and matching department broadcasts.
    - Updated `AdminDashboard.jsx` with a department target dropdown, loading state, inline feedback banners, and async dispatch via `broadcastAdminSuggestion`.

- **AI Buddy Intelligence Upgrades**: 
  - **Context-Aware Initial Greeting**: The BuddyWidget now automatically greets the user with a tailored message based on their detected emotion (Happy, Calm, Stressed, Anxious, Frustrated, Sad) the first time it is opened after a check-in.
  - **Deep Context Passing**: The backend now fetches the user's latest emotion, wellness score, and 5-day trend, and passes this context directly to the Gemini LLM system prompt.
  - **Proactive Empathy & Suggestions**: The LLM system prompt has been updated with safety-first guidelines. The Buddy now proactively recommends built-in mini-games (e.g., Breathing Bubble, Bubble Pop) for frustration and stress.
  - **Music Recommendations via External Links**: The Buddy now recommends music genres/moods rather than hardcoding songs, automatically providing clickable Markdown links out to Spotify or YouTube Music searches.
- **Profile Feature**: Added a comprehensive profile page allowing users to view and update their personal details.
  - Custom user avatars (upload a photo or pick from 12 pre-generated SVGs).
  - Editable display name and department/role.
  - Password change functionality with current password verification.
  - Notification preference toggle for daily check-in reminders.
  - Privacy control toggle (`consent_to_aggregate`) to include or exclude user data from aggregated admin analytics.
  - Global `ProfileIcon` added to the top-right corner of all authenticated pages.
- **Admin Analytics Update**: Modified admin analytics and trend queries to respect the `consent_to_aggregate` setting, ensuring privacy-first data handling.
- Added API endpoints: `GET /api/profile/:userId`, `PUT /api/profile/:userId`, and `PUT /api/profile/:userId/password`.
- Generated 12 diverse vector avatars placed in `/src/assets/avatars/`.

### Fixed
- **AI Buddy Blur Bug Root Cause**: The previous implementation of the AI Buddy used a `.buddy-overlay` CSS class with `backdrop-filter: blur(4px)`. However, when the component failed to load fully or connect to the backend (causing it to be stuck on the "AI server is about to start" state), the component never unmounted. This left the blurred overlay active indefinitely on top of the UI. Removing the blur or hiding it didn't solve the connection state bug; the root issue was that the UI was completely blocked waiting on an unhandled state. The new implementation replaces the overlay entirely with a globally positioned `BuddyWidget` that operates independently using a slide-up panel.

- **AI Buddy Widget API Error**: Fixed a critical 500 server error occurring when the user attempted to open or chat with the AI Buddy on the Wellness Analysis page. **Root Cause:** The `BuddyConversation` and `BuddyMessage` Sequelize models were completely missing from the `server/models/` directory, causing a `TypeError: Cannot read properties of undefined (reading 'findOne')` when the backend attempted to fetch conversation history in `routes/buddy.js`. The tables existed in the database via migrations, but the ORM definitions were missing. Recreated the model files and successfully attached the widget to the Wellness Analysis page.

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

- Updated avatar presets to a new set of 6 local memo character avatars. If an existing user had an old preset_N.svg selected, the application gracefully falls back to displaying a neutral default User icon until they select a new avatar. 
- Fixed critical restart/reload login failure. The root cause was not a destructive sync, but rather that the password_hash column was entirely missing from the Sequelize User model definition in server/models/user.js. As a result, Sequelize silently stripped the password hash during user creation and profile updates, leaving it null in the database. Added password_hash: DataTypes.STRING to the model to ensure genuine bcrypt hashes are successfully persisted. 
- Hardened Auth: Added graceful error handling for duplicate account signups. The signup route now catches SequelizeUniqueConstraintError from the database's unique constraint on employee_or_student_id and returns a clear message instructing the user to log in. 
