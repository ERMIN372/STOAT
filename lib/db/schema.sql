-- STOAT database schema.
--
-- Holds the catalogue (products) and ALL customer data (orders). Deploy this on
-- a Postgres instance located in the Russian Federation (152-ФЗ ст. 18 ч. 5).
-- Idempotent: safe to run repeatedly (used by `npm run db:migrate`).

-- Products / catalogue. The full Product object lives in `data` (JSONB); the
-- top-level columns exist for ordering and filtering only.
create table if not exists products (
  id          text primary key,                 -- slug, e.g. "core-logo-cap"
  name        text not null,
  price       integer not null,
  category    text not null,
  is_new      boolean not null default false,
  in_stock    boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  data        jsonb not null
);

create index if not exists products_category_idx on products (category);
create index if not exists products_order_idx on products (is_new desc, created_at desc);

-- Orders. Customer PII lives in `data` (JSONB); top-level columns are for the
-- admin list and lookups.
create table if not exists orders (
  order_id        text primary key,
  status          text not null,
  payment_status  text not null,
  total           integer not null,
  created_at      timestamptz not null default now(),
  data            jsonb not null
);

create index if not exists orders_created_idx on orders (created_at desc);

-- Idempotency markers for ЮKassa payment finalisation (replaces the previous
-- Sanity-based guard). No PII.
create table if not exists processed_payments (
  payment_id  text primary key,
  order_id    text,
  paid_at     timestamptz not null default now()
);
