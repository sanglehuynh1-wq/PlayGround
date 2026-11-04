// ---------------------------------------------------------------------------
// THỦY CUNG — aquarium room data
// A hand-tuned catalogue of fish, foods, decorations and tanks.
// ---------------------------------------------------------------------------

export const SPECIES = {
  gar: {
    id: 'gar',
    name: 'Alligator Gar',
    vi: 'Cá Mập Hoa',
    group: 'predator',
    price: 780000,
    sizeCm: 90,
    body: 'gar',
    pattern: 'leopard',
    personality: 'Apex predator',
    desc: 'Armoured living fossil with a long snout and a taste for live prey.',
    colors: {
      base: '#75814f', back: '#4b5632', belly: '#d6cda0', fin: '#5b6b3d',
      accent: '#2b351d', fin2: '#93a066', eye: '#d9b84f', pupil: '#15180e'
    },
    drop: [55000, 120000],
    speed: 0.55
  },
  redtail: {
    id: 'redtail',
    name: 'Redtail Catfish',
    vi: 'Cá Hồng Vĩ',
    group: 'predator',
    price: 680000,
    sizeCm: 80,
    body: 'catfish',
    pattern: 'speckle',
    personality: 'Gentle giant',
    desc: 'Velvet-black body, flaming orange tail and an endless appetite.',
    colors: {
      base: '#333944', back: '#1b2028', belly: '#818d98', fin: '#d94b2d',
      accent: '#0c1015', fin2: '#f47a45', eye: '#e8c266', pupil: '#11151b'
    },
    drop: [50000, 110000],
    speed: 0.42
  },
  flowerhorn: {
    id: 'flowerhorn',
    name: 'King Kamfa Flowerhorn',
    vi: 'La Hán Vua Kamfa',
    group: 'predator',
    price: 1180000,
    sizeCm: 32,
    body: 'round',
    pattern: 'flowerhorn',
    personality: 'Show-off',
    desc: 'Royal-blue armour, cherry-red flush and a magnificent nuchal hump.',
    colors: {
      base: '#7f95a9', back: '#4e6479', belly: '#c5d4df', fin: '#d74953',
      accent: '#202932', fin2: '#f0777d', eye: '#f0d08a', pupil: '#151b21',
      red: '#de3f4c'
    },
    drop: [75000, 150000],
    speed: 0.5
  },
  channa_yellow: {
    id: 'channa_yellow',
    name: 'Channa Maru — Yellow',
    vi: 'Cá Lóc Hoàng Đế Vàng',
    group: 'predator',
    price: 520000,
    sizeCm: 45,
    body: 'elongated',
    pattern: 'blotch',
    personality: 'Ambush hunter',
    desc: 'Golden snakehead with ink-black marbling and a lightning strike.',
    colors: {
      base: '#d5a13a', back: '#896217', belly: '#f1d089', fin: '#ad7c24',
      accent: '#352710', fin2: '#ecc568', eye: '#f2d98d', pupil: '#1a1408'
    },
    drop: [45000, 95000],
    speed: 0.48
  },
  channa_red: {
    id: 'channa_red',
    name: 'Channa Maru — Red',
    vi: 'Cá Lóc Hoàng Đế Đỏ',
    group: 'predator',
    price: 620000,
    sizeCm: 45,
    body: 'elongated',
    pattern: 'blotch',
    personality: 'Ambush hunter',
    desc: 'A smoulder of crimson scales, always watching from the reeds.',
    colors: {
      base: '#bd4b38', back: '#6d1d18', belly: '#eda37d', fin: '#892b22',
      accent: '#2e0d0c', fin2: '#d97558', eye: '#f4d08d', pupil: '#1c0b09'
    },
    drop: [50000, 105000],
    speed: 0.48
  },
  channa_blue: {
    id: 'channa_blue',
    name: 'Channa Maru — Royal Blue',
    vi: 'Cá Lóc Hoàng Đế Xanh',
    group: 'predator',
    price: 860000,
    sizeCm: 45,
    body: 'elongated',
    pattern: 'blotch',
    personality: 'Ambush hunter',
    desc: 'Electric cobalt scales. The rarest snakehead on the rack.',
    colors: {
      base: '#3f70bf', back: '#173b79', belly: '#9dc1ef', fin: '#2a56a0',
      accent: '#0e2451', fin2: '#6b95d8', eye: '#f0da9a', pupil: '#0b1526'
    },
    drop: [65000, 135000],
    speed: 0.48
  },
  arowana_silver: {
    id: 'arowana_silver',
    name: 'Silver Arowana',
    vi: 'Kim Long Bạc',
    group: 'predator',
    price: 940000,
    sizeCm: 75,
    body: 'elongated',
    pattern: 'scales',
    personality: 'Surface glider',
    desc: 'A ribbon of liquid silver patrolling the top of the tank.',
    colors: {
      base: '#c6d0da', back: '#8a99aa', belly: '#f5f9fc', fin: '#a7b7c7',
      accent: '#5e7184', fin2: '#e9eff4', eye: '#1c2a36', pupil: '#0b1118'
    },
    drop: [65000, 140000],
    speed: 0.6
  },
  arowana_gold: {
    id: 'arowana_gold',
    name: '24K Golden Arowana',
    vi: 'Kim Long 24K',
    group: 'predator',
    price: 1650000,
    sizeCm: 75,
    body: 'elongated',
    pattern: 'scales',
    personality: 'Living treasure',
    desc: 'Every scale plated in 24-karat gold. A tank centrepiece.',
    colors: {
      base: '#e7b34a', back: '#b17416', belly: '#ffe59d', fin: '#d1932a',
      accent: '#85580f', fin2: '#ffe9ae', eye: '#2a1d08', pupil: '#150d03'
    },
    drop: [95000, 190000],
    speed: 0.6
  },
  arowana_red: {
    id: 'arowana_red',
    name: 'Super Red Arowana',
    vi: 'Kim Long Huyết Long',
    group: 'predator',
    price: 2250000,
    sizeCm: 75,
    body: 'elongated',
    pattern: 'scales',
    personality: 'Living treasure',
    desc: 'Deep ruby scales with a copper glow. The jewel of the room.',
    colors: {
      base: '#c33330', back: '#7c1316', belly: '#ef8b67', fin: '#a61f24',
      accent: '#5c0a0f', fin2: '#f4a07e', eye: '#f0cf8b', pupil: '#200a0a'
    },
    drop: [130000, 250000],
    speed: 0.6
  },
  betta_halfmoon: {
    id: 'betta_halfmoon',
    name: 'Halfmoon Betta',
    vi: 'Cá Betta Nửa Trăng',
    group: 'small',
    price: 185000,
    sizeCm: 6,
    body: 'betta',
    pattern: 'iridescent',
    finStyle: 'halfmoon',
    personality: 'Drama queen',
    desc: 'A 180-degree skirt of violet silk. Flares at its own reflection.',
    colors: {
      base: '#6c4cd7', back: '#38218d', belly: '#b9a6ff', fin: '#8b62ff',
      accent: '#23105d', fin2: '#d1baff', eye: '#171024', pupil: '#080510'
    },
    drop: [14000, 32000],
    speed: 0.7
  },
  betta_crown: {
    id: 'betta_crown',
    name: 'Crown Tail Betta',
    vi: 'Cá Betta Vương Miện',
    group: 'small',
    price: 165000,
    sizeCm: 6,
    body: 'betta',
    pattern: 'iridescent',
    finStyle: 'crown',
    personality: 'Tiny royalty',
    desc: 'Spiked crimson fin rays. Small fish, enormous attitude.',
    colors: {
      base: '#c22b3f', back: '#6e0f20', belly: '#f18b95', fin: '#e34a5c',
      accent: '#3c0711', fin2: '#ff9aa5', eye: '#f0d5a0', pupil: '#180508'
    },
    drop: [12000, 28000],
    speed: 0.7
  },
  panda_cory: {
    id: 'panda_cory',
    name: 'Panda Corydoras',
    vi: 'Cá Chuột Panda',
    group: 'small',
    price: 95000,
    sizeCm: 5,
    body: 'cory',
    pattern: 'panda',
    personality: 'Busy helper',
    desc: 'A tiny panda-masked bottom dweller that never stops tidying.',
    colors: {
      base: '#eadfc8', back: '#b8a88b', belly: '#fffaf0', fin: '#cfc0a4',
      accent: '#242424', fin2: '#e4d8be', eye: '#1b1b1b', pupil: '#080808'
    },
    drop: [7000, 18000],
    speed: 0.9
  },
  paradise: {
    id: 'paradise',
    name: 'Wild Paradise Fish',
    vi: 'Cá Lia Thia Đồng',
    group: 'small',
    price: 68000,
    sizeCm: 7,
    body: 'paradise',
    pattern: 'paradise',
    personality: 'Field legend',
    desc: 'The wild fighting fish of Vietnamese rice paddies. Striped, stubborn.',
    colors: {
      base: '#3d7bb5', back: '#1b4978', belly: '#e9a25c', fin: '#d95d3b',
      accent: '#122a44', fin2: '#f0b76c', eye: '#efe0b4', pupil: '#10151c'
    },
    drop: [6000, 15000],
    speed: 0.8
  }
};

