---
description: Full QA testing checklist for the CORE trading app
---
// turbo-all

# CORE App — Full QA Testing Checklist

## Prerequisites
- App running via `npm run electron:dev`
- A fresh email you can access for testing (e.g. use a `+alias` like `you+test@gmail.com`)
- Your Supabase dashboard open at https://supabase.com/dashboard (to monitor user creation and email confirmation settings)

---

## PHASE 1: Fresh Account Setup

### 1.1 — Sign Out of Current Account
1. Go to **Settings** → scroll to **Account** section
2. Click **Sign Out**
3. ✅ Verify: You're redirected to the Auth page with the CORE logo and animated background

### 1.2 — Register a New Account
1. Click the **Register** tab
2. Fill in:
   - **Display Name**: `TestTrader`
   - **Email**: Use a fresh email (e.g. `yourname+coretest@gmail.com`)
   - **Password**: `Test123!` (min 6 characters)
3. Click **Create Account**
4. ✅ Verify: Green success message appears: "Account created! Check your email to confirm, then log in."
5. **Check your email** for the Supabase confirmation link
   - If email confirmation is disabled in Supabase, you can skip this step
   - **Supabase Dashboard** → Authentication → Providers → Email → "Confirm email" toggle
6. Click the confirmation link in the email
7. Back in the app, switch to **Sign In** tab
8. Enter the same email + password → Click **Access Terminal**
9. ✅ Verify: Loading spinner shows, then you proceed to Onboarding

### 1.3 — Onboarding Wizard
1. The Onboarding Wizard should appear automatically for new accounts
2. Complete each step of the wizard (setting your trader profile, goals, etc.)
3. ✅ Verify: After completing onboarding, the App Tutorial starts

### 1.4 — App Tutorial
1. Walk through the tutorial steps
2. ✅ Verify: After completing the tutorial, you land on the main **Journal Overview** dashboard
3. ✅ Verify: The dashboard shows empty state (no trades, no accounts yet)

---

## PHASE 2: Core Functionality

### 2.1 — Create Your First Account
1. The app should prompt you to create an account (or find the account creation flow)
2. Create a test account:
   - **Name**: `Test Prop Firm`
   - **Type**: `Evaluation` (or `Funded`)
   - **Balance**: `100000`
   - **Capital**: `100000`
   - **Currency**: `USD`
   - Set a **Profit Target** if applicable
3. ✅ Verify: Account card appears in the sidebar/dashboard

### 2.2 — Log Your First Trade
1. Click the **+ New Trade** button (or use keyboard shortcut)
2. Fill in a sample trade:
   - **Date**: Today
   - **Symbol**: `EURUSD`
   - **Account**: Select your test account
   - **Side**: `Long`
   - **Entry Signal**: Pick one
   - **SL Pips**: `15`
   - **Risk %**: `1`
   - **PnL**: `250` (a winning trade)
   - **Psychology**: Leave blank (tests emotional stability score)
3. Save the trade
4. ✅ Verify: Trade appears in the Journal
5. ✅ Verify: Account balance updates

### 2.3 — Log a Losing Trade
1. Create another trade:
   - **Symbol**: `GBPUSD`
   - **PnL**: `-100`
   - **Psychology**: `FOMO entry, revenge trade` (this tests the mastery matrix emotional stability penalty)
2. ✅ Verify: Trade appears, account updated

### 2.4 — Log a Trade Without SL/Risk (tests mastery gaps)
1. Create a third trade:
   - **Symbol**: `USDJPY`
   - **PnL**: `50`
   - Leave **SL Pips** and **Risk %** empty
3. ✅ Verify: This will lower Risk Neutralization and Position Sizing mastery scores

---

## PHASE 3: Views & Components

### 3.1 — Journal Overview
1. Navigate to **Journal** (sidebar)
2. ✅ Verify: All 3 trades are listed
3. ✅ Verify: Stats bar shows correct win rate (2/3 = 66.7%)
4. ✅ Verify: Date filter works (try filtering to a different week/month)
5. Click a trade card → ✅ Verify: Edit modal opens with correct data
6. Try editing a trade and saving

### 3.2 — Analytics
1. Navigate to **Analytics** (sidebar)
2. ✅ Verify: Charts render with data from your trades
3. ✅ Verify: Account filter dropdown works
4. ✅ Verify: No empty/broken charts

### 3.3 — Calendar
1. Navigate to **Calendar** (sidebar)
2. ✅ Verify: Today's date shows your trades
3. Click a day with trades → ✅ Verify: Trade details show with colored pills for entry signals
4. ✅ Verify: Win rate displays in the header

### 3.4 — Copy Cockpit
1. Navigate to **Copy Cockpit** (sidebar)
2. Create a copy group if applicable
3. ✅ Verify: Feature loads without errors

### 3.5 — Profile
1. Navigate to **Profile** (click your name at bottom of sidebar)
2. ✅ Verify: **Rank & XP** display correctly (you should have some XP from 3 trades)
3. ✅ Verify: **Mastery Matrix** shows real data:
   - Strategy Consistency: Should reflect how consistent your entry signals were
   - Risk Neutralization: ~66% (2 of 3 trades had SL)
   - Emotional Stability: Should be penalized (1 trade had "FOMO" + "revenge")
   - Position Sizing: ~66% (2 of 3 trades had risk %)
