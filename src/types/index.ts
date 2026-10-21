export type ToolType =
  | 'pencil'
  | 'eraser'
  | 'bucket'
  | 'eyedropper'
  | 'line'
  | 'rect'
  | 'filledRect'
  | 'circle'
  | 'filledCircle'
  | 'select'
  | 'move'
  | 'colorReplace'
  | 'shading'
  | 'pan';

export type SymmetryMode = 'none' | 'horizontal' | 'vertical' | 'both';

export type RGBA = [number, number, number, number];

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0 to 1
  locked: boolean;
  data: Uint8ClampedArray; // length: width * height * 4
}

export interface Frame {
  id: string;
  duration: number; // in ms
  layers: Layer[];
}

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  palette: string[]; // HEX values
  frames: Frame[];
  createdAt: number;
  updatedAt: number;
}

export interface SelectionState {
  x: number;
  y: number;
  width: number;
  height: number;
  data?: Uint8ClampedArray; // Floating pixels if detached/copied
  isFloating?: boolean;
}

export interface ReferenceImage {
  url: string;
  opacity: number;
  x: number;
  y: number;
  scale: number;
  visible: boolean;
  originalWidth: number;
  originalHeight: number;
}

export interface AnimationPreset {
  name: string;
  description: string;
  frameCount: number;
  defaultFps: number;
  tags: string[];
}

export interface SpriteSheetConfig {
  columns: number;
  rows: number;
  spacing: number;
  padding: number;
  transparentBg: boolean;
  bgColor: string;
}
