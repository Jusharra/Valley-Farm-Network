-- Migration: fix_drivers_insert_rls
-- Adds the missing INSERT policy on public.drivers so that a driver-role
-- user can create their own record (profile_id must match auth.uid()).

create policy "Drivers can insert own profile"
  on public.drivers for insert
  with check (auth.uid() = profile_id);
