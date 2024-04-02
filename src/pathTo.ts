import utility from "./betterPathingUtility";

let moveRegistry = {} as any;
let registryTick = -1;

Creep.prototype.pathTo = function(target: RoomPosition, opts = {}): ScreepsReturnCode {


  // Reset the move registry if not yet this tick
  if (registryTick !== Game.time) {
    moveRegistry = {};
    registryTick = Game.time;
  }

  // Make sure we include these options
  // Must explicitly check undefined since 0 will evaluate to false
  if (opts.range === undefined) {
    opts.range = 1;
  }
  if (opts.maxRooms === undefined) {
    opts.maxRooms = 6;
  }
  if (opts.plainCost === undefined) {
    opts.plainCost = 2;
  }
  if (opts.swampCost === undefined) {
    opts.swampCost = 10;
  }

  // Save our shove target in case we get shoved
  return this.betterMoveTo(target, opts);
};

Creep.prototype.betterMoveTo = function(target: RoomPosition, opts: MoveToOpts): ScreepsReturnCode {

  function newPath(creep: Creep) {
    // @ts-ignore
    return utility.serializePath(utility.getNewPath(creep.pos, { pos: target, range: opts.range }, opts));
  }

  function verifyPath(creep: Creep) {
    // If opts.range is defined
    if (opts.range !== undefined) {
      // Don't need to move
      if (creep.pos.getRangeTo(target) <= opts.range) {
        return [];
      }
    }

    // If we don't have valid move data, let's repath
    // TS2339: Property _move does not exist on type CreepMemory
    // to resolve the above error let's add _move to CreepMemory

    const moveData = creep.memory._move; // _move is not a property of Creep.memory so we need to add it somehow
    if (!moveData || !moveData.path || !moveData.path.length) {
      return newPath(creep);
    }

    if (opts.range !== undefined) {
      // Make sure our destination is still within range of our target
      if (target.getRangeTo(moveData.dest.x, moveData.dest.y) > opts.range ||
        target.roomName !== moveData.dest.roomName) {
        return newPath(creep);
      }
    }

    // If we moved last time, we should be right on our path
    // @ts-ignore
    const nextStep = utility.getNextStep(moveData.path, creep.pos);
    if (creep.pos.isEqualTo(nextStep)) {
      // @ts-ignore
      return utility.progressPath(moveData.path, creep.pos);
    }

    // Something went wrong with our pathing
    if (creep.pos.getRangeTo(nextStep) > 1) {
      return newPath(creep);
    }

    return moveData.path;
  }

  // Don't try to move until we've spawned
  if (this.spawning) {
    return ERR_BUSY;
  }

  const path = verifyPath(this) as RoomPosition[];
  if (path.length) {
    // @ts-ignore
    const nextStep = utility.getNextStep(path, this.pos);
    const direction = this.pos.getDirectionTo(nextStep);
    if (direction) {
      drawArrow(this.pos, direction, { color: "#00FF00" });
      this.move(direction);
    }
  }

  // Save our move data
  this.memory._shoveTarget = target;
  if (this.memory._move === undefined) {
    this.memory._move = { dest: target, path: path };
  }
  return OK;
};

Creep.prototype.wrappedMove = Creep.prototype.move;

// @ts-ignore
Creep.prototype.move = function(direction: DirectionConstant): CreepMoveReturnCode {

  // Record ourselves in the move registry
  moveRegistry[this.name] = true;

  // Do our ordinary move
  this.wrappedMove(direction);

  // If there's a creep standing where we want to go, let's request a shove
  this.shoveIfNecessary(utility.getPosInDirection(this.pos, direction) as RoomPosition);
};

Creep.prototype.shoveIfNecessary = function(targetPos): ScreepsReturnCode {
  if (!targetPos) {
    return ERR_INVALID_ARGS;
  }

  const blockingCreep = this.room.lookForAt(LOOK_CREEPS, targetPos.x, targetPos.y).find((c) => c.my);
  if (blockingCreep) {

    // Let's make sure that this creep hasn't scheduled a move already
    if (registryTick === Game.time && moveRegistry[blockingCreep.name]) {
      return ERR_BUSY;
    }

    // Because shoving moves the creep, this will happen recursively
    blockingCreep.requestShove();
  }
  return OK;
};

Creep.prototype.requestShove = function() {

  // Reusable utility method to ensure if a spot is walkable
  const terrain = Game.map.getRoomTerrain(this.room.name);

  function isObstructed(room: Room, pos: RoomPosition): boolean {
    // If the position is in a wall or a blocking structure, it's obstructed
    const blockingStructure = room.lookForAt(LOOK_STRUCTURES, pos).find((s: any) => (s.structureType === STRUCTURE_ROAD
      || s.structureType === STRUCTURE_RAMPART
      || s.structureType === STRUCTURE_CONTAINER
      && !s.hasOwnProperty('my'))) as AnyStructure;

    if (blockingStructure) {
      return true;
    }

    return (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL);
  }


  // Find all valid adjacent spaces
  const adjacentSpaces = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      if (x === 0 && y === 0) {
        continue;
      }
      const newX = this.pos.x + x;
      const newY = this.pos.y + y;
      if (newX > 0 && newX < 49 && newY > 0 && newY < 49) {
        const newPos = new RoomPosition(newX, newY, this.pos.roomName);
        if (!isObstructed(this.room, newPos)) {
          adjacentSpaces.push(newPos);
        }
      }
    }
  }

  // We can't move anywhere
  if (!adjacentSpaces.length) {
    return;
  }

  // Let's make sure we resort to spaces with other creeps last
  adjacentSpaces.sort((a, b) => {
    return a.lookFor(LOOK_CREEPS)[0] ? 1 : 0;
  });

  // Big ugly code block :)
  const shoveTarget = this.memory._shoveTarget;
  const chosenSpace = shoveTarget
    // Let's make sure we're within range of our target
    ? adjacentSpaces.reduce((closest, curr) => {
      // Limit the range to a minimum of 1 since we don't necessarily want to be pushed
      // Direction into our target most of the time
      const currDist = Math.max(curr.getRangeTo(shoveTarget.x, shoveTarget.y), 1);
      const closestDist = Math.max(closest.getRangeTo(shoveTarget.x, shoveTarget.y), 1);
      return currDist < closestDist ? curr : closest;
    }, adjacentSpaces[0])
    // If we don't have somewhere we want to be near, let's just move somewhere random
    : adjacentSpaces[Math.floor(Math.random() * adjacentSpaces.length)];

  drawArrow(this.pos, this.pos.getDirectionTo(chosenSpace), { color: "#FF0000" });
  this.move(this.pos.getDirectionTo(chosenSpace));
};

// Debug
function drawArrow(pos: RoomPosition, direction: DirectionConstant, style: LineStyle) {
  const target = utility.getPosInDirection(pos, direction);
  if (!target) {
    return;
  }
  const x = target.x - ((target.x - pos.x) * 0.5);
  const y = target.y - ((target.y - pos.y) * 0.5);
  Game.rooms[pos.roomName].visual.line(pos.x, pos.y, x, y, style);
}
