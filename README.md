# Infinity X Enterprise Cloud Portal — Week 01

Frontend internship deliverables for **Infinity X Solutions**, built with Next.js App Router (v16) and TypeScript. This document covers all tasks completed in Week 1:

- **Task 01** — App Router architecture & dynamic portal layout system
- **Task 02** — Headless, high-performance virtualized data grid
- **Task 03** — Multi-step provisioning wizard with a generic workflow engine
- **Task 04** — Real-time telemetry stream & resilient optimistic UI engine
- **Task 05** — Enterprise Component Library Architecture & Design Token Engine
- **Task 06** — Frontend Resilience Architecture & Core Web Vitals Audit

---

# Task 01 – Next.js App Router Architecture & Dynamic Portal Layout System

## Overview

Task 01 builds the core layout engine for the Infinity X Enterprise Cloud Portal: a multi-tenant dashboard shell with a collapsible sidebar, workspace-scoped routing, streaming server-rendered metrics, and a resource-inspection drawer that behaves differently depending on how the user navigates to it (in-app click vs. direct URL).

The central engineering constraint was strict separation between **React Server Components** (data fetching, layout structure) and **Client Components** (the small, interactive leaves — dropdowns, toggles, drawers) — with zero layout shift and zero hydration mismatches.

## Features

- Collapsible, accessible sidebar navigation (icon-only ⇄ expanded label modes)
- Server-persisted sidebar state via cookie — no flash of incorrect layout on load
- Workspace-scoped routing (`/workspaces/[workspaceId]/...`) with per-workspace sub-navigation
- Streaming SSR: three independent dashboard metric widgets (Billing, Node Count, Cluster Status) stream in as their data resolves, each behind its own `<Suspense>` boundary
- Parallel + intercepting routes: clicking a resource link opens an inline slide-over drawer; a direct/hard-refresh visit to the same URL renders a full standalone page instead
- Mobile navigation drawer with focus management and `Escape`-to-close
- Hover-intent route prefetching (bonus): resource links warm the router cache after a short hover delay, avoiding wasted prefetches from fast mouse-throughs
- Cached, tag-based revalidation for dashboard metrics (`unstable_cache` + `workspace-metrics` tag)

## Architecture

The app follows a **shell → workspace → page** nesting model:

```
Root layout (fonts, <html>/<body>)
 └─ (dashboard) route group
     └─ Dashboard shell layout (RSC) — sidebar, header, @modal slot
         └─ Workspace layout (RSC) — workspace sub-nav
             └─ Page (analytics / settings / resources / telemetry-grid)
```

Two React patterns do the heavy lifting:

- **Parallel routes** (`@modal`) let the dashboard shell render two independent subtrees at once — the normal page (`children`) and an optional drawer (`modal`) — as sibling props on the same layout.
- **Intercepting routes** (`(.)resources/[resourceId]`) let a route match differently depending on navigation origin: an in-app `<Link>` click is intercepted into the modal slot, while a direct browser navigation falls through to the real, standalone page.

Data fetching is pushed as close to the server as possible: layouts and pages are `async` Server Components that `await` their data directly, so there is no client-side loading waterfall before the first paint.

## Folder Structure

```
src/
  app/
    layout.tsx                                   Root HTML shell (fonts, global styles)
    page.tsx                                      Default Next.js starter home page
    (dashboard)/
      layout.tsx                                  Dashboard shell (RSC) — sidebar, header, modal slot
      @modal/
        default.tsx                               Empty fallback for the modal parallel slot
        (.)resources/[resourceId]/page.tsx         Intercepted resource drawer
      workspaces/[workspaceId]/
        layout.tsx                                 Workspace sub-navigation
        analytics/page.tsx                          Streaming metrics + resource link demo
        settings/page.tsx                           Placeholder settings page
        resources/page.tsx                          Resources index placeholder
        resources/[resourceId]/page.tsx             Direct (non-intercepted) resource page
  components/
    layout/
      Sidebar.tsx                                  Client — active-route-aware nav list
      SidebarToggle.tsx                             Client — collapse/expand button (Server Action)
      WorkspaceSwitcher.tsx                          Client — workspace dropdown
      MobileNavToggle.tsx                            Client — hamburger button
      MobileNavigationDrawer.tsx                     Client — mobile drawer + backdrop
    compound/
      dashboard/
        BillingMeter.tsx                             RSC — async billing widget
        NodeCount.tsx                                RSC — async node count widget
        ClusterStatus.tsx                            RSC — async cluster status widget
      resources/
        ResourceLink.tsx                             Client — link with hover-prefetch
        ResourceDrawer.tsx                            RSC — modal drawer presentation
        ResourceDetailPage.tsx                        RSC — full-page presentation
    skeletons/
      MetricsCardSkeleton.tsx                        Suspense fallback for metric widgets
      ResourceListSkeleton.tsx                       Suspense fallback for resource views
  core/
    config/
      navigation.ts                                  Sidebar nav item definitions
    state/
      mobile-nav-context.tsx                          Mobile drawer open/close context
    hooks/
      useHoverPrefetch.ts                              Hover-intent route prefetching
    utils/
      workspace.ts                                     Mock workspace summary fetcher
      resources.ts                                      Mock resource metrics fetcher
      metrics.ts                                         Mock, cached metric fetchers
      sidebar.ts                                         Server Action — persists sidebar cookie
```

## Technical Decisions

- **Cookie-based sidebar state over client state.** Reading the sidebar's collapsed/expanded state from a cookie on the server (`next/headers`) means the first HTML response already reflects the correct layout — avoiding the flash of an incorrect state that `useState` + `useEffect` would cause.
- **Server Actions for state mutation.** `setSidebarState` is a `"use server"` function called directly from the client `SidebarToggle` component, wrapped in `useTransition` so the UI doesn't block on the round trip.
- **Route-derived workspace ID over prop drilling.** `Sidebar` (which lives above the `[workspaceId]` segment) derives the active workspace ID by pattern-matching `usePathname()` rather than threading it down through layout props.
- **`unstable_cache` with shared tags.** All three dashboard metric fetchers share a single `"workspace-metrics"` tag, so a future webhook-triggered `revalidateTag()` call invalidates all of them in one shot instead of tracking three separate cache keys.
- **`prefetch={false}` + manual hover prefetch.** Disabling Next.js's automatic viewport prefetching on resource links in favor of a deliberate hover-intent timer avoids prefetching every link that happens to scroll into view.
- **No global state library.** Given the scope (sidebar state, mobile nav open/close), a single React Context (`mobile-nav-context.tsx`) was sufficient — introducing Redux/Zustand would have been unjustified overhead.

## Route Structure