export const SPECIES_LIST = Object.values(SPECIES);

export const FOODS = {
  pellets: {
    id: 'pellets',
    name: 'Micro Pellets',
    vi: 'Cám viên',
    short: 'PELLETS',
    group: 'small',
    price: 45000,
    pack: 25,
    boost: 34,
    color: '#d7a443',
    color2: '#8d5b18',
    desc: 'Staple nano-food. Small ornamental fish only — predators refuse it.',
    icon: 'pellets'
  },
  bloodworms: {
    id: 'bloodworms',
    name: 'Bloodworms',
    vi: 'Trùn chỉ',
    short: 'BLOODWORMS',
    group: 'any',
    price: 70000,
    pack: 20,
    boost: 30,
    color: '#d24c48',
    color2: '#7c1f24',
    desc: 'Frozen bloodworm cubes. A treat for every fish in the room.',
    icon: 'worms'
  },
  live: {
    id: 'live',
    name: 'Live Prey',
    vi: 'Mồi sống',
    short: 'LIVE PREY',
    group: 'predator',
    price: 150000,
    pack: 10,
    boost: 55,
    color: '#7fa7a4',
    color2: '#3d5f61',
    desc: 'Live feeder fish. Predator tanks only — the only food that truly satisfies them.',
    icon: 'live'
  },
  shrimp: {
    id: 'shrimp',
    name: 'Fresh Shrimp',
    vi: 'Tép tươi',
    short: 'SHRIMP',
    group: 'any',
    price: 120000,
    pack: 15,
    boost: 45,
    color: '#e77b58',
    color2: '#a03a29',
    desc: 'Hand-peeled fresh shrimp. Rich, clean and loved by everyone.',
    icon: 'shrimp'
  }
};

