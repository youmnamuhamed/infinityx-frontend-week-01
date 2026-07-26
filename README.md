# Infinity X Enterprise Cloud Portal — Week 01

Frontend internship deliverables for **Infinity X Solutions**, built with Next.js App Router (v16) and TypeScript. This document covers both tasks completed in Week 1:

- **Task 01** — App Router architecture & dynamic portal layout system
- **Task 02** — Headless, high-performance virtualized data grid

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