| Route                                                                    | Type                       | Description                                   |
| ------------------------------------------------------------------------ | -------------------------- | --------------------------------------------- |
| `/workspaces/[workspaceId]/analytics`                                    | RSC page                   | Streaming metric widgets + resource link demo |
| `/workspaces/[workspaceId]/settings`                                     | RSC page                   | Workspace settings placeholder                |
| `/workspaces/[workspaceId]/resources`                                    | RSC page                   | Resources index placeholder                   |
| `/workspaces/[workspaceId]/resources/[resourceId]`                       | RSC page                   | **Direct** full-page resource view            |
| `/workspaces/[workspaceId]/resources/[resourceId]` (via in-app `<Link>`) | Intercepted parallel route | Inline drawer over the current page, same URL |
| `/workspaces/[workspaceId]/telemetry-grid`                               | Client page                | Task 02 — 100k-row virtualized data grid      |
| `/workspaces/[workspaceId]/telemetry-grid/dynamic-height-test`           | Client page                | Task 02 — dynamic row height scratch test     |

Navigating to a resource by clicking `<ResourceLink>` from anywhere inside the dashboard shell intercepts into the modal slot. Pasting the same URL, hard-refreshing, or opening it in a new tab always renders the standalone page — both routes call the same data function (`getResourceMetrics`) so they never drift out of sync on the underlying data.

## Server vs Client Components

**Server Components (default, no directive):**
`(dashboard)/layout.tsx`, `workspaces/[workspaceId]/layout.tsx`, all page files, `BillingMeter`, `NodeCount`, `ClusterStatus`, `ResourceDrawer`, `ResourceDetailPage`, the skeleton components.

These fetch their own data via `await` directly in the component body, render pure markup, and ship no JavaScript to the client.

**Client Components (`"use client"`):**
`Sidebar`, `SidebarToggle`, `WorkspaceSwitcher`, `MobileNavToggle`, `MobileNavigationDrawer`, `MobileNavProvider`, `ResourceLink`, `useHoverPrefetch`.

Each is a small, isolated "leaf" that needs browser APIs, event handlers, or local state — never a whole page or layout. This keeps the client JS bundle limited to genuinely interactive surface area.

**Server Actions (`"use server"`):**
`setSidebarState` in `core/utils/sidebar.ts` — a server-only mutation callable directly from a client component without a manual API route.

## Performance Optimizations

- **Streaming SSR** via independent `<Suspense>` boundaries per metric widget, so slow data doesn't block fast data from painting.
- **Tag-based, time-based caching** (`unstable_cache`, 60s revalidate) on all mock metric fetchers to avoid redundant simulated I/O on every navigation.
- **Hover-intent prefetching** with a debounce-style delay, so route data is warmed before the click without over-fetching on incidental mouse movement.
- **Cookie-based layout state** eliminates a client-side re-render (and the associated flash) that would otherwise be needed to apply the user's sidebar preference.
- **Minimal client boundaries** — interactivity is isolated to small leaf components, keeping most of the dashboard shell's JavaScript footprint at zero.

## Running the Project

```bash
npm install
npm run dev
```

Then open `http://localhost:3000/workspaces/ws-001/analytics` (the dashboard shell renders relative to any `workspaceId` you supply in the URL).

Other useful scripts:

```bash
npm run build       # production build
npm run start        # run the production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

## Future Improvements

- Replace mock data functions (`workspace.ts`, `resources.ts`, `metrics.ts`) with real API/database calls once a backend exists.
- Wire `revalidateTag("workspace-metrics")` into a real webhook or mutation so cached metrics invalidate on actual data changes, not just the 60s timer.
- Add a real workspace list to `WorkspaceSwitcher` instead of the current single-item placeholder.
- Expand the mobile navigation drawer's links to real routes instead of `href="#"` placeholders.
- Add route-level loading skeletons (`loading.tsx`) alongside the existing component-level `<Suspense>` fallbacks for full-page navigations.
- Persist sidebar state per-user (server-side) rather than per-browser cookie, once auth exists.

---

# Task 02 – High-Performance Headless Data Grid with Virtualization

## Overview

Task 02 is a from-scratch, zero-dependency virtualized data grid capable of smoothly rendering 100,000+ rows. No table library (`@tanstack/react-table`, `react-window`, `react-virtualized`) is used — windowing, sorting, filtering, selection, column reordering, and WAI-ARIA keyboard navigation are all hand-built to demonstrate direct control over DOM/browser rendering behavior.

The grid is **headless**: all data logic (`useDataGrid`) and windowing math (`useVirtualizer`) are fully decoupled from presentation, exposed as a compound component API (`<DataGrid>`, `<DataGrid.Header>`, `<DataGrid.Body>`).

## Features

- Custom DOM-virtualization engine rendering only visible rows (+ overscan buffer), regardless of total dataset size
- Fixed-height mode (default, O(1) math) and opt-in dynamic-height mode (per-row `ResizeObserver` measurement with binary-search offset lookup)
- Single and multi-column sorting (Shift-click to add a secondary sort key)
- Global text filter and per-column filters (`equals`, `contains`, `range`, `regex`)
- Debounced filtering (200ms default) so typing stays responsive even while filtering 100k rows
- Single, multi (Ctrl/Cmd-click), and range (Shift-click) row selection
- Column visibility toggling and column reordering (keyboard-accessible ◀/▶ buttons per header)
- Full WAI-ARIA Data Grid keyboard pattern: arrow keys, Home/End, PageUp/PageDown, Space/Enter, roving `tabIndex`
- Dev-only console performance monitor reporting FPS, jitter, and frame-budget compliance while scrolling

## Architecture

The grid is built in three independent layers:

```
useVirtualizer   →  "which rows are visible, and where?" (pure math + DOM measurement)
useDataGrid      →  "what data, sorted/filtered/selected how?" (pure data logic)
DataGrid/*        →  compound UI components + keyboard handling, wiring the two together
```

Neither hook knows anything about JSX, and the components know nothing about sort comparators or offset math — the two layers could be swapped or reused independently.

Windowing works by rendering only the rows within (or just outside) the visible scroll viewport, absolutely positioning each with a `translateY(...)` transform, and giving the scroll container a spacer element sized to the _total_ virtual height so native scrollbar behavior stays correct even though most rows are never mounted.

## Folder Structure

```
src/
  core/
    hooks/
      useVirtualizer.ts                 Windowing engine — fixed & dynamic row height modes
      useDataGrid.ts                     Headless data engine — sort/filter/select/reorder state
      useDebouncedValue.ts               Generic debounce hook (used for filter inputs)
      usePerformanceMonitor.ts           Dev-only FPS/jitter console reporter
    utils/
      generateAuditData.ts               Deterministic 100k-row mock dataset generator
  components/
    compound/DataGrid/
      DataGrid.tsx                       Root component + shared context (active cell, engine, config)
      DataGridHeader.tsx                 Header row — sort toggles + column reorder buttons
      DataGridBody.tsx                   Virtualized row rendering + keyboard navigation
      DataGridCell.tsx                   Single cell — roving tabIndex, focus management
      index.ts                           Compound export: DataGrid.Header / .Body / .Cell
  app/(dashboard)/workspaces/[workspaceId]/
    telemetry-grid/page.tsx               Full demo — 100k rows, 7 columns, global filter, perf monitor
    telemetry-grid/dynamic-height-test/page.tsx  Scratch page verifying dynamic row heights (30 rows)
```

## Technical Decisions

- **Hand-built virtualization over a library.** Per the task constraints, no `react-window`/`react-virtualized`/`@tanstack/react-table` — the windowing math, `ResizeObserver` measurement, and offset caching are all custom.
- **`requestAnimationFrame`-throttled scroll handling.** Native `scroll` events can fire far more often than the browser repaints; batching `scrollTop` state updates to once per frame avoids wasted re-renders between paints.
- **Binary search for dynamic offsets.** Uneven row heights mean the visible window can't be found with simple division, so `useVirtualizer` binary-searches a cumulative offset array (`O(log n)`) instead of scanning linearly.
- **Suffix-only offset invalidation.** When one row's measured height changes, only the offset cache _after_ that row's index is invalidated and rebuilt — a single row resize never forces recomputing all 100k offsets.
- **Debounce the filter _pipeline_, not the input.** The `<input>` itself updates instantly on every keystroke (so typing feels responsive); only the value fed into the actual row-filtering `useMemo` is debounced, keeping the UI snappy while avoiding filtering the full dataset on every keystroke.
- **Column order stored as an id array, reconciled against live columns.** `columnOrder: string[]` is independent from the `columns` prop, with a reconciliation step that keeps known ids, drops stale ones, and appends new ones — so it never desyncs if column definitions change.
- **Roving `tabIndex` over `aria-activedescendant`.** Only the active cell is ever in the natural Tab order (`tabIndex={0}`); all others are `-1`. This is the WAI-ARIA-recommended pattern for grid keyboard navigation and keeps screen-reader/keyboard behavior predictable.
- **Deterministic mock data.** `generateAuditData` avoids `Math.random()` in favor of seeded pseudo-random helpers, so the 100k-row dataset — and any benchmark numbers taken against it — are reproducible across runs.

## Route Structure

| Route                                                          | Description                                                                                                                                                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/workspaces/[workspaceId]/telemetry-grid`                     | Full demo: 100k generated audit-log rows, 7 columns, global filter input, live FPS/jitter console reporting                                                                                     |
| `/workspaces/[workspaceId]/telemetry-grid/dynamic-height-test` | Isolated scratch page: 30 rows with alternating short/long text, `enableDynamicSize` enabled, used to visually verify no row overlap and correct keyboard traversal across variable-height rows |

## Server vs Client Components

The entire data grid is client-side by necessity — it depends on `scrollTop`, `ResizeObserver`, `requestAnimationFrame`, keyboard events, and interactive local state, none of which exist on the server.

- `"use client"`: `useVirtualizer`, `useDataGrid`, `useDebouncedValue`, `usePerformanceMonitor`, `DataGrid.tsx`, `DataGridHeader.tsx`, `DataGridBody.tsx`, `DataGridCell.tsx`, both demo pages.
- `generateAuditData.ts` has no directive and could technically run on the server, but is currently invoked client-side (via `useMemo`) inside the client demo pages for simplicity; moving dataset generation to the server (and passing it down as a prop) is a natural future optimization — see below.

## Performance Optimizations

- **DOM virtualization** — only rows within the viewport (+ overscan) are ever mounted, regardless of whether the dataset is 100 rows or 100,000.
- **`translateY` positioning over layout-affecting properties** — rows are absolutely positioned with CSS transforms, which the browser can composite on the GPU without triggering layout recalculation for the whole list.
- **`requestAnimationFrame`-batched scroll state** — at most one virtualization recompute per animation frame, never more.
- **Memoized data pipeline** — `processedRows` (filter → filter → sort) only recomputes when its actual dependencies change, not on unrelated state changes like row selection.
- **Debounced filtering** — expensive full-dataset filtering is deferred until typing settles (200ms), rather than running on every keystroke.
- **Suffix-only cache invalidation** for dynamic row heights, avoiding full-dataset offset recomputation on every resize.
- **Dev-only performance monitor** (`usePerformanceMonitor`) — measures real scroll FPS/jitter against a 16.6ms (60fps) frame budget, gated to `NODE_ENV === "development"` so it has zero production cost.

## Running the Project

```bash
npm install
npm run dev
```

Then visit:

- `http://localhost:3000/workspaces/ws-001/telemetry-grid` — full 100k-row demo (open the browser console to see live FPS/jitter logs while scrolling)
- `http://localhost:3000/workspaces/ws-001/telemetry-grid/dynamic-height-test` — dynamic row height verification page

## Future Improvements

- **Web Worker offloading** (bonus challenge, not yet implemented): move `applySorting`/`applyColumnFilters`/aggregate calculations off the main thread via a dedicated `gridWorker.ts`, communicating over `postMessage`, for datasets significantly larger than 100k rows.
- **Automated accessibility verification** (remaining deliverable): script `axe-core` (or similar) against the rendered grid to formalize the manual WAI-ARIA compliance already built in.
- Move `generateAuditData` invocation to the server and stream the dataset down, rather than generating it client-side on mount.
- Add resizable columns (drag-based width adjustment) alongside the existing reorder buttons.
- Persist grid state (sort/filters/column order) to the URL or local storage so it survives a page refresh.
- Add automated performance regression tests around the `usePerformanceMonitor` benchmark numbers (currently console-only, not asserted against thresholds in CI).

---

# Task 03 – Multi-Step Provisioning Wizard with a Generic Workflow Engine

## Overview

Task 03 builds a multi-step infrastructure provisioning wizard (general config → network config → security config → review & submit), backed by a **generic, content-agnostic workflow engine** rather than a hardcoded step sequence. The engine knows nothing about "provisioning" specifically — it manages step/transition state, validation gating, and navigation rules, while the wizard's actual steps and fields are supplied as configuration. This keeps the same engine reusable for any future multi-step flow in the portal.

## Features

- Generic step/transition state machine (`useWorkflowEngine`) — forward/back navigation, per-step validation gating, and step-completion tracking, independent of what any given step actually contains
- Cross-step conditional validation via Zod (`provisioningSchema.ts`) — later steps can validate against values chosen in earlier steps (e.g. a security setting only being valid for a particular network configuration)
- Draft persistence (`useDraftPersistence`) — in-progress wizard state survives a reload/navigation away instead of being lost
- URL state sync (`urlStateSync`) — the current step is reflected in the URL, so back/forward browser navigation and direct links to a specific step work correctly
- Keyboard shortcut (`useWizardKeyboardShortcut`) — Cmd/Ctrl+Enter advances to the next step without reaching for the mouse
- Full visual integration with the dashboard's dark theme — the wizard was restyled from its original hardcoded light-mode Tailwind classes onto the shared `--ix-*` design tokens, so it matches the rest of the portal rather than looking like a separate app bolted on

## Architecture

```
useWorkflowEngine   →  "which step, can I move forward, what's been completed?" (generic, content-agnostic)
useDraftPersistence →  "does this survive a reload?" (storage-backed, independent of the engine)
provisioningSchema  →  "is this step's data valid, including in light of earlier steps?" (Zod, cross-step aware)
WizardContainer/*    →  presentation + wiring: renders the active step, stepper UI, and next/back controls
```

The engine and the schema are deliberately separate concerns: `useWorkflowEngine` would work identically if the steps were about something other than infrastructure provisioning, and `provisioningSchema.ts` would work identically if driven by a different navigation engine.

## Folder Structure

> Fill in with your exact paths if these differ — reconstructed from what we discussed, not re-verified against your file tree.

```
src/
  core/
    hooks/
      useWorkflowEngine.ts          Generic step/transition engine
      useDraftPersistence.ts        Persists in-progress wizard state
      useWizardKeyboardShortcut.ts  Cmd/Ctrl+Enter step-advance shortcut
    utils/
      urlStateSync.ts               Syncs active step to the URL
    schemas/
      provisioningSchema.ts         Zod schema, cross-step conditional validation
  components/
    compound/Wizard/
      WizardContainer.tsx           Root — owns the engine, renders active step
      WizardStepper.tsx             Step indicator / progress UI
      StepGeneralConfig.tsx
      StepNetworkConfig.tsx
      StepSecurityConfig.tsx
      StepReviewSubmission.tsx
  app/(dashboard)/workspaces/[workspaceId]/
    provisioning-wizard/page.tsx    <!-- confirm actual route segment name -->
```

## Technical Decisions

- **Content-agnostic engine over a hardcoded step sequence.** `useWorkflowEngine` has no knowledge of "general config" or "network config" — it only understands step indices, transitions, and validation gates. This means the same hook can drive a completely different wizard later without modification.
- **Cross-step Zod validation instead of per-step isolated schemas.** Because later steps can depend on earlier choices (e.g. a security option only being valid for a given network mode), `provisioningSchema.ts` validates with awareness of the full accumulated form state, not just the current step in isolation.
- **URL-synced step over component-local state only.** Reflecting the active step in the URL (`urlStateSync`) means the browser's back/forward buttons behave correctly and a specific step can be linked to directly, rather than always restarting at step one.
- **Restyled onto shared design tokens rather than a wizard-specific palette.** The wizard originally used hardcoded light-mode slate/red Tailwind classes; these were mapped onto the app's existing `--ix-*` dark-theme tokens via `@theme inline` (`bg-surface`, `text-fg-muted`, `border-accent`, etc.) so it visually matches the rest of the dashboard instead of reading as a separate, disconnected screen.

## Running the Project

```bash
npm install
npm run dev
```

Then visit the provisioning wizard route under your workspace  
`http://localhost:3000/workspaces/ws-001/provision`

## Future Improvements

- Persist drafts server-side (per user) instead of local/client-side storage, once auth exists.
- Add automated tests around the cross-step conditional validation rules in `provisioningSchema.ts`.
- Extract `useWorkflowEngine` into a shared package if a second multi-step flow is added elsewhere in the portal, to make its content-agnostic design pay off beyond this one wizard.

---

# Task 04 – Real-Time Telemetry Stream & Resilient Optimistic UI Engine

## Overview

Task 04 builds a high-frequency real-time telemetry monitoring dashboard over Server-Sent Events, paired with a generic optimistic-update engine for infrastructure control actions (restart node, change CPU limit). The two systems are deliberately decoupled: the stream hook only knows how to reliably deliver deduplicated events, and the mutation hook only knows how to snapshot/apply/roll back state — neither knows anything about "nodes" or "telemetry" specifically.

## Features

- Resilient SSE connection lifecycle (`useTelemetryStream`) with a 5-state machine: `CONNECTING`, `CONNECTED`, `RECONNECTING`, `DISCONNECTED`, `ERROR`
- Exponential backoff reconnection (`2^n × 1000ms + jitter`, capped at 5 retries before surfacing a manual "Reconnect" affordance)
- Heartbeat-based zombie detection — forces a reconnect if the server goes silent for 15s even though the connection still looks open
- Fixed-size ring buffer (500 events) with O(1) push and automatic dedup-by-`seq_id`, so replayed events after a reconnect never double-count
- rAF-batched state flushing — high-frequency SSE messages are folded into React state at most once per animation frame, never causing render thrashing
- Pause/resume — freezes what the UI displays without losing what's happening on the wire; the ring buffer keeps recording underneath
- Generic optimistic mutation engine (`useOptimisticMutation`) — deep-clone snapshot before every mutation, immediate optimistic apply, automatic rollback to the exact pre-mutation snapshot on HTTP failure or timeout
- Duplicate-dispatch guard — a second click on the same in-flight action (e.g. double-clicking "Restart") is dropped rather than queued or stacked
- Canvas-based aggregate live chart (avg CPU / memory / latency across nodes), drawn imperatively so chart updates never trigger a React re-render
- Non-disruptive rollback toasts explaining what failed and that it was rolled back

## Architecture

```
useTelemetryStream     →  "is the stream alive, and what deduplicated events have arrived?"
RingBuffer<T>           →  fixed-capacity circular buffer, dedup by seq_id, O(1) push/evict
useOptimisticMutation   →  "apply this change now, roll back to the exact prior snapshot if it fails"
live-telemetry/page.tsx →  integration point: groups events by node_id, derives status, wires mutations to NodeCard
NodeCard / Sparkline     →  presentational only — pure function of the props the page gives them
```

The page is the only place that combines the three concerns. `useTelemetryStream` and `useOptimisticMutation` are both usable independently of each other and of the telemetry domain — the mutation engine doesn't know a "node" exists, and the stream hook doesn't know what a restart action is.

Node **status** (`healthy` / `warning` / `critical` / `restarting` / `offline`) is intentionally not part of the telemetry payload — it's derived at render time in the page by combining the latest streamed metrics with the current optimistic control state (e.g. an in-flight restart overrides the threshold-derived status).

## Folder Structure

```
src/
  core/
    hooks/
      useTelemetryStream.ts       Resilient SSE connection manager
      useOptimisticMutation.ts    Generic snapshot/apply/rollback engine
    utils/
      RingBuffer.ts               Fixed-capacity, dedup-by-seq_id circular buffer
  components/
    compound/Telemetry/
      NodeCard.tsx                Presentational node card (memoized)
    primitive/
      Sparkline.tsx               Dependency-free SVG trend line primitive
  app/
    api/telemetry/stream/route.ts             Mock SSE endpoint (simulated drops + heartbeats)
    (dashboard)/workspaces/[workspaceId]/
      live-telemetry/page.tsx                  Integration page — the dashboard itself
```

## Technical Decisions

- **rAF-batched flushing inside the hook, not the page.** Per the engineering constraint against calling `setState` directly in high-frequency SSE callbacks, `useTelemetryStream` schedules at most one `setEvents` call per animation frame internally — so every consumer of the hook gets this guarantee for free, rather than each page having to reimplement it.
- **Flat, deduplicated event list over per-node state inside the hook.** The hook stays domain-agnostic (it doesn't know what a `node_id` means); grouping by node happens in the page via `useMemo`, keeping the hook reusable for any other multi-source SSE stream.
- **`structuredClone` for mutation snapshots.** Per the requirement to snapshot deep clones before applying optimistic diffs, `useOptimisticMutation` uses `structuredClone` (falling back to `JSON.parse(JSON.stringify(...))`) rather than a shallow spread, so nested state can't be accidentally shared between the live state and the rollback snapshot.
- **Domain state clears itself on success; the engine doesn't.** `useOptimisticMutation` only reverts state on failure — on success it just clears its own `pendingIds`. Fields like `isRestarting` that were set optimistically and aren't the final desired state (unlike `cpuLimit`, which _is_ the final desired value) are cleared explicitly via the mutation's `onSuccess` callback in the page, not by the engine itself.
- **Canvas over SVG/DOM for the aggregate chart.** With multiple lines updating up to once per second indefinitely, canvas lets the page redraw imperatively (`ctx.clearRect` + `ctx.stroke`) without creating/diffing DOM nodes on every tick — chosen per the task's explicit canvas requirement for the main live chart.
- **Chart history kept in a ref, not state.** The rolling aggregate history array lives in `useRef`, not `useState`, so appending a new point and redrawing never itself causes a React re-render — the only re-renders come from the underlying `events` state update, which is already throttled to once per frame.
- **Mocked action requests over a real backend route.** No `/api/nodes/:id/restart`-style endpoint exists yet in this deliverable set, so restart/CPU-limit actions currently resolve against a local simulator (400–1300ms delay, 20% random failure) to exercise the rollback path — see Future Improvements.

## Route Structure

| Route                                      | Description                                                          |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `/api/telemetry/stream`                    | Mock SSE endpoint — telemetry + heartbeat events, simulated drops    |
| `/workspaces/[workspaceId]/live-telemetry` | Live telemetry dashboard — node grid, aggregate chart, connection UI |

## Server vs Client Components

- **Server:** `app/api/telemetry/stream/route.ts` is a Route Handler (not a component), running entirely server-side to produce the SSE stream.
- **Client (`"use client"`):** `useTelemetryStream`, `useOptimisticMutation`, `NodeCard`, `Sparkline`, and `live-telemetry/page.tsx` itself — all necessarily client-side, since they depend on `EventSource`, timers, canvas, and interactive local state, none of which exist on the server.

## Performance Optimizations

- **rAF-throttled state updates** inside `useTelemetryStream`, capping React re-renders from the stream to once per animation frame regardless of message frequency.
- **Ring buffer with O(1) push/evict and dedup**, keeping memory bounded at 500 events no matter how long the stream runs.
- **`React.memo` on `NodeCard`**, combined with the page passing each card only its own slice of state, so an update to one node's metrics never re-renders unrelated cards.
- **Imperative canvas drawing with ref-backed history**, avoiding React re-renders entirely for the highest-frequency visual (the aggregate chart).
- **Duplicate-dispatch guard in `useOptimisticMutation`**, preventing redundant network requests from rapid repeated clicks on the same action.

## Running the Project

```bash
npm install
npm run dev
```

Then visit `http://localhost:3000/workspaces/ws-001/live-telemetry`.

To exercise the resilience features:

- Leave the tab open for 20–45 seconds without interacting — the mock stream deliberately closes the connection in that window so you can watch `useTelemetryStream`'s backoff/reconnect cycle happen live.
- Click **Restart** or the CPU limit +/- buttons repeatedly — roughly 1 in 5 actions will fail and roll back, with a toast explaining what happened.

## Future Improvements

- **Offline Delta Queueing with IndexedDB** (bonus challenge, not implemented): queue optimistic actions in IndexedDB while `navigator.onLine === false`, then flush them sequentially with idempotency keys once connectivity returns. Deliberately deferred to prioritize finishing and hardening the core deliverables first.
- Replace the local action simulator with real `/api/nodes/:id/restart` and `/api/nodes/:id/cpu-limit` routes once a backend exists.
- Add automated tests around the reconnection/backoff timing and the rollback path (currently verified manually).
- Allow rapid repeated CPU-limit adjustments to cancel-and-replace the in-flight mutation instead of being dropped by the duplicate-dispatch guard, if that turns out to be the desired UX.
- Persist the connection's `isPaused` preference across a page reload.

# Task 05 – Enterprise Component Library Architecture & Design Token Engine

## Overview

Task 05 establishes the foundational architecture of the Infinity X Design System ("IX-Design"): a three-tier design token engine backed by native CSS custom properties, three switchable themes (dark, light, high-contrast/AAA), and two enterprise-grade compound components — a Modal Dialog and an accessible Combobox — built on shared `asChild` (Slot) and Portal primitives rather than a UI library.

The goal was strict token discipline: no component file should ever reference a hardcoded hex value or pixel size directly. Everything routes through `--ix-*` CSS variables, which theme switching updates with zero runtime cost via a single `data-theme` attribute write.

## Features

- Three-tier token architecture — global (raw palette/scale), semantic (contextual `bg.surface`, `text.primary`, `accent.solidBg`, etc.), rendered as native CSS custom properties per theme
- Three switchable themes: `dark` (default), `light`, and `high-contrast` — the latter tuned to WCAG 2.1 AAA (7:1) for low-vision users, the other two to WCAG 2.1 AA
- Split accent tokens (`accent.default` for text/icon use vs. `accent.solidBg` for filled backgrounds under white text) — a deliberate fix for the existing app's single `--ix-accent`, which can't satisfy AA contrast in both roles at once
- Compound `<Modal>` — Trigger/Portal/Overlay/Content/Header/Title/Body/Footer/CloseButton, with full focus trapping, scroll lock, and Escape-to-close
- Compound `<Combobox>` — headless Root/Input/List/Item/Group, ARIA 1.2 combobox pattern (`aria-activedescendant`, focus never leaves the input), typeahead filtering left to the consumer for custom item templates and grouping
- `asChild` polymorphism via a shared `<Slot>` primitive — `<Modal.Trigger asChild><a href="...">` renders a real `<a>`, not an invalid `<button>`-wrapping-`<a>`
- `<Portal>` utility rendering into a dedicated `#ix-portal-root` node, SSR-safe (renders nothing until client mount, avoiding hydration mismatches)
- `<Button>` (variants, sizes, loading spinner, `asChild`) and `<Badge>` (variant/size/status-dot) primitive components, fully token-driven
- Interactive showcase page (`/design-system`) with a live theme toggle, resolved-token swatches, and working Modal/Combobox demos

## Architecture

The system is layered the same way Tasks 1–4 layer their engines — pure logic/data at the bottom, presentation wired on top:

```
global.ts        →  raw palette + scale primitives (no semantic meaning)
semantic.ts       →  per-theme contextual mapping onto global.ts (bg/text/accent/status/focusRing)
theme.css         →  semantic.ts rendered as --ix-* custom properties, scoped by [data-theme="..."]
                      (component code never imports semantic.ts directly — it reads var(--ix-*))
```

Compound components follow the same context-provider pattern established as a convention across the codebase:

```
<Modal>     →  ModalRoot owns { open, onOpenChange, titleId, triggerRef } via ModalContext
<Combobox>  →  ComboboxRoot owns { inputValue, open, activeId, selectedId, ... } via ComboboxContext
```

Each sub-component (`Modal.Title`, `Combobox.Item`, etc.) calls a `useXContext(componentName)` accessor that throws a clear, named error if rendered outside its root — rather than crashing on `null.someProperty` — matching the "fail loud, fail clear" pattern already used for `useDataGrid`/`useWorkflowEngine`.

## Folder Structure

```
src/
  styles/
    tokens/
      global.ts                          Tier 1 — raw color/spacing/radius/shadow/z-index/duration scales
      semantic.ts                        Tier 2 — SemanticTokens contract + dark/light/high-contrast mappings
      theme.css                          Tier 2 as CSS custom properties, scoped per [data-theme]
  components/
    compound/
      Modal/
        Modal.tsx                        Root — owns ModalContext (open/onOpenChange/titleId/triggerRef)
        Trigger.tsx                      asChild-aware trigger button
        Portal.tsx                       Modal-specific wrapper — unmounts Overlay/Content when closed
        Overlay.tsx                      Backdrop
        Content.tsx                      Dialog surface — focus trap, scroll lock, Escape-to-close
        Header.tsx / Title.tsx / Body.tsx / Footer.tsx / CloseButton.tsx
        context.ts                       ModalContext + useModalContext accessor
        index.tsx                        Compound export: Modal.Trigger / .Portal / .Content / ...
      Combobox/
        Combobox.tsx                     Root — owns ComboboxContext, headless (no built-in filtering)
        Input.tsx                        role="combobox", full Arrow/Home/End/Enter/Escape handling
        List.tsx                         Popover listbox container
        Item.tsx                         Individual option — aria-selected, click-to-select
        Group.tsx                        Labeled option group wrapper
        context.ts                       ComboboxContext + useComboboxContext accessor
        index.tsx                        Compound export: Combobox.Input / .List / .Item / .Group
    primitive/
      Button.tsx                          Variant/size/loading/asChild button
      Badge.tsx                           Variant/size/status-dot badge
    utility/
      Slot.tsx                            asChild mechanism — prop/ref/handler merging onto a single child
      Portal.tsx                          Generic createPortal wrapper, SSR-safe, defaults to #ix-portal-root
  core/
    hooks/
      useFocusTrap.ts                     Tab-wrapping focus trap + focus restoration, used by Modal.Content
    utils/
      cn.ts                               className-joining helper
      mergeRefs.ts                        Merges a forwarded ref with an internally-owned ref
  app/
    (dashboard)/
      design-system/
        page.tsx                          Interactive showcase — theme toggle, token swatches, Modal/Combobox demos
        design-system.module.css
      test-modal/page.tsx                 Standalone scratch page verifying Modal in isolation
```

## Technical Decisions

- **Split `accent.default` / `accent.solidBg` instead of one accent token.** A single accent color used both as link/icon text on a surface _and_ as a button's filled background under white text can't hit AA in both roles simultaneously — verified per-theme via the contrast ratios noted in `semantic.ts`'s comments. This also fixes a latent issue in the app's original single `--ix-accent`.
- **`theme.css` is additive, not a replacement — yet.** It resolves to identical values as the existing hardcoded `:root` block in `globals.css` under the default `dark` theme, so wiring it in changes nothing visually until `<html data-theme="...">` is verified working; the duplicate legacy block is left in place intentionally as a rollback path, to be deleted once confirmed.
- **Context-provider compound pattern over prop drilling.** Both `Modal` and `Combobox` use the same `<Root>` + context + `useXContext(name)` shape already established by the codebase's other engines, rather than each compound component inventing its own composition mechanism.
- **Headless Combobox — no built-in filtering.** `Combobox` deliberately does not own or filter an `items` array; the consumer filters their own data by `inputValue` from context and renders whatever `<Combobox.Item>`s match. This is what makes custom item templates and grouped sections possible without a rigid `items` + `renderItem` API.
- **`aria-activedescendant` over moving DOM focus for Combobox.** Per the ARIA 1.2 combobox pattern, keyboard focus stays on the `<input>` at all times; the "active" option is only ever a visual + ARIA state (`aria-activedescendant`), read via a live DOM query of `[data-ix-combobox-item]` rather than a separate item registry kept in sync.
- **`useFocusTrap` is a standalone hook, not baked into `Modal.Content`.** Focus trapping was built as a general-purpose primitive so any future dialog-like surface (e.g. a "modal mode" Combobox popover) can reuse it without depending on Modal internals.
- **Unmount-on-close over CSS-hide for `Modal.Portal`.** Closed dialogs are removed from the DOM entirely (not just visually hidden), so focus-trap cleanup and body-scroll-lock restoration run reliably on every close, and closed content never lingers in the accessibility tree.
- **One auto-generated portal root over `document.body` directly.** `<Portal>` defaults to a dedicated `#ix-portal-root` div (created on demand) instead of appending straight to `document.body`, keeping portal content out of the way of anything that walks `document.body`'s direct children.

## Route Structure

| Route            | Description                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/design-system` | Interactive showcase — theme toggle (dark/light/high-contrast), resolved token swatches, live Modal and Combobox demos |
| `/test-modal`    | Standalone scratch page verifying `<Modal>` composition in isolation                                                   |

## Server vs Client Components

The entire token/component library is client-side by necessity — theming reads/writes `document.documentElement`, and every compound component depends on refs, portals, keyboard events, or focus management.

- `"use client"`: every file under `components/compound/Modal/`, `components/compound/Combobox/`, `components/primitive/Button.tsx`, `components/primitive/Badge.tsx` (interactive variants), `components/utility/Slot.tsx`, `components/utility/Portal.tsx`, `useFocusTrap.ts`, `design-system/page.tsx`, `test-modal/page.tsx`.
- `global.ts` and `semantic.ts` have no directive and are plain TypeScript modules — they could be imported from either environment, though today they're only consumed to generate `theme.css` and to resolve token values for display on the showcase page.

## Performance Optimizations

- **Zero-runtime-cost theme switching** — themes are pure CSS custom property scopes; toggling `data-theme` triggers a browser style recalculation, never a React re-render of themed subtrees.
- **Unmount-on-close for Modal content** — no hidden, fully-mounted dialog DOM sitting around (and no wasted focus-trap listeners) when a modal isn't open.
- **Live DOM query over a synced item registry in Combobox** — Arrow/Home/End navigation queries `[data-ix-combobox-item]` directly, avoiding a second source of truth that could drift from what's actually rendered (especially relevant if a future upgrade adds option virtualization).
- **`requestAnimationFrame`-deferred initial focus** — both `useFocusTrap` and the Combobox's `ArrowDown`-when-closed path defer their first focus move one frame, so the newly-mounted/portaled content is guaranteed to be laid out first, avoiding a wasted no-op focus call.

## Running the Project

```bash
npm install
npm run dev
```

Then visit `http://localhost:3000/design-system` — use the theme toggle at the top to switch between dark/light/high-contrast and watch every token swatch and both compound components re-theme live.

## Future Improvements

- **Automated Color Contrast Audit Engine** (bonus challenge, not yet implemented): a runtime utility sampling rendered background/foreground pairs via canvas/DOM inspection and warning in the console on any AA/AAA violation. Currently, contrast ratios are hand-verified and documented as comments in `semantic.ts` rather than continuously checked.
- Wire `theme.css` in as the actual single source of truth and delete the now-duplicate hardcoded `:root` block in `globals.css`, once confirmed safe.
- Add virtualized option rendering to `Combobox.List` for large option sets (the requirement is scaffolded for but not yet exercised by the showcase page's small 3-person demo list).
- Persist the user's chosen theme (currently local `useState` on the showcase page only) to a cookie or `localStorage`, and apply it globally via the root layout rather than only on `/design-system`.
- Two small dead files — `components/compound/Modal/Slot.tsx` and `components/compound/Modal/Portal.tsx` — are unused duplicates of the shared `utility/` versions and can be deleted.
- Extend `<Badge>`/`<Button>` with a formal Storybook-style catalog once the design system has more than two compound components.

---

# Task 06 – Frontend Resilience Architecture & Core Web Vitals Audit

## Overview

Task 06 hardens the Infinity X portal against two classes of production failure that a "happy path" build never has to face: uncaught JavaScript exceptions in any one part of the UI, and silent performance regressions that never show up in a demo but degrade real usage. It adds a three-tier error boundary hierarchy with structured telemetry, a native Core Web Vitals observer, and a fault-injection test suite to prove the isolation guarantees hold under real thrown errors — not just in theory.

## Features

- Three-tier error boundary hierarchy: component-level (`GranularErrorBoundary`), route-level (`(dashboard)/error.tsx`), and root-level (`global-error.tsx`) — a failure at one tier is provably invisible to the tiers above it
- `GranularErrorBoundary` — class-based, with a single automatic retry (default 2s delay), a manual "Retry Widget" button, `resetKeys`-based auto-reset (e.g. reset on `workspaceId` change), and a `useErrorBoundary()` hook escape hatch for handing async/event-handler errors to the nearest boundary
- Client telemetry pipeline (`errorLogger.ts`) — captures message, stack trace, active route, sanitized session storage, browser/connection info, and a `performance.memory` snapshot where available
- PII sanitization — any object key matching a sensitive-key pattern (`password`, `token`, `secret`, `ssn`, `cookie`, `credit_card`, etc.) is redacted recursively before dispatch, regardless of source (session storage, event payloads)
- Rate-limited dispatch — max 5 telemetry payloads per rolling 30-second window, with a single console warning rather than silent drops, so a cascading failure loop can't flood the network or the mock ingestion endpoint
- Global `window.addEventListener('error' | 'unhandledrejection')` capture (`initErrorLogger`), for exceptions no React error boundary can ever see
- `sendBeacon`-first dispatch with a `keepalive: true` fetch fallback, so telemetry survives the page unloading mid-request
- Native Core Web Vitals observer (`webVitals.ts`) — LCP, INP (approximated via Event Timing, 98th-percentile), CLS (official session-windowed algorithm), TTFB, and FCP, built directly against `PerformanceObserver` with no third-party library
- Color-coded console reporting (good / needs-improvement / poor) in development, plus a stricter internal early-warning flag (CLS > 0.05, INP > 150ms) that surfaces DOM-selector "culprit" info for CLS and INP
- Offline service worker scaffolding — `swRegister.ts` / `ServiceWorkerInit.tsx`, gated to production by default (an active SW actively fights Next.js Fast Refresh in dev)
- Interactive fault-injection suite (`/resilience-test`) — five isolated sections covering granular isolation, a simulated chunk-load failure, an intentionally unwrapped widget (proves Level 2 catches what Level 3 doesn't), an uncaught promise rejection (proves boundaries can't catch it, but the global listener does), and a high-CLS layout shift for visual/Lighthouse verification

## Architecture

```
GranularErrorBoundary (L3)  →  wraps one widget; auto-retry + manual retry; never lets a throw escape
(dashboard)/error.tsx  (L2)  →  Next.js route-segment boundary; catches whatever L3 didn't
app/global-error.tsx    (L1)  →  Next.js root boundary; catches whatever L2 didn't; own <html>/<body>
errorLogger.ts               →  called from all three tiers' catch points, tagged by severity
webVitals.ts                  →  independent observer tree, started once from the root layout
```

Each tier is deliberately unaware of the tiers above or below it — `GranularErrorBoundary` doesn't know a route boundary exists, and `global-error.tsx` doesn't know which widget failed. The only shared contract between them is `logError(error, severity, source)`.

`TelemetryInit` and `WebVitalsInit` are tiny client components mounted once each in the root layout purely so `RootLayout` itself can stay a Server Component (required for its `metadata` export) while still kicking off client-only observation on mount.

## Folder Structure

```
src/
  app/
    global-error.tsx                        Level 1 — root boundary, inlined styles (own <html>/<body>)
    (dashboard)/
      error.tsx                              Level 2 — route/feature boundary
      workspaces/[workspaceId]/
        resilience-test/page.tsx              Fault injection test suite (5 sections)
    api/telemetry/errors/route.ts             Mock ingestion endpoint — logs payload, returns 200
  components/
    feedback/
      GranularErrorBoundary.tsx               Level 3 — class component + useErrorBoundary() hook
  core/
    telemetry/
      errorLogger.ts                          Rate-limited, sanitized error telemetry pipeline
      webVitals.ts                            LCP/INP/CLS/TTFB/FCP observers, console + pluggable reporter
      TelemetryInit.tsx                        Mounts initErrorLogger() once from the root layout
      WebVitalsInit.tsx                        Mounts initWebVitals() once from the root layout
    utils/
      swRegister.ts                            registerServiceWorker() / unregisterServiceWorker()
      ServiceWorkerInit.tsx                     Mounts registerServiceWorker() once (not yet wired into layout)
```

## Technical Decisions

- **Class components for error boundaries, functional wrapper on top.** `getDerivedStateFromError`/`componentDidCatch` have no Hook equivalent, so `GranularErrorBoundary` is a class per the task's engineering note — but `useErrorBoundary()` gives function-component consumers a Hook-shaped way to hand it an async/event-handler error, by re-throwing during the next render.
- **`resetKeysAtError` snapshotted at catch-time, not compared against React's `prevProps`.** On the exact render where an error is caught, `prevProps` is already stale relative to the update that caused the crash — comparing against it would reset the boundary in the same commit that just caught the error, so the fallback UI would never actually be visible. The boundary instead baselines `resetKeys` the moment it catches, then compares future updates against that baseline.
- **One automatic retry, not infinite.** `hasAutoRetried` gates the timer-based retry to a single attempt per error; a manual "Retry Widget" click is always available regardless, so a persistently-broken widget doesn't retry-loop forever while still giving the user a way to try again after fixing the underlying condition (e.g. network back online).
- **`global-error.tsx` inlines all its styles.** Next.js only renders this component when an error escapes every other boundary including the root `layout.tsx` — so `globals.css` and any providers from the normal layout aren't guaranteed to be mounted. Hex values are hardcoded rather than reading `--ix-*` custom properties, since the CSS that defines them may be exactly what failed to load.
- **Rate limiting lives in the logger, not each boundary.** A single shared 30-second/5-payload window across `errorLogger.ts` means a cascading failure that trips all three tiers at once still only sends 5 payloads total, not 5 per tier.
- **Recursive key-pattern sanitization over an allowlist.** Session storage and any nested object passed into a payload is walked recursively and redacted by key pattern (`password`, `token`, `ssn`, etc.) rather than allowlisting known-safe keys — safer default for a system that doesn't control what ends up in `sessionStorage` over time.
- **`sendBeacon` first, `keepalive: true` fetch as fallback.** `sendBeacon` is designed exactly for "fire this during page unload" telemetry; the fetch fallback only runs if `sendBeacon` is unsupported or its own dispatch reports failure.
- **CLS/INP computed against the official algorithms, not simplified proxies.** CLS uses the spec's session-windowing (sub-1s gaps, sub-5s span, report the worst session), and INP is approximated as the 98th-percentile interaction duration — matching the actual Web Vitals methodology rather than e.g. "worst single interaction," which would over-report.
- **Service worker registration is opt-in and production-gated.** An active SW aggressively caching assets fights Next.js's dev-mode Fast Refresh (stale content after a code change is a confusing bug to chase without knowing why); `NEXT_PUBLIC_ENABLE_SW=true` force-enables it locally when the SW itself needs testing.

## Route Structure

| Route                                       | Description                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/workspaces/[workspaceId]/resilience-test` | Fault-injection suite — granular isolation, chunk-load failure, unwrapped-widget escalation, uncaught rejection, high-CLS trigger |
| `/api/telemetry/errors`                     | Mock POST sink for `errorLogger.ts` payloads — logs to the server console, returns 200                                            |

## Server vs Client Components

- **Server:** `app/api/telemetry/errors/route.ts` is a Route Handler, not a component.
- **Client (`"use client"`):** `global-error.tsx` and `(dashboard)/error.tsx` (both required by Next.js to be client components), `GranularErrorBoundary.tsx`, `errorLogger.ts`'s browser-facing calls, `webVitals.ts`, `TelemetryInit.tsx`, `WebVitalsInit.tsx`, `ServiceWorkerInit.tsx`, `swRegister.ts`, `resilience-test/page.tsx`.

## Performance Optimizations

- **Rate-limited telemetry dispatch** bounds outbound network calls to 5 per 30s regardless of how many errors fire, preventing a cascading failure from also becoming a network-flooding incident.
- **`sendBeacon` over synchronous `fetch`** for error dispatch, avoiding blocking or racing the page's unload/navigation.
- **Vitals observers disconnect themselves once finalized** (LCP on first input/tab-hide, CLS/INP on `visibilitychange`), so none of the five `PerformanceObserver` instances keep running indefinitely after their metric is captured.
- **Auto-retry and manual retry both reset local component state only** — recovering a `GranularErrorBoundary` never triggers a full page reload or remounts anything outside the failed widget's subtree.
- **Service worker registration deferred and gated**, so it never runs — and never fights the dev server — outside of production or an explicit opt-in flag.

## Running the Project

```bash
npm install
npm run dev
```

Then visit `http://localhost:3000/workspaces/ws-001/resilience-test` and open the browser console. Work through each section (A–E) to verify:

- Crashing one widget in Section A never affects its siblings.
- The Section B chunk-load simulation recovers the same way.
- Section C's intentionally-unwrapped widget escalates to the `(dashboard)/error.tsx` route boundary — confirm the rest of the shell (sidebar, header) stays mounted.
- Section D's floating promise rejection is caught only by `errorLogger`'s global listener, never by a boundary — check the console/network tab for the telemetry payload.
- Section E's layout shift is visible and gets flagged in the console by `webVitals.ts` once wired in.

## Future Improvements

- **Automated Chunk Load Error Auto-Healer** (bonus challenge, not yet implemented): intercept script-loading failures caused by stale deployment asset hashes, verify a version mismatch via a lightweight endpoint check, and trigger one silent background refresh — `swRegister.ts`'s `updatefound`/`statechange` listener currently only logs that a new version is available rather than acting on it.
- **Wire up the offline PWA layer.** `public/sw.js` (the actual service worker file with the caching/offline-shell strategy) was not part of this deliverable set, and `ServiceWorkerInit` is built but not yet mounted in `app/layout.tsx` — right now `registerServiceWorker()` would 404 against `/sw.js` if called. This is the main remaining gap in Task 06.
- Replace the mock `/api/telemetry/errors` sink with a real ingestion pipeline (Sentry, Datadog, or a custom store).
- Feed `webVitals.ts`'s `setVitalsReporter()` into the same telemetry dispatch path as `errorLogger.ts`, rather than only logging vitals to the console in development.
- Add automated tests asserting the Level 3 → Level 2 → Level 1 isolation guarantees (currently verified manually via `/resilience-test`), and regression tests around the CLS/INP threshold flagging.
- Extend `sanitize()`'s key-pattern list as new sensitive field names are introduced elsewhere in the app, since it's pattern-based rather than schema-driven.