export const FOOD_ORDER = ['pellets', 'bloodworms', 'live', 'shrimp'];

export const DECOR = {
  driftwood: {
    id: 'driftwood',
    name: 'River Driftwood',
    vi: 'Lũa sông',
    price: 120000,
    beauty: 9,
    scale: 0.23,
    desc: 'Weathered mangrove root. Releases gentle tannins and character.'
  },
  seiryu: {
    id: 'seiryu',
    name: 'Seiryu Stone',
    vi: 'Đá Seiryu',
    price: 80000,
    beauty: 6,
    scale: 0.17,
    desc: 'Blue-grey mountain stone with crisp white veins.'
  },
  anubias: {
    id: 'anubias',
    name: 'Anubias Nana',
    vi: 'Anubias',
    price: 65000,
    beauty: 7,
    scale: 0.15,
    desc: 'Slow-growing broad leaves that thrive tied to driftwood.'
  },
  vallisneria: {
    id: 'vallisneria',
    name: 'Vallisneria',
    vi: 'Cỏ Thủy Sinh',
    price: 50000,
    beauty: 5,
    scale: 0.19,
    desc: 'Ribbons of bright green that sway in the filter current.'
  },
  lotus: {
    id: 'lotus',
    name: 'Red Tiger Lotus',
    vi: 'Bông Súng Đỏ',
    price: 95000,
    beauty: 8,
    scale: 0.16,
    desc: 'Burgundy lily pads that open toward the light.'
  },
  cave: {
    id: 'cave',
    name: 'Ceramic Cave',
    vi: 'Hang Gốm',
    price: 70000,
    beauty: 5,
    scale: 0.16,
    desc: 'A dark little sanctuary for shy bottom-dwellers.'
  }
};

export const DECOR_LIST = Object.values(DECOR);

