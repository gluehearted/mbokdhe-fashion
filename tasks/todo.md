# Task Checklist: Internal Inventory & Order Management Dashboard

## Phase 1: Database & API Core Enhancement

### Task 1: Prisma Schema Refinement & Migration
- **Description:** Enhance Prisma schema to include optional `trackingNo` (nomor resi), `notes`, and ensure proper cascade/relation safeguards.
- **Acceptance criteria:**
  - [x] `Order` model has `trackingNo` (String?), `notes` (String?), and `dpAmount` (Int).
  - [x] Schema compiles and syncs with `npx prisma db push`.
- **Verification:**
  - [x] Run `npx prisma db push` without errors.
- **Dependencies:** None
- **Files touched:** `prisma/schema.prisma`
- **Scope:** S (1 file)

---

### Task 2: Product Management API Endpoints (FR-01)
- **Description:** Complete CRUD API route handlers for Product management.
- **Acceptance criteria:**
  - [x] `GET /api/products`: List products with status filter (`Available`, `Booked`, `Sold`).
  - [x] `POST /api/products`: Create product with custom ID, shop origin, weight, price, and photo upload.
  - [x] `PUT/PATCH /api/products/[id]`: Edit product details (disallowed if status is `Sold`).
  - [x] `DELETE /api/products/[id]`: Permanently delete product if not attached to active sold order.
- **Verification:**
  - [x] Test endpoints via API tests / `npm run build`.
- **Dependencies:** Task 1
- **Files touched:**
  - `app/api/products/route.ts`
  - `app/api/products/[id]/route.ts`
- **Scope:** S (2 files)

---

### Task 3: Customer Management API Endpoints (FR-02)
- **Description:** Complete CRUD API route handlers for Customer CRM.
- **Acceptance criteria:**
  - [x] `GET /api/customers`: List customers, search autocomplete by WhatsApp or Name, include order count.
  - [x] `POST /api/customers`: Create customer with Name, WhatsApp (unique), Address Detail, City ID.
  - [x] `PUT/PATCH /api/customers/[id]`: Edit customer details.
  - [x] `DELETE /api/customers/[id]`: Delete customer (returns 400 error if active ongoing orders exist).
- **Verification:**
  - [x] Test customer API handlers & validation logic.
- **Dependencies:** Task 1
- **Files touched:**
  - `app/api/customers/route.ts`
  - `app/api/customers/[id]/route.ts`
- **Scope:** S (2 files)

---

## Checkpoint 1: Foundation Verification
- [x] `npx prisma db push` succeeds.
- [x] Product & Customer CRUD APIs build cleanly (`npm run build`).

---

## Phase 2: Order, Kanban & DP/Keep System API

### Task 4: Order Management & Checkout API (FR-03)
- **Description:** Handle multi-product checkout, automatic weight summation, RajaOngkir shipping calculation integration, and order status transitions.
- **Acceptance criteria:**
  - [x] `POST /api/orders`: Create order with Customer, multiple Product IDs, auto weight summation, shipping cost, total calculation, and atomic product status update to `Booked`.
  - [x] `GET /api/orders`: Fetch orders with customer and products details.
  - [x] `PATCH /api/orders/[id]`: Update order status, courier, tracking number (`trackingNo`). If status is `Cancelled`, atomically revert products to `Available`.
- **Verification:**
  - [x] Test order creation & cancellation product stock reversal logic.
- **Dependencies:** Task 2, Task 3
- **Files touched:**
  - `app/api/orders/route.ts`
  - `app/api/orders/[id]/route.ts`
- **Scope:** M (2 files)

---

### Task 5: DP / Keep System & Forfeit API (FR-04)
- **Description:** Dedicated API handlers to record DP freeze, calculate remaining balance, monitor aging DP, and forfeit DP.
- **Acceptance criteria:**
  - [x] `POST /api/orders/[id]/dp`: Record DP payment, update status to `Keep`/`DP`, calculate remaining tagihan (`totalPrice - dpAmount`).
  - [x] `POST /api/orders/[id]/forfeit`: Forfeit DP, mark DP as forfeited in notes/status, revert products back to `Available`.
  - [x] `POST /api/orders/[id]/settle`: Record pelunasan payment, change order status to `Siap_Packing` and products to `Sold`.
- **Verification:**
  - [x] Test DP freeze, pelunasan, and forfeit workflow.
- **Dependencies:** Task 4
- **Files touched:**
  - `app/api/orders/[id]/dp/route.ts`
  - `app/api/orders/[id]/forfeit/route.ts`
  - `app/api/orders/[id]/settle/route.ts`
- **Scope:** M (3 files)

---

## Checkpoint 2: Core Logic & Transaction Verification
- [x] All API handlers for Products, Customers, Orders, and DP/Keep System are implemented.
- [x] `npm run build` passes with zero errors.

---

## Phase 3: Admin UI Dashboard & Navigation Layout

### Task 6: Admin Layout & Navigation Shell
- **Description:** Build high-efficiency Admin Dashboard layout with sidebar navigation, topbar metrics, quick action shortcuts, and global search.
- **Acceptance criteria:**
  - [x] Sidebar navigation links: Dashboard Overview, Produk (Inventaris), Pelanggan (CRM), Pesanan (Kanban & Table), DP / Keep Monitor.
  - [x] KPI Summary Cards (Total Products Available, Active Keep/DP Count, Total Orders Pending, Monthly Revenue).
  - [x] Fast keyboard-friendly navigation.
