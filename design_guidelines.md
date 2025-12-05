# Design Guidelines: Savings Goal Tracker App

## Architecture Decisions

### Authentication
**No Authentication Required**
- This is a single-user, local-first utility app
- All data stored locally via AsyncStorage
- Include a **Settings screen** with:
  - User display name field (e.g., "Мой профиль" / "My Profile")
  - App preferences (notifications settings, backup options)
  - About section

### Navigation Structure
**Tab Navigation** (3 tabs)
- **Goals** (Цели): Home screen showing all savings goals
- **History** (История): Complete transaction history across all goals
- **Settings** (Настройки): App settings and preferences

Each goal detail screen opens as a stack screen from the Goals tab.

### Screen Specifications

#### 1. Goals Screen (Home)
- **Purpose**: Display all active savings goals with quick overview
- **Layout**:
  - Transparent header with title "Мои цели"
  - Main content: Scrollable list of goal cards
  - Floating Action Button (FAB) for creating new goal (bottom-right)
  - Top safe area inset: headerHeight + 24px
  - Bottom safe area inset: tabBarHeight + 24px
- **Components**:
  - Goal cards showing: goal name, target amount, current amount, mini progress indicator
  - Empty state with illustration when no goals exist
  - FAB with "+" icon

#### 2. Goal Detail Screen
- **Purpose**: View detailed progress, add contributions, manage goal
- **Layout**:
  - Default navigation header (non-transparent) with back button, goal name, edit button (right)
  - Scrollable content with sections
  - Top safe area inset: 16px
  - Bottom safe area inset: insets.bottom + 24px
- **Components**:
  - Large circular progress chart at top (showing percentage)
  - Current amount / Target amount display
  - Remaining amount card
  - "Add Contribution" button (prominent, full-width)
  - Recent contributions list (last 5 entries with "See all" link)
- **Interactions**:
  - Pull-to-refresh to update data
  - Tap card to expand details
  - Edit button opens edit goal modal

#### 3. Add/Edit Contribution Modal
- **Purpose**: Record new savings contribution
- **Layout**:
  - Native modal presentation (slides up from bottom)
  - Form with submit/cancel in header
  - Top safe area inset: insets.top + 16px
  - Bottom safe area inset: insets.bottom + 16px
- **Components**:
  - Amount input (large, prominent number pad)
  - Date picker (defaults to today)
  - Optional note field
  - Delete button (for edit mode only, bottom of form)
  - Save button (header right)

#### 4. History Screen
- **Purpose**: View all contributions across all goals
- **Layout**:
  - Transparent header with title "История" and filter button (right)
  - Scrollable list grouped by date
  - Top safe area inset: headerHeight + 24px
  - Bottom safe area inset: tabBarHeight + 24px
- **Components**:
  - Section headers by date (Сегодня, Вчера, dates)
  - Transaction cards with: amount, goal name, time, optional note
  - Pull-to-refresh
  - Empty state for no history

#### 5. Settings Screen
- **Purpose**: Configure app preferences
- **Layout**:
  - Transparent header with title "Настройки"
  - Scrollable form/list
  - Top safe area inset: headerHeight + 24px
  - Bottom safe area inset: tabBarHeight + 24px
- **Components**:
  - User profile section (display name)
  - Notifications toggle
  - Theme options (future-proof, currently dark only)
  - Data management (export, clear data with confirmation)
  - About section (app version, credits)

## Design System

### Color Palette (Dark Theme)
**Primary Colors:**
- Background: `#0F0F0F` (deep black)
- Surface: `#1A1A1A` (elevated surfaces, cards)
- Surface Variant: `#242424` (secondary surfaces)

**Accent Colors:**
- Primary: `#6C63FF` (vibrant purple for CTAs and progress)
- Primary Light: `#8C84FF` (hover states)
- Success: `#4CAF50` (positive feedback, goal completion)
- Warning: `#FFA726` (alerts, important notices)
- Error: `#EF5350` (destructive actions)

