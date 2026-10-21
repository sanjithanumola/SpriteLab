import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeProject, deserializeProject } from './storage';
import { Project } from '../types';

test('serializeProject and deserializeProject preserves layers, frames, and pixel data', () => {
  const width = 2;
  const height = 2;
  const pixelData = new Uint8ClampedArray([255, 128, 64, 255, 0, 0, 0, 0, 10, 20, 30, 255, 200, 200, 200, 255]);

  const testProject: Project = {
    id: 'test-proj-1',
    name: 'Hero Test',
    width,
    height,
    fps: 12,
    palette: ['#FF0000', '#00FF00'],
    createdAt: 1000,
    updatedAt: 2000,
    frames: [
      {
        id: 'f1',
        duration: 80,
        layers: [
          {
            id: 'l1',
            name: 'Layer One',
            visible: true,
            opacity: 0.8,
            locked: false,
            data: pixelData,
          },
        ],
      },
    ],
  };

  const serialized = serializeProject(testProject);
  const restored = deserializeProject(serialized);

  assert.equal(restored.id, testProject.id);
  assert.equal(restored.name, testProject.name);
  assert.equal(restored.width, testProject.width);
  assert.equal(restored.height, testProject.height);
  assert.equal(restored.frames.length, 1);
  assert.equal(restored.frames[0].layers.length, 1);
  assert.equal(restored.frames[0].layers[0].name, 'Layer One');
  assert.equal(restored.frames[0].layers[0].opacity, 0.8);
  assert.deepEqual(Array.from(restored.frames[0].layers[0].data), Array.from(pixelData));
});
