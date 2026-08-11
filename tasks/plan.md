# Implementation Plan: Internal Inventory & Order Management Dashboard

## Overview
A high-efficiency, offline-first admin dashboard for single-user inventory, customer CRM, order management (Kanban & Table), RajaOngkir shipping calculation, and DP/Keep fund freezing system. Built using Next.js 16 (App Router), SQLite, Prisma ORM, and local filesystem storage.

## Architecture Decisions
- **Framework & Routing:** Next.js App Router (`/app/dashboard/...` for Admin UI, `/app/api/...` for Route Handlers).
- **Database:** SQLite via Prisma ORM (`prisma/dev.db`). Zero external database service dependency.
- **File Storage:** Local File System (`public/uploads/`) with lightweight image optimization.
- **Shipping API:** RajaOngkir Integration (Komerce & Starter fallback) supporting instant search & dropdown selection.
- **State & UI System:** Client-side state + Server API handlers, responsive dark/light UI, keyboard-friendly navigation.

## Task List & Phases

### Phase 1: Database & API Core Enhancement
- [ ] **Task 1: Schema & Model Refinements** (Add tracking number `trackingNo` to Order, `notes`/`dpForfeited` flag, and verify relations).
- [ ] **Task 2: Product Management API Endpoints** (CRUD: GET with filters, POST with image upload & optimization, PUT/PATCH update, DELETE validation).
- [ ] **Task 3: Customer Management API Endpoints** (CRUD: GET with search/history, POST create, PUT/PATCH update, DELETE with active transaction checks).

### Checkpoint 1: Foundation Verification
- [ ] Prisma schema pushed cleanly, all API route handlers tested and verified via build and curl/fetch.

### Phase 2: Order, Kanban & DP/Keep System API
- [ ] **Task 4: Order Management & Calculation API** (Multi-product checkout, auto-sum weight & price, RajaOngkir cost integration, cancellation stock reversal).
- [ ] **Task 5: DP / Keep System & Forfeit API** (Record DP, calculate remaining balance, DP status tracking, forfeit DP and release stock).

### Checkpoint 2: Core Logic & Transaction Verification
- [ ] All atomic transactions verified (Stock reservation, cancellation reversal, DP forfeit).

### Phase 3: Admin UI Dashboard & Navigation Layout
- [ ] **Task 6: Admin Dashboard Layout & Navigation** (Sidebar, Topbar, Global Search, Dashboard KPI Summary).
- [ ] **Task 7: Product Management UI** (Katalog etalase, Filter status grid/table, Modal tambah/edit produk dengan preview foto, Delete modal).
- [ ] **Task 8: Customer CRM UI** (Daftar pelanggan, Autocomplete search, Modal Tambah/Edit Alamat dengan RajaOngkir, Riwayat Transaksi per Pelanggan).

### Phase 4: Order Kanban, Checkout & DP Monitor UI
- [ ] **Task 9: Order & Checkout Flow UI** (Multi-product selector, Auto weight & shipping calculator, Create Order modal).
- [ ] **Task 10: Kanban Board & Order Table UI** (Drag-and-drop / Status change pipeline: Keep -> DP -> Siap Packing -> Shipped -> Cancelled, Resi input).
- [ ] **Task 11: DP / Keep Fund Monitor UI** (Dashboard monitor dana dibekukan, aging alert indicator, Pelunasan action, Forfeit DP action).

### Phase 5: Polish & NFR Optimization
- [ ] **Task 12: Image Optimization & System Performance** (Local file compression/resize, offline fallback handling, clean error handling).

### Checkpoint 3: End-to-End System Verification
- [ ] Complete Happy Path flow tested (Product creation -> Customer selection -> Checkout -> DP Keep -> Pelunasan / Forfeit -> Shipping).
- [ ] Production build clean (`npm run build`).

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| RajaOngkir API offline/unreachable in local environment | Medium | Local fallback cache for city/province data & graceful offline error notices |
| SQLite locking during concurrent operations | Low | Single admin user workload; Prisma interactive transactions handle atomicity |
| Local image storage growing too large | Medium | Automatic image canvas compression & size limiting on upload |
