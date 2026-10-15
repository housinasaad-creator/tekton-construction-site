/*
  The floor plan that draws itself in the first chapter: site boundary, structural axes, walls, columns, core with lifts and stair,
  dimension chains, north arrow and a title block. All coordinates are metres on the ground plane, matching the real tower.
*/
import { PlanDrawing } from './parts.js';
import { DIM } from './tower.js';

export function buildPlan() {
  const P = new PlanDrawing(), { xs, zs, W, D, OX } = DIM, mono = '500 44px "IBM Plex Mono", monospace';
  // 1 · site boundary + survey crosses
  P.rect(0, 0, 68, 52, 0.16, 1);
  for (const [x, z] of [[-34, -26], [34, -26], [34, 26], [-34, 26]]) { P.path([[x - 1.6, z], [x + 1.6, z]], 0.12); P.path([[x, z - 1.6], [x, z + 1.6]], 0.12); }
  P.label('SITE 68.00 × 52.00', -22, -27.6, 11, { opacity: 0.7 });
  // 2 · structural axes with bubbles
  xs.forEach((x, i) => { P.path([[x, -19], [x, 19]], 0.07, 2); P.circle(x, -20.2, 1.15, 0.1); P.label('ABCD'[i], x, -20.2, 1.1, { font: '600 52px "IBM Plex Mono", monospace' }); });
  zs.forEach((z, i) => { P.path([[-21, z], [21, z]], 0.07, 2); P.circle(-22.3, z, 1.15, 0.1); P.label(String(i + 1), -22.3, z, 1.0, { font: '600 52px "IBM Plex Mono", monospace' }); });
  // 3 · walls (double line)
  P.rect(0, 0, W + 2 * OX, D + 2 * OX, 0.3); P.rect(0, 0, W + 2 * OX - 0.8, D + 2 * OX - 0.8, 0.1);
  // 4 · columns with the concrete cross
  for (const x of xs) for (const z of zs) { P.rect(x, z, 0.9, 0.9, 0.14); P.path([[x - 0.45, z - 0.45], [x + 0.45, z + 0.45]], 0.08); P.path([[x - 0.45, z + 0.45], [x + 0.45, z - 0.45]], 0.08); }
  // 5 · core: shell, two lifts, stair treads
  P.rect(0, 0, 7.2, 6.2, 0.26);
  P.rect(-1.75, -1.9, 2.3, 2.4, 0.12); P.path([[-2.9, -3.1], [-0.6, -0.7]], 0.07); P.path([[-2.9, -0.7], [-0.6, -3.1]], 0.07);
  P.rect(1.75, -1.9, 2.3, 2.4, 0.12); P.path([[0.6, -3.1], [2.9, -0.7]], 0.07); P.path([[0.6, -0.7], [2.9, -3.1]], 0.07);
  P.rect(0, 1.65, 6.6, 2.7, 0.1);
  for (let x = -3.1; x <= 3.11; x += 0.42) P.path([[x, 0.3], [x, 3.0]], 0.06);
  // 6 · dimension chains
  for (const x of xs) P.path([[x, 10.3], [x, 14.0]], 0.05);
  P.path([[-13, 13.2], [13, 13.2]], 0.09);
  for (const x of xs) P.path([[x - 0.4, 13.2 + 0.4], [x + 0.4, 13.2 - 0.4]], 0.12);
  P.label('8.67', -8.67, 12.4, 2.6); P.label('8.67', 0, 12.4, 2.6); P.label('8.67', 8.67, 12.4, 2.6);
  P.path([[-13, 14.0], [-13, 16.2]], 0.05); P.path([[13, 14.0], [13, 16.2]], 0.05);
  P.path([[-13, 15.4], [13, 15.4]], 0.09); P.path([[-13.4, 15.8], [-12.6, 15.0]], 0.12); P.path([[12.6, 15.8], [13.4, 15.0]], 0.12);
  P.label('26.00', 0, 14.6, 3.2, { color: '#ff9a57' });
  for (const z of zs) P.path([[14.3, z], [18.2, z]], 0.05);
  P.path([[17.3, -9], [17.3, 9]], 0.09); for (const z of zs) P.path([[17.3 - 0.4, z + 0.4], [17.3 + 0.4, z - 0.4]], 0.12);
  P.label('9.00', 16.4, -4.5, 2.6, { rot: Math.PI / 2 }); P.label('9.00', 16.4, 4.5, 2.6, { rot: Math.PI / 2 });
  P.path([[18.2, -9.8], [20.6, -9.8]], 0.05); P.path([[18.2, 9.8], [20.6, 9.8]], 0.05);
  P.path([[19.7, -9.8], [19.7, 9.8]], 0.09); P.path([[19.3, -9.4], [20.1, -10.2]], 0.12); P.path([[19.3, 10.2], [20.1, 9.4]], 0.12);
  P.label('18.00', 18.8, 0, 3.2, { rot: Math.PI / 2, color: '#ff9a57' });
  // 7 · north arrow
  P.circle(-29, -19, 2.3, 0.1, 32); P.path([[-29, -17.2], [-29, -20.8]], 0.12); P.path([[-30, -19.8], [-29, -21.2], [-28, -19.8]], 0.12);
  P.label('N', -29, -22.2, 1.4, { font: '600 52px "IBM Plex Mono", monospace' });
  // 8 · title block
  P.rect(24, 22, 19, 5.4, 0.14); P.path([[14.5, 21.4], [33.5, 21.4]], 0.08); P.path([[26.5, 21.4], [26.5, 24.7]], 0.08);
  P.label('TEKTON · PLAN L01', 20.3, 23.1, 9, { align: 'center', font: '600 44px "IBM Plex Mono", monospace', color: '#ff9a57' });
  P.label('SCALE 1:200', 30.2, 23.1, 6, {});
  P.label('RC FRAME · 9 LEVELS · C30/37', 24, 20.5, 14, { opacity: 0.8 });
  return P;
}
