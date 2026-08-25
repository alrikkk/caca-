-- ==============================================================================
-- Caca: Hackathon Seed Projects & UUID Mapping
-- ==============================================================================

-- 1. Insert placeholder system creator profile if not exists
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    college,
    major,
    grad_year,
    experience_level,
    working_style
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'lead@caca.hackathon',
    'Project Lead',
    'Stanford University',
    'Computer Science',
    2026,
    'senior',
    'collaborative'
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Seed Projects
INSERT INTO public.projects (
    id,
    owner_id,
    title,
    tagline,
    description,
    category,
    status,
    max_team_size,
    duration_weeks,
    hours_per_week,
    banner_url
) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'EchoSpatial: Spatial Audio for Visual Impairment',
    'Real-time binaural spatial audio for navigation using LiDAR point clouds',
    'Building an edge-processed assistive vision wearable that converts iPad/iPhone LiDAR meshes into 3D spatial acoustic landmarks.',
    'Assistive Tech & Vision',
    'recruiting',
    4,
    8,
    15,
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'
),
(
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'KubePulse: eBPF-Driven Distributed Kernel Tracing',
    'Zero-overhead observability pipeline for multi-cluster microservices in Rust & Go',
    'High-performance kernel tracer collecting L4/L7 socket events using eBPF probes and streaming traces directly to an in-memory OLAP store.',
    'Systems & Infrastructure',
    'recruiting',
    3,
    6,
    12,
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80'
),
(
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'SynapseGraph: Adaptive Neural Knowledge Maps',
    'Graph RAG engine synthesizing academic textbook graphs into interactive study pathways',
    'Educational intelligence platform combining dense vector search and hierarchical graph layouts to synthesize research papers into mastery roadmaps.',
    'EdTech & Knowledge Graphs',
    'recruiting',
    4,
    10,
    10,
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80'
),
(
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'AetherFold: Cryo-EM Protein Structure Predictor',
    'Lightweight diffusion pipeline for single-particle Cryo-EM 3D reconstruction',
    'Accelerating cryo-electron microscopy pipeline with SE(3)-equivariant diffusion models to reconstruct protein densities on consumer GPUs.',
    'Biotech & Scientific Computing',
    'recruiting',
    3,
    12,
    14,
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80'
),
(
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'PulseFlow: Autonomous Micro-Liquidity Router',
    'Multi-hop atomic swap routing on L2s with intent-based batch auctions in Solidity',
    'Developing an MEV-resistant intent settlement layer for cross-rollup state execution with automated rebalancing arbitrage bots.',
    'Fintech & Smart Contracts',
    'recruiting',
    3,
    6,
    12,
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=80'
)
ON CONFLICT (id) DO NOTHING;
