-- ============================================================
-- Migración 005: Catálogo de plantas de interior
-- Crea tabla plant_species y la llena con ~45 plantas
-- identificadas desde la biblioteca visual del proyecto.
-- ============================================================

-- 1. Crear tabla plant_species
create table if not exists public.plant_species (
  id            uuid primary key default gen_random_uuid(),
  common_name   text not null,
  scientific_name text,
  category      text not null default 'interior',
  subcategory   text check (subcategory in ('tropical','trepadora','palmera','pequena','suculenta','cactus','helecho','otra')),
  light_need    text check (light_need in ('sol_directo','luz_indirecta','media_luz','sombra')),
  water_frequency text check (water_frequency in ('diario','cada_2_dias','semanal','quincenal')),
  ideal_temp_min  int,
  ideal_temp_max  int,
  ideal_humidity_min int,
  ideal_humidity_max int,
  created_at    timestamptz not null default now()
);

-- RLS: cualquier usuario autenticado puede leer, nadie puede modificar desde cliente
alter table public.plant_species enable row level security;

drop policy if exists species_select_all on public.plant_species;
create policy species_select_all on public.plant_species
  for select using (auth.role() = 'authenticated');

-- 2. Insertar catálogo completo
insert into public.plant_species
  (common_name, scientific_name, category, subcategory,
   light_need, water_frequency,
   ideal_temp_min, ideal_temp_max, ideal_humidity_min, ideal_humidity_max)
values

-- ── TROPICALES ──────────────────────────────────────────────
('Costilla de Adán',        'Monstera deliciosa',             'interior', 'tropical',   'media_luz',    'semanal',     18, 27, 40, 70),
('Monstera Suizo',          'Monstera adansonii',             'interior', 'tropical',   'media_luz',    'semanal',     18, 27, 40, 70),
('Filodendro Corazón',      'Philodendron hederaceum',        'interior', 'tropical',   'media_luz',    'semanal',     18, 25, 40, 60),
('Filodendro Birkin',       'Philodendron birkin',            'interior', 'tropical',   'media_luz',    'semanal',     18, 25, 40, 60),
('Filodendro Glorioso',     'Philodendron gloriosum',         'interior', 'tropical',   'media_luz',    'semanal',     18, 25, 50, 70),
('Calathea Ornata',         'Calathea ornata',                'interior', 'tropical',   'sombra',       'cada_2_dias', 18, 24, 50, 80),
('Calathea Orbifolia',      'Calathea orbifolia',             'interior', 'tropical',   'sombra',       'cada_2_dias', 18, 24, 50, 80),
('Calathea Lancifolia',     'Calathea lancifolia',            'interior', 'tropical',   'sombra',       'cada_2_dias', 18, 24, 50, 80),
('Calathea Zebrina',        'Calathea zebrina',               'interior', 'tropical',   'sombra',       'cada_2_dias', 18, 24, 50, 80),
('Maranta',                 'Maranta leuconeura',             'interior', 'tropical',   'sombra',       'cada_2_dias', 18, 24, 50, 80),
('Alocasia Polly',          'Alocasia amazonica',             'interior', 'tropical',   'luz_indirecta','semanal',     18, 27, 60, 80),
('Alocasia Gigante',        'Alocasia macrorrhiza',           'interior', 'tropical',   'luz_indirecta','semanal',     18, 27, 60, 80),
('Anturio',                 'Anthurium andreanum',            'interior', 'tropical',   'luz_indirecta','semanal',     18, 27, 60, 80),
('Lirio de Paz',            'Spathiphyllum wallisii',         'interior', 'tropical',   'sombra',       'cada_2_dias', 18, 27, 50, 70),
('Aglaonema',               'Aglaonema commutatum',           'interior', 'tropical',   'sombra',       'semanal',     18, 27, 40, 70),
('Difenbaquia',             'Dieffenbachia seguine',          'interior', 'tropical',   'media_luz',    'semanal',     18, 27, 40, 70),
('Ave del Paraíso',         'Strelitzia reginae',             'interior', 'tropical',   'luz_indirecta','semanal',     18, 27, 40, 60),