4. ✅ Verify: **Tactical Grade** shows realistic grades (not hardcoded)
5. ✅ Verify: **Quest Log** — try toggling a goal complete/incomplete
6. Click **Edit Profile** → ✅ Verify: Modal opens centered, scrollable body
7. Try adding/removing quest log goals in edit mode

### 3.6 — Settings
1. Navigate to **Settings** (sidebar)
2. ✅ Verify: Sound toggle works
3. ✅ Verify: Keyboard shortcut toggle works
4. ✅ Verify: Export CSV works (check downloaded file)
5. ✅ Verify: Account card shows your email and display name

---

## PHASE 4: Account Management (Right-Click Menu)

### 4.1 — Change Display Name
1. In **Settings**, **right-click** on the Account card
2. ✅ Verify: Context menu appears with 3 options
3. Click **Change Display Name**
4. ✅ Verify: Modal appears with input field
5. Type a new name → press **Enter** or click **Confirm**
6. ✅ Verify: Success notification, name updates in sidebar

### 4.2 — Change Password
1. Right-click Account card → **Change Password**
2. ✅ Verify: Modal shows 3 fields:
   - Current Password (autofocused)
   - New Password
   - Confirm New Password
3. Test with **wrong** current password → ✅ Verify: Error "Current password is incorrect"
4. Test with correct current password but **mismatched** new passwords → ✅ Verify: Error "New passwords do not match"
5. Test with correct current password + matching new passwords (min 6 chars) → ✅ Verify: Success "Password changed successfully"
6. **Sign out**, then sign back in with the **new** password to confirm it works

### 4.3 — Forgot Password
1. Right-click Account card → **Change Password**
2. Click **"Forgot Password? Send reset email →"**
3. ✅ Verify: Loading spinner, then success "Password reset email sent"
4. Check your email for the Supabase password reset link

### 4.4 — Change Email
1. Right-click Account card → **Change Email**
2. ✅ Verify: Modal shows:
   - Info banner mentioning verification sent to current email (your email shown in bold)
   - Input for new email
3. Enter a new email → Click **Send Verification**
4. ✅ Verify: Success "Verification email sent — check your inbox to confirm"
5. ⚠️ **Note**: Supabase sends emails to BOTH old and new addresses. Both must be confirmed.

---

## PHASE 5: Edge Cases & Empty States

### 5.1 — Auth Edge Cases
- [ ] Try registering with an already-used email → should show error
- [ ] Try logging in with wrong password → should show error
- [ ] Try registering with password < 6 chars → should show error
- [ ] Try registering without display name → should show error

### 5.2 — Empty States
- [ ] Delete all trades → Journal should show empty state gracefully
- [ ] Delete all accounts → Dashboard should handle no accounts
- [ ] Profile with 0 trades → Mastery Matrix should show 0%, Tactical Grade should show "Unranked / No Data"

### 5.3 — Rapid Actions
- [ ] Double-click save buttons rapidly → should not create duplicate trades
- [ ] Open and close modals rapidly → no visual glitches
- [ ] Switch views quickly via sidebar → no flashing or broken states

### 5.4 — Data Persistence
- [ ] Close the app completely (Cmd+Q) and reopen → all data should be intact
- [ ] Sign out and sign back in → cloud-synced data should load

---

## PHASE 6: Supabase Setup Verification

### 6.1 — Check Supabase Dashboard
1. Go to https://supabase.com/dashboard → select your project
2. **Authentication** → **Users**
   - ✅ Verify: Your test user appears
   - ✅ Verify: `display_name` is set in user metadata
3. **Table Editor** → Check tables:
   - `trades` table → ✅ Verify: Your test trades are stored
   - `accounts` table → ✅ Verify: Your test account is stored
4. **Authentication** → **Providers** → **Email**:
   - Check "Enable email confirmations" — toggle on/off based on your preference
   - If OFF: Users can sign up and immediately log in (easier for testing)
   - If ON: Users must click email link first (more secure for production)

### 6.2 — Row Level Security (RLS)
1. **Table Editor** → Click any table → **RLS** tab
2. ✅ Verify: RLS is **enabled** on all tables
3. ✅ Verify: Policies exist so users can only read/write **their own** data
   - Example policy: `auth.uid() = user_id`

---

## Quick Reference: Keyboard Shortcuts (if enabled in Settings)

| Shortcut | Action |
|----------|--------|
| `Cmd + N` | New Trade |
| `Escape` | Close modal |
| Number keys | Switch views |

---

## ✅ Testing Complete Checklist Summary

- [ ] Fresh account registration works
- [ ] Email confirmation flow works
- [ ] Onboarding wizard completes
- [ ] App tutorial completes
- [ ] Account creation works
- [ ] Trade logging works (win/loss/no SL)
- [ ] All 6 views render correctly
- [ ] Profile Mastery Matrix shows real data
- [ ] Profile Tactical Grade shows real grades
- [ ] Quest Log toggle works
- [ ] Settings right-click menu works
- [ ] Change display name works
- [ ] Change password (with current password verification) works
- [ ] Forgot password sends reset email
- [ ] Change email shows verification flow
- [ ] Edge cases handled gracefully
- [ ] Data persists after restart
- [ ] Supabase RLS is enabled
