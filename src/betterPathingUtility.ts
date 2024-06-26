const cachedCostMatrices = {};

const utility = {
  /**
   * Serializes a path as a starting position and array of directions into a single string.
   * @param {RoomPosition[]} path The path to serialize.
   * @param {boolean} endPathIfNoVisibility A flag telling us to end the path once we enter a new room with no visibility.
   * Disable this setting if we're using a cached path. If we're pathing normally we'll usually want this enabled to prevent us
   * from accidentally pathing into unwalkable built structures that we had no vision on when we started pathing.
   * @returns {string} The path in serialized form.
   */
  serializePath: function(path: RoomPosition[], endPathIfNoVisibility = true): string {
    let serializedPath = "";
    if (!path[0]) {
      return serializedPath;
    }

    // Serialize our starting position
    serializedPath += path[0].x < 10 ? "0" + path[0].x : path[0].x.toString();
    serializedPath += path[0].y < 10 ? "0" + path[0].y : path[0].y.toString();

    // Create an array of directions to follow from here
    let lastPos = path[0];
    for (const pos of path) {
      if (pos === lastPos) {
        continue;
      }
      serializedPath += lastPos.getDirectionTo(pos);
      lastPos = pos;
      if (endPathIfNoVisibility && !Game.rooms[pos.roomName]) {
        break;
      }
    }
    return serializedPath as string;
  },

  /**
   * Gets the next step in the path.
   * @param {string} serializedPath The serialized path to step through.
   * @param {RoomPosition} currentPos The position of the creep following the path. Used for determining the next room.
   * @returns {RoomPosition} The next position to move to in the path.
   */
  getNextStep: function(serializedPath: string, currentPos: RoomPosition): RoomPosition {
    const nextX = parseInt(serializedPath.substring(0, 2));
    const nextY = parseInt(serializedPath.substring(2, 4));
    return new RoomPosition(nextX, nextY, currentPos.roomName);
  },

  /**
   * Advances the path by one step, and returns it.
   * @param {string} serializedPath The path to advance.
   * @param {RoomPosition} currentPos The position of the creep following the path. Used for determining the next room.
   * @returns {string} The serialized path, progressed one step.
   */
  progressPath: function(serializedPath: string, currentPos: RoomPosition) {
    // First identify our next position
    const lastPos = this.getNextStep(serializedPath, currentPos);

    // Then cut our next step out of our path
    serializedPath = serializedPath.substring(4);
    if (!serializedPath.length) {
      return "";
    }

    // Finally, append our next position to our path
    // @ts-ignore
    const nextPos = this.getPosInDirection(lastPos, serializedPath[0]);
    const nextX = nextPos.x < 10 ? "0" + nextPos.x : nextPos.x.toString();
    const nextY = nextPos.y < 10 ? "0" + nextPos.y : nextPos.y.toString();
    const prefix = nextX + nextY;

    // return our new position and directions
    return prefix + serializedPath.substring(1);
  },

  /**
   * Gets the position in the given direction, excluding roomName.
   * @param {RoomPosition} startPos The starting position.
   * @param {DirectionConstant} direction The direction to go in.
   * @returns {{x: number, y: number}} An object with X and Y positions from 0 to 49.
   */
  getPosInDirection: function(startPos: RoomPosition, direction: DirectionConstant) {
    const directions = {
      [TOP]: [0, -1],
      [TOP_RIGHT]: [1, -1],
      [RIGHT]: [1, 0],
      [BOTTOM_RIGHT]: [1, 1],
      [BOTTOM]: [0, 1],
      [BOTTOM_LEFT]: [-1, 1],
      [LEFT]: [-1, 0],
      [TOP_LEFT]: [-1, -1]
    };
    const newX = (startPos.x + directions[direction][0]) % 50;
    const newY = (startPos.y + directions[direction][1]) % 50;
    return { x: newX, y: newY };
  },

  getNewPath: function(startPos: RoomPosition, goals: RoomPosition[], options: MoveToOpts) {
    const maxOps = 2000;
    const MAX_ATTEMPTS = 2;
    let result: PathFinderPath;
    for (let attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
      result = PathFinder.search(
        startPos, goals, {
          maxRooms: options.maxRooms,
          maxOps: maxOps * attempts,
          plainCost: options.plainCost,
          swampCost: options.swampCost,
          roomCallback: this.getCachedCostMatrix
        }
      ) as PathFinderPath;
      if (result.incomplete) {
        // Raise maxOps and try again
        continue;
      }
      if (result.path.length > 0) {
        return result.path;
      }
    }
    // console.log("No path could be found from " + startPos + " to " + goals.pos + " with range " + goals.range + ". Using incomplete path!");
    return [];
  },

  getCachedCostMatrix: function(roomName: string) {
    // @ts-ignore
    if (cachedCostMatrices[roomName] && cachedCostMatrices[roomName].tick === Game.time) {
      // @ts-ignore
      return cachedCostMatrices[roomName].costs;
    }

    const matrix = new PathFinder.CostMatrix();
    const room = Game.rooms[roomName];
    if (!room) {
      return matrix;
    }

    // Simply avoid unwalkable structures
    room.find(FIND_STRUCTURES).forEach((s) => {
      if (s.structureType === STRUCTURE_ROAD) {
        matrix.set(s.pos.x, s.pos.y, 1);
      } else if (s.structureType !== STRUCTURE_CONTAINER &&
        (s.structureType !== STRUCTURE_RAMPART || !s.my)) {
        matrix.set(s.pos.x, s.pos.y, 255);
      }
    });

    // @ts-ignore
    cachedCostMatrices[roomName] = { tick: Game.time, costs: matrix };
    return matrix;
  }
};

export default utility;