-- ── TREPADORAS Y COLGANTES ───────────────────────────────────
('Pothos Dorado',           'Epipremnum aureum',              'interior', 'trepadora',  'sombra',       'semanal',     15, 27, 40, 70),
('Pothos Mármol',           'Epipremnum aureum Marble Queen', 'interior', 'trepadora',  'media_luz',    'semanal',     15, 27, 40, 70),
('Pothos Neón',             'Epipremnum aureum Neon',         'interior', 'trepadora',  'media_luz',    'semanal',     15, 27, 40, 70),
('Pothos Plateado',         'Scindapsus pictus',              'interior', 'trepadora',  'media_luz',    'semanal',     15, 27, 40, 70),
('Tradescantia Cebra',      'Tradescantia zebrina',           'interior', 'trepadora',  'luz_indirecta','cada_2_dias', 15, 25, 40, 60),
('Tradescantia Nanouk',     'Tradescantia fluminensis Nanouk','interior', 'trepadora',  'luz_indirecta','cada_2_dias', 15, 25, 40, 60),
('Singonio',                'Syngonium podophyllum',          'interior', 'trepadora',  'media_luz',    'semanal',     18, 27, 40, 70),
('Mala Madre',              'Chlorophytum comosum',           'interior', 'trepadora',  'sombra',       'semanal',     15, 25, 40, 70),
('Hiedra',                  'Hedera helix',                   'interior', 'trepadora',  'sombra',       'semanal',     10, 20, 40, 70),

-- ── PALMERAS Y PLANTAS GRANDES ───────────────────────────────
('Ficus Hoja de Violín',    'Ficus lyrata',                   'interior', 'palmera',    'luz_indirecta','semanal',     18, 27, 30, 65),
('Ficus Robusta',           'Ficus elastica',                 'interior', 'palmera',    'luz_indirecta','semanal',     15, 27, 30, 65),
('Ficus Benjamina',         'Ficus benjamina',                'interior', 'palmera',    'luz_indirecta','semanal',     15, 25, 30, 65),
('Lengua de Suegra',        'Dracaena trifasciata',           'interior', 'palmera',    'sombra',       'quincenal',   15, 27, 30, 70),
('Dracaena Marginata',      'Dracaena marginata',             'interior', 'palmera',    'luz_indirecta','semanal',     18, 27, 30, 60),
('Palmera Bambú',           'Chamaedorea seifrizii',          'interior', 'palmera',    'sombra',       'semanal',     18, 27, 40, 70),

-- ── PEQUEÑAS / MESA ──────────────────────────────────────────
('Peperomia Sandía',        'Peperomia argyreia',             'interior', 'pequena',    'luz_indirecta','semanal',     18, 24, 40, 60),
('Peperomia Baby Rubber',   'Peperomia obtusifolia',          'interior', 'pequena',    'luz_indirecta','semanal',     18, 24, 40, 60),
('Pilea China',             'Pilea peperomioides',            'interior', 'pequena',    'luz_indirecta','semanal',     15, 25, 40, 60),
('Begonia Rex',             'Begonia rex',                    'interior', 'pequena',    'luz_indirecta','cada_2_dias', 15, 25, 50, 70),

-- ── SUCULENTAS ───────────────────────────────────────────────
('Echeveria',               'Echeveria spp.',                 'suculenta','suculenta',  'sol_directo',  'quincenal',   10, 27, 10, 50),
('Haworthia',               'Haworthia fasciata',             'suculenta','suculenta',  'luz_indirecta','quincenal',   10, 27, 10, 50),
('Aloe Vera',               'Aloe barbadensis miller',        'suculenta','suculenta',  'sol_directo',  'quincenal',   10, 30, 10, 50),
('Árbol de Jade',           'Crassula ovata',                 'suculenta','suculenta',  'sol_directo',  'semanal',     10, 25, 10, 50),
('Collar de Perlas',        'Senecio rowleyanus',             'suculenta','suculenta',  'luz_indirecta','semanal',     10, 25, 10, 50),
('Kalanchoe',               'Kalanchoe blossfeldiana',        'suculenta','suculenta',  'sol_directo',  'semanal',     15, 27, 20, 60),

-- ── CACTUS ───────────────────────────────────────────────────
('Cactus de Navidad',       'Schlumbergera bridgesii',        'cactus',   'cactus',     'luz_indirecta','semanal',     15, 25, 40, 60),
('Mammillaria',             'Mammillaria spp.',               'cactus',   'cactus',     'sol_directo',  'quincenal',   10, 30, 10, 30),
('Nopal',                   'Opuntia spp.',                   'cactus',   'cactus',     'sol_directo',  'quincenal',   10, 35, 10, 30);

-- Índices para búsqueda
create index if not exists idx_plant_species_name
  on public.plant_species (common_name);

create index if not exists idx_plant_species_subcategory
  on public.plant_species (subcategory);
