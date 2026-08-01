# AGENTS.md — Custom System Instructions for NextTransit AI Studio

## Project Overview
NextTransit is a mission-critical Fleet Operations, Telemetry Reconciliation, and Maintenance Decision Engine. It provides role-based access control (RBAC), real-time OBD-II diagnostic fault tracking, automated work order lifecycle management, inventory reservation, and strategic cost variance modeling.

---

## Core Domain Rules & Business Logic

### 1. Decision Engine Rules (R1 – R7)
When working on features or modifications in this applet, preserve and enforce the following mathematical and operational formulas:
* **Rule R1 (Emergency Stop / Red Alert):** Any active OBD fault categorized as `Critical` must immediately mark the vehicle status as `Unsafe / Red`, issue an emergency maintenance dispatch, and remove the vehicle from dispatch assignment.
* **Rule R2 (Schedule Conflict Prevention):** A vehicle scheduled for route departure within `3 days` that has open maintenance work orders triggers an operational conflict warning.
* **Rule R3 (Inventory Reservation System):** Creating a Work Order automatically reserves linked parts from inventory. Closing a Work Order permanently deducts stock. Low-stock thresholds trigger automated purchase order requisitions.
* **Rule R4 (Total Cost of Repair Formula):** `Total Work Order Cost = (Labor Hours × Hourly Rate) + SUM(Part Quantity × Part Unit Cost)`.
* **Rule R5 (CAE Budget Prioritization Metric):** `Priority Score = (Critical Severity Factor × 40%) + (Days Until Route × 30%) + (ROI / Cost Ratio × 30%)`.
* **Rule R6 (Telemetry Reconciliation / Driver Incident Audit):** Any driver-reported incident without a matching electronic OBD-II fault code automatically generates an **R6 Investigation Work Order** to catch non-electronic mechanical issues.
* **Rule R7 (Strategic Fleet Health Variance Analysis):** Compare actual maintenance expenditure against projected budget across engine, electrical, brake, and chassis systems.

---

## Technical Stack & Architecture Guidelines

* **Frontend Framework:** React 18+ with Vite and TypeScript (strict typing required).
* **Styling:** Tailwind CSS with modern neutral palettes, high-contrast dark and light surface layouts, generous spacing, and refined typography pairings.
* **Backend & Persistence:** Supabase (`@supabase/supabase-js`) for cloud synchronization, along with client-side reactive React context (`FleetContext`).
* **Iconography:** Strictly use `lucide-react` icons.

---

## User Roles & Navigation Controls (RBAC)

Ensure that all UI elements respect the following role permissions:
1. **Director:** High-level strategic metrics, budget variance, and executive approval panels.
2. **Fleet Manager / Technical Controller:** Full operational access to vehicle health, diagnostics, work order dispatch, and R1–R7 rule overrides.
3. **Management Controller:** Financial summaries, cost breakdowns, labor rates, and supplier requisitions.
4. **Logistics Controller:** Inventory levels, parts allocation, stock buffer alerts, and warehouse requisitions.
5. **Mechanic (Workshop):** Assigned work order queue, mobile OBD scanner simulator, and completion logs.
6. **Driver:** Pre-trip inspection logger and R6 driver incident reporter.

---

## Developer Principles

* **No Unsolicited Features:** Build precisely what is requested. Keep the layout focused, clean, and scannable.
* **Zero Broken Handlers:** Ensure all interactive elements, modal toggles, and form actions are fully wired with active state logic.
* **Type Safety:** Always run linter checks and ensure zero TypeScript errors (`tsc --noEmit`).