- **Verification:**
  - [x] Render layout and test navigation links.
- **Dependencies:** None
- **Files touched:**
  - `app/dashboard/layout.tsx`
  - `app/dashboard/page.tsx`
  - `components/Sidebar.tsx`
  - `components/Topbar.tsx`
- **Scope:** M (4 files)

---

### Task 7: Product Management UI (FR-01)
- **Description:** Complete Admin interface for Product inventory management (Katalog, Filter, Create/Edit Modal, Delete confirmation).
- **Acceptance criteria:**
  - [x] Product Grid & Table View with status tabs (Semua, Tersedia, Dibekukan/Keep, Terjual).
  - [x] Modal Tambah Produk dengan preview foto lokal, custom ID, toko asal, berat, harga.
  - [x] Modal Edit Produk & Hapus Produk.
- **Verification:**
  - [x] Manual test product creation, edit, filter, and deletion.
- **Dependencies:** Task 2, Task 6
- **Files touched:**
  - `app/dashboard/products/page.tsx`
  - `components/ProductModal.tsx`
- **Scope:** M (2 files)

---

### Task 8: Customer CRM UI (FR-02)
- **Description:** Complete Admin interface for Customer CRM with WhatsApp autocomplete search and RajaOngkir address selector.
- **Acceptance criteria:**
  - [x] Customer Table View with transaction count and WhatsApp contact action.
  - [x] Autocomplete search bar by WhatsApp or Name.
  - [x] Modal Tambah/Edit Pelanggan dengan integrasi RajaOngkir city selector (Dropdown & Direct Search).
- **Verification:**
  - [x] Manual test customer creation and autocomplete search.
- **Dependencies:** Task 3, Task 6
- **Files touched:**
  - `app/dashboard/customers/page.tsx`
  - `components/CustomerModal.tsx`
- **Scope:** M (2 files)

---

## Phase 4: Order Kanban, Checkout & DP Monitor UI

### Task 9: Order Checkout UI (FR-03)
- **Description:** Order creation interface allowing multi-product selection, customer selection, auto weight sum, and RajaOngkir courier selection.
- **Acceptance criteria:**
  - [x] Multi-product selector from Available products catalog.
  - [x] Auto sum of total package weight in grams/kg.
  - [x] Live RajaOngkir rate calculation (JNE, POS, TIKI).
  - [x] Checkout submission creating Order in Prisma SQLite.
- **Verification:**
  - [x] Create order and verify total calculation and database record.
- **Dependencies:** Task 4, Task 7, Task 8
- **Files touched:**
  - `app/dashboard/orders/new/page.tsx`
  - `components/OrderCheckoutForm.tsx`
- **Scope:** M (2 files)

---

### Task 10: Order Kanban Board & Table Pipeline (FR-03)
- **Description:** Kanban Board and Table View for managing order status pipeline (Keep -> DP -> Siap Packing -> Shipped -> Cancelled).
- **Acceptance criteria:**
  - [x] Kanban Columns: Keep, DP, Siap Packing, Shipped, Cancelled.
  - [x] Drag-and-Drop or 1-click status move.
  - [x] Quick update for Shipping Resi Number (`trackingNo`).
  - [x] Cancel order action reverting attached products back to `Available`.
- **Verification:**
  - [x] Test status transitions and resi updates on Kanban board.
- **Dependencies:** Task 4, Task 9
- **Files touched:**
  - `app/dashboard/orders/page.tsx`
  - `components/KanbanBoard.tsx`
  - `components/OrderCard.tsx`
- **Scope:** M (3 files)

---

### Task 11: DP / Keep Fund Monitor UI (FR-04)
- **Description:** Dedicated DP/Keep Monitor dashboard displaying frozen funds, customer info, aging indicators, Pelunasan action, and Forfeit action.
- **Acceptance criteria:**
  - [x] List of all active DP/Keep orders with days elapsed counter (aging alert).
  - [x] Total Frozen Funds (Total DP) KPI summary.
  - [x] Pelunasan action modal (records full payment -> moves to `Siap_Packing`).
  - [x] Forfeit DP action modal (marks DP forfeit -> returns products to `Available`).
- **Verification:**
  - [x] Test pelunasan and forfeit actions on DP monitor page.
- **Dependencies:** Task 5, Task 10
- **Files touched:**
  - `app/dashboard/keep-monitor/page.tsx`
  - `components/DPActionModal.tsx`
- **Scope:** M (2 files)

---

## Phase 5: Polish & System Optimization

### Task 12: Image Compression & Performance Polish
- **Description:** Optimize local image uploads with lightweight canvas/sharp compression, clean error toasts, and offline readiness.
- **Acceptance criteria:**
  - [x] Client-side or server-side image size optimization before saving to `/public/uploads/`.
  - [x] Toast notification system for fast feedback (success/error messages).
  - [x] Full project `npm run build` clean verification.
- **Verification:**
  - [x] Run `npm run build` and test complete workflow.
- **Dependencies:** Tasks 1-11
- **Files touched:**
  - `lib/image.ts`
  - `components/Toast.tsx`
- **Scope:** S (2 files)

---

## Checkpoint 3: Complete System Sign-Off
- [x] All acceptance criteria met across FR-01, FR-02, FR-03, and FR-04.
- [x] Happy path workflow (Tambah produk -> Checkout -> DP Keep -> Pelunasan / Forfeit -> Resi -> Shipped) verified.
- [x] Build succeeds with zero errors (`npm run build`).