**Text Colors:**
- Primary Text: `#FFFFFF` (100% white for headings)
- Secondary Text: `#B0B0B0` (70% opacity for body text)
- Disabled Text: `#707070` (44% opacity)

**Borders & Dividers:**
- Border: `#2A2A2A` (subtle separation)
- Divider: `#1F1F1F` (section dividers)

### Typography
**Font Family:** System default (Roboto on Android)

**Scale:**
- **Hero:** 48px, weight 700 (large progress percentage)
- **H1:** 32px, weight 700 (screen titles)
- **H2:** 24px, weight 600 (section headers)
- **H3:** 20px, weight 600 (card titles)
- **Body Large:** 18px, weight 400 (amounts, important data)
- **Body:** 16px, weight 400 (regular text)
- **Caption:** 14px, weight 400 (secondary info, dates)
- **Small:** 12px, weight 400 (labels, hints)

### Spacing System
- **XS:** 4px
- **S:** 8px
- **M:** 16px
- **L:** 24px
- **XL:** 32px
- **XXL:** 48px

### Component Specifications

#### Cards
- Background: Surface color `#1A1A1A`
- Border radius: 16px
- Padding: 20px
- No drop shadow (flat design)
- Subtle border: 1px solid `#2A2A2A`
- Press state: Opacity 0.8, scale 0.98

#### Buttons
**Primary Button (FAB, CTAs):**
- Background: Primary color `#6C63FF`
- Text: White
- Border radius: 16px (standard buttons), 56px (FAB)
- Height: 56px (standard), 56px diameter (FAB)
- Font: Body Large, weight 600
- Press state: Background `#8C84FF`, scale 0.96
- FAB shadow (EXACT specs):
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2

**Secondary Button:**
- Background: Surface Variant `#242424`
- Text: White
- Border radius: 16px
- Height: 56px
- Press state: Opacity 0.7

**Text Button:**
- Background: Transparent
- Text: Primary color
- Press state: Opacity 0.7

#### Progress Indicators
**Circular Progress Chart:**
- Size: 200px diameter
- Stroke width: 16px
- Background track: `#242424`
- Progress track: Primary color `#6C63FF` with gradient overlay
- Percentage text inside: Hero typography
- Animate on mount (0 to value over 800ms, easeOut)

**Linear Progress Bar:**
- Height: 8px
- Border radius: 4px
- Background: `#242424`
- Fill: Primary color
- Animate on update (smooth transition 400ms)

#### Input Fields
- Background: Surface Variant `#242424`
- Border: 1px solid `#2A2A2A`
- Active border: 2px solid Primary color
- Border radius: 12px
- Padding: 16px
- Font: Body
- Placeholder: Disabled Text color

### Visual Feedback
**All touchable elements must provide feedback:**
- Buttons: Scale animation (0.96-1.0)
- Cards: Opacity change (1.0-0.8) on press
- List items: Background color change on press (`#1F1F1F`)

### Animations
**Transitions:**
- Screen transitions: Slide (300ms, easeInOut)
- Modal presentation: Slide from bottom (400ms, easeOut)
- Component mount: Fade in (200ms)

**Micro-interactions:**
- Progress updates: Spring animation (stiffness: 100, damping: 15)
- FAB press: Scale bounce
- Success actions: Subtle check mark animation

### Icons
- Use **MaterialCommunityIcons** from @expo/vector-icons
- Icon size standard: 24px
- Icon color: Match text hierarchy
- Key icons needed:
  - `target` (goals)
  - `plus` (add)
  - `history` (history)
  - `cog` (settings)
  - `pencil` (edit)
  - `delete` (remove)
  - `check-circle` (success)
  - `currency-rub` (currency, if needed)

### Accessibility
- Minimum touch target: 44x44px
- Contrast ratio: WCAG AA compliant (4.5:1 for text)
- All interactive elements have accessible labels
- Support for screen readers
- Haptic feedback on important actions (goal creation, contribution added)

### Assets
**No custom illustrations needed.** Use system icons and generated UI elements (progress charts, graphs).