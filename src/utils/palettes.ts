export interface PalettePreset {
  id: string;
  name: string;
  author?: string;
  colors: string[];
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'pico-8',
    name: 'PICO-8 (16)',
    author: 'Lexaloffle',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ],
  },
  {
    id: 'gameboy',
    name: 'Game Boy Classic (4)',
    author: 'Nintendo',
    colors: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'],
  },
  {
    id: 'sweetie-16',
    name: 'Sweetie 16',
    author: 'GrafxKid',
    colors: [
      '#1A1C2C', '#5D275D', '#B13E53', '#EF7D57',
      '#FFCD75', '#A7F070', '#38B764', '#257179',
      '#29366F', '#3B5DC9', '#41A6F6', '#73EFF7',
      '#F4F4F4', '#94B0C2', '#566C86', '#333C57'
    ],
  },
  {
    id: 'endesga-32',
    name: 'EDG 32',
    author: 'Endesga',
    colors: [
      '#BE4A2F', '#D77643', '#EAD4AA', '#E4A672',
      '#B86F50', '#733E39', '#3E2731', '#A22633',
      '#E43B44', '#F77622', '#FEE761', '#63C74D',
      '#3E8948', '#265C42', '#193C3E', '#124E89',
      '#0099DB', '#2CE8F5', '#FFFFFF', '#C0CBDC',
      '#8B9BB4', '#5A6988', '#3A4466', '#262B44',
      '#181425', '#FF0044', '#68386C', '#B55088',
      '#F6757A', '#E8B796', '#C28569', '#493C2B'
    ],
  },
  {
    id: 'c64',
    name: 'Commodore 64 (16)',
    author: 'Commodore',
    colors: [
      '#000000', '#FFFFFF', '#880000', '#AAFFEE',
      '#CC44CC', '#00CC55', '#0000AA', '#EEEE77',
      '#DD8855', '#664400', '#FF7777', '#333333',
      '#777777', '#AAFF66', '#0088FF', '#BBBBBB'
    ],
  },
  {
    id: 'cyberpunk',
    name: 'Neon Cyberpunk (12)',
    author: 'SpriteLab',
    colors: [
      '#0A0B10', '#1B1425', '#491842', '#861B58',
      '#C71F5C', '#FF2E7E', '#FF7B00', '#FFD000',
      '#00F0FF', '#00A8FF', '#7000FF', '#FFFFFF'
    ],
  },
  {
    id: 'solar-envy',
    name: 'Solar Envy (8)',
    author: 'Davit Masia',
    colors: [
      '#181425', '#262B44', '#5A6988', '#8B9BB4',
      '#63C74D', '#FEE761', '#F77622', '#E43B44'
    ],
  },
];
