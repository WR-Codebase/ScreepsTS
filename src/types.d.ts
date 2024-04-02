// src/types.d.ts
// Extend the Creep interface
// Extend the Creep prototype interface to include the custom moveTo method
// Note: This part is only for type declaration and won't appear in the compiled JavaScript.
interface Creep {
  pathTo(target: RoomPosition, opts?: MoveToOpts): ScreepsReturnCode;

  betterMoveTo(target: RoomPosition, opts: MoveToOpts): ScreepsReturnCode;

  wrappedMove(direction: DirectionConstant): ScreepsReturnCode;

  move(direction: DirectionConstant): CreepMoveReturnCode;

  shoveIfNecessary(targetPos: RoomPosition): void;

  requestShove(): void;
}

