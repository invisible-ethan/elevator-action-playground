import { FLOOR_HEIGHT, TOTAL_FLOORS } from '../config/gameConfig';

export const BASEMENT_FLOOR = 0;

export type DoorSide = 'left' | 'right';
export type DoorType = 'blue' | 'red' | 'none';

export interface DoorSlot {
  side: DoorSide;
  type: DoorType;
  collected?: boolean;
}

export interface FloorDef {
  number: number;
  width: number;
  doors: DoorSlot[];
  shaftIndices: number[];
  escalatorLeft: boolean;
  escalatorRight: boolean;
  permanentlyDark: boolean;
  hasLamps: boolean;
  noDoors?: boolean;
}

export interface ShaftDef {
  id: number;
  x: number;
  serviceFloors: number[];
  isExitToBasement?: boolean;
  doubleLift?: boolean;
}

const shaftX = [40, 72, 104, 136, 168, 200];

function doors(
  left: DoorType = 'blue',
  right: DoorType = 'blue',
): DoorSlot[] {
  return [
    { side: 'left', type: left },
    { side: 'right', type: right },
  ];
}

function singleDoors(): DoorSlot[] {
  return doors('blue', 'blue');
}

export const SHAFTS: ShaftDef[] = [
  { id: 0, x: shaftX[0], serviceFloors: [1, 2, 3, 4, 5, 6, 7], isExitToBasement: true },
  { id: 1, x: shaftX[1], serviceFloors: [1, 2, 3, 4, 5, 6], doubleLift: true },
  { id: 2, x: shaftX[2], serviceFloors: [1, 2, 3, 4, 5, 6, 7] },
  { id: 3, x: shaftX[3], serviceFloors: [1, 2, 3, 4, 5, 6, 7], isExitToBasement: true },
  { id: 4, x: shaftX[4], serviceFloors: [1, 2, 3, 4, 5, 6, 7] },
  { id: 5, x: shaftX[5], serviceFloors: [7, 8, 9, 10, 11] },
  { id: 6, x: 20, serviceFloors: [7, 8, 9, 10, 11, 12, 13] },
  { id: 7, x: 236, serviceFloors: [7, 8, 9, 10, 11, 12, 13] },
  { id: 8, x: 128, serviceFloors: [10, 11, 12] },
  { id: 9, x: 60, serviceFloors: [13, 14, 15] },
  { id: 10, x: 196, serviceFloors: [15, 16, 17] },
  { id: 11, x: 128, serviceFloors: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
];

function buildFloors(): FloorDef[] {
  const floors: FloorDef[] = [];

  for (let n = 30; n >= 1; n--) {
    let def: FloorDef;

    if (n >= 21) {
      def = {
        number: n,
        width: 256,
        doors: doors(),
        shaftIndices: [11],
        escalatorLeft: false,
        escalatorRight: false,
        permanentlyDark: false,
        hasLamps: true,
      };
    } else if (n >= 17) {
      def = {
        number: n,
        width: 256,
        doors: doors(),
        shaftIndices: [],
        escalatorLeft: true,
        escalatorRight: true,
        permanentlyDark: false,
        hasLamps: true,
      };
    } else if (n === 16) {
      def = {
        number: n,
        width: 256,
        doors: doors(),
        shaftIndices: [],
        escalatorLeft: false,
        escalatorRight: true,
        permanentlyDark: false,
        hasLamps: true,
      };
    } else if (n >= 11) {
      def = {
        number: n,
        width: 256,
        doors: doors(),
        shaftIndices: n >= 7 ? [5, 6, 7] : [],
        escalatorLeft: false,
        escalatorRight: false,
        permanentlyDark: true,
        hasLamps: false,
      };
    } else if (n === 7) {
      def = {
        number: n,
        width: 256,
        doors: [],
        shaftIndices: [5, 6, 7],
        escalatorLeft: false,
        escalatorRight: false,
        permanentlyDark: false,
        hasLamps: false,
        noDoors: true,
      };
    } else {
      def = {
        number: n,
        width: 256,
        doors: singleDoors(),
        shaftIndices: [0, 1, 2, 3, 4],
        escalatorLeft: false,
        escalatorRight: false,
        permanentlyDark: false,
        hasLamps: n <= 6,
      };
    }

    floors.push(def);
  }

  floors.push({
    number: BASEMENT_FLOOR,
    width: 256,
    doors: [],
    shaftIndices: [0, 3],
    escalatorLeft: false,
    escalatorRight: false,
    permanentlyDark: false,
    hasLamps: false,
  });

  return floors;
}

export const FLOORS = buildFloors();

export function floorToY(floorNumber: number): number {
  if (floorNumber === BASEMENT_FLOOR) {
    return TOTAL_FLOORS * FLOOR_HEIGHT;
  }
  return (TOTAL_FLOORS - floorNumber) * FLOOR_HEIGHT;
}

export function yToFloor(y: number): number {
  const idx = Math.round(y / FLOOR_HEIGHT);
  const floor = TOTAL_FLOORS - idx;
  if (floor < 1) return BASEMENT_FLOOR;
  if (floor > TOTAL_FLOORS) return TOTAL_FLOORS;
  return floor;
}

export function getFloorDef(floorNumber: number): FloorDef | undefined {
  return FLOORS.find((f) => f.number === floorNumber);
}