export const TANK_BLUEPRINTS = [
  {
    id: 'P1', kind: 'large', name: 'AMAZON', code: 'P-01', sizeCm: 200,
    capacity: 4, cleanliness: 88, temp: 27.4, ph: 6.8, oxygen: 93,
    filter: true, beauty: 30,
    decor: [
      { type: 'driftwood', x: 0.24, y: 0.94, scale: 0.3, flip: false },
      { type: 'vallisneria', x: 0.72, y: 0.95, scale: 0.26, flip: false },
      { type: 'anubias', x: 0.36, y: 0.95, scale: 0.13, flip: true }
    ]
  },
  {
    id: 'P2', kind: 'large', name: 'MONSTER', code: 'P-02', sizeCm: 200,
    capacity: 4, cleanliness: 81, temp: 27.0, ph: 7.2, oxygen: 90,
    filter: true, beauty: 26,
    decor: [
      { type: 'seiryu', x: 0.7, y: 0.95, scale: 0.23, flip: false },
      { type: 'seiryu', x: 0.82, y: 0.96, scale: 0.15, flip: true },
      { type: 'anubias', x: 0.62, y: 0.96, scale: 0.13, flip: false }
    ]
  },
  {
    id: 'S1', kind: 'small', name: 'BETTA', code: 'N-01', sizeCm: 50,
    capacity: 2, cleanliness: 91, temp: 27.8, ph: 7.0, oxygen: 95,
    filter: true, beauty: 18,
    decor: [
      { type: 'lotus', x: 0.66, y: 0.96, scale: 0.2, flip: false },
      { type: 'seiryu', x: 0.25, y: 0.96, scale: 0.12, flip: false }
    ]
  },
  {
    id: 'S2', kind: 'small', name: 'PARADISE', code: 'N-02', sizeCm: 50,
    capacity: 3, cleanliness: 85, temp: 26.8, ph: 6.6, oxygen: 92,
    filter: true, beauty: 22,
    decor: [
      { type: 'vallisneria', x: 0.22, y: 0.96, scale: 0.25, flip: false },
      { type: 'driftwood', x: 0.7, y: 0.96, scale: 0.2, flip: true }
    ]
  },
  {
    id: 'S3', kind: 'small', name: 'PANDA', code: 'N-03', sizeCm: 50,
    capacity: 4, cleanliness: 93, temp: 26.2, ph: 7.1, oxygen: 96,
    filter: true, beauty: 16,
    decor: [
      { type: 'cave', x: 0.68, y: 0.97, scale: 0.18, flip: false },
      { type: 'anubias', x: 0.24, y: 0.96, scale: 0.12, flip: false }
    ]
  },
  {
    id: 'S4', kind: 'small', name: 'CROWN', code: 'N-04', sizeCm: 50,
    capacity: 2, cleanliness: 78, temp: 27.6, ph: 6.9, oxygen: 89,
    filter: true, beauty: 14,
    decor: [
      { type: 'lotus', x: 0.28, y: 0.96, scale: 0.18, flip: true },
      { type: 'seiryu', x: 0.72, y: 0.96, scale: 0.13, flip: false }
    ]
  },
  {
    id: 'S5', kind: 'small', name: 'NANO', code: 'N-05', sizeCm: 50,
    capacity: 3, cleanliness: 70, temp: 27.0, ph: 7.3, oxygen: 88,
    filter: false, beauty: 4,
    decor: []
  }
];

// Starter residents make the room feel alive on the first frame.
export const STARTER_FISH = [
  { speciesId: 'arowana_silver', tankId: 'P1', name: 'Bạc', sex: 'male', growth: 1 },
  { speciesId: 'redtail', tankId: 'P1', name: 'Lửa', sex: 'female', growth: 1 },
  { speciesId: 'flowerhorn', tankId: 'P2', name: 'Vua', sex: 'male', growth: 1 },
  { speciesId: 'channa_blue', tankId: 'P2', name: 'Lam', sex: 'female', growth: 1 },
  { speciesId: 'betta_halfmoon', tankId: 'S1', name: 'Mochi', sex: 'male', growth: 1 },
  { speciesId: 'paradise', tankId: 'S2', name: 'Lia', sex: 'male', growth: 1 },
  { speciesId: 'paradise', tankId: 'S2', name: 'Thia', sex: 'female', growth: 1 },
  { speciesId: 'panda_cory', tankId: 'S3', name: 'Bông', sex: 'female', growth: 1 },
  { speciesId: 'panda_cory', tankId: 'S3', name: 'Đốm', sex: 'male', growth: 1 },
  { speciesId: 'betta_crown', tankId: 'S4', name: 'Crown', sex: 'male', growth: 1 }
];

export const FISH_NAMES = [
  'Bông', 'Mochi', 'Lửa', 'Bạc', 'Vua', 'Lam', 'Đốm', 'Nắng', 'Mưa', 'Sao',
  'Rex', 'Nemo', 'Tí', 'Tép', 'Bơ', 'Sóc', 'Mây', 'Khói', 'Ruby', 'Tiger'
];

export const PALETTE = [
  '#070f14', '#0b1720', '#10222c', '#15303a', '#1b414b', '#24565e',
  '#2f6b70', '#3d837f', '#56a294', '#7bc0ab', '#a7dcc4', '#d9f0d7',
  '#e9d8b4', '#d9c08a', '#c5a361', '#a98247', '#85622f', '#5f4421',
  '#3d2b16', '#21160b', '#f6ead2', '#e8d4b0', '#d2b483', '#b58b5b',
  '#8c603c', '#65422a', '#42291b', '#c9d5dc', '#9aacba', '#6f8494',
  '#4a5f70', '#2c3d4b', '#dfe8ee', '#f7fbfd', '#5b6ef0', '#8393ff',
  '#b8c3ff', '#3f2c8f', '#6c4bd6', '#a385ff', '#c8302f', '#ef5a4c',
  '#ff9270', '#ffc09c', '#d79a2d', '#f4c95d', '#ffe9a6', '#3f7e4f',
  '#62a866', '#9acb85', '#cae7a5', '#11151c', '#202733', '#343e4c',
  '#596574', '#f0c9a0', '#d99a6c'
];
