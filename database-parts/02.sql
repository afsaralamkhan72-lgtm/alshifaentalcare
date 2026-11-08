SET check_function_bodies = false;
SET search_path = public, extensions;
-- ===== PART A: EXTENSIONS =====
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

