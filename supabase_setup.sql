-- Jalankan file ini di Supabase SQL Editor.
-- CSV benar yang digunakan: AllConcession(1).csv dengan status: Waiting PPKH and RKAB, Plan Exploration, Mining Operation, Supporting Facilities Construction.
-- Struktur tabel yang dipakai website:
-- code, company, area, commodity, province, status, geometry, geom

create extension if not exists postgis with schema extensions;

-- Jika tabel belum dibuat, jalankan ini sebelum import CSV.
create table if not exists public.concessions_raw (
  id bigserial primary key,
  code text,
  company text,
  area numeric,
  commodity text,
  province text,
  status text,
  geometry text
);

-- Jalankan setelah CSV berhasil di-import.
alter table public.concessions_raw
add column if not exists geom geometry(MultiPolygon, 4326);

update public.concessions_raw
set geom = ST_GeomFromEWKB(decode(geometry, 'hex'))
where geometry is not null
  and geom is null;

create index if not exists concessions_raw_geom_gix
on public.concessions_raw
using gist (geom);

create or replace function public.get_concessions()
returns json
language sql
stable
as $$
  select json_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(
      json_agg(
        json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::json,
          'properties', json_build_object(
            'code', code,
            'company', company,
            'area', area,
            'commodity', commodity,
            'province', province,
            'status', status
          )
        )
      ) filter (where geom is not null),
      '[]'::json
    )
  )
  from public.concessions_raw;
$$;

-- Untuk project tanpa auth/RLS ketat, berikan akses baca RPC ke anon/authenticated.
grant usage on schema public to anon, authenticated;
grant execute on function public.get_concessions() to anon, authenticated;
grant select on public.concessions_raw to anon, authenticated;
