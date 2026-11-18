// Everything Granny can sit on: kitchen chairs, the sofa, the armchair, the porch rocker, the clinic bench
// (and the porch swing, which the game handles as a special moving seat).
// A seat is registered with the furniture group it belongs to, in that group's local coordinates,
// so it lines up however the furniture is placed or turned.
import * as THREE from 'three';

export const SEATS = [];
const SIT_DROP = 0.5;   // her group origin sits this far below the seat surface (hips land on the cushion)

/**
 * parent: the furniture group (already placed in the scene).
 * top: [x, y, z] local point on the seat surface where her hips go.
 * back: +1 when the backrest is on the group's local +z side (she faces local -z), -1 for the opposite.
 * out: [x, z] local spot she stands on to sit down / ends up on when she stands (default: in front of the seat).
 * cat: 'lap' (curls up in her lap) or [x, y, z] local spot beside her.
 */
export function addSeat({ parent, top, back = 1, out = null, cat = 'lap', label = 'Sit down', kind = 'chair', noun = 'chair', rock = false }) {
  parent.updateWorldMatrix(true, false);
  const W = (x, y, z) => parent.localToWorld(new THREE.Vector3(x, y, z));
  const o = W(top[0], top[1], top[2]);
  const ahead = W(top[0], top[1], top[2] - back).sub(o).setY(0).normalize();   // the way she faces when seated
  const heading = Math.atan2(ahead.x, ahead.z);
  const [ox, oz] = out || [top[0], top[2] - back * 0.72];
  const front = W(ox, 0, oz);
  const lap = cat === 'lap';
  const catPos = lap ? o.clone().addScaledVector(ahead, 0.24).setY(o.y + 0.16) : W(cat[0], cat[1], cat[2]);
  const catFront = lap ? front.clone() : W(cat[0], 0, top[2] - back * 0.65);
  const seat = {
    id: SEATS.length, label, kind, noun, rock, obj: parent, lap,
    sitPos: o.clone().setY(o.y - SIT_DROP).addScaledVector(ahead, -0.04), heading,
    front, catPos, catHeading: heading, catFront,
  };
  SEATS.push(seat);
  return seat;
}
