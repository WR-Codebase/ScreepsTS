// The Drone seeks out locations for new colonies. If not in the target room, it will move there. When it gets there it will claim the room controller.

const drone = {
  template: {
    pattern: [],
    prefix: [CLAIM, MOVE],
    suffix: []
  },
  run(creep: Creep) {
    if (creep.memory.room) {
      if (creep.room.name !== creep.memory.room) {
        // Find the exit that leads to the target room
        const exitDir = creep.room.findExitTo(creep.memory.room);
        // Move to the exit
        const exit = creep.pos.findClosestByPath(exitDir as ExitConstant);
        if (exit) {
          creep.moveTo(exit, { reusePath: 20, visualizePathStyle: { stroke: "#f0f", lineStyle: "dashed" }, ignoreCreeps: true });
        }
      } else {
        // If room has one source, reserve it, otherwise claim the controller

        const sources = creep.room.find(FIND_SOURCES);
        const controller = creep.room.controller as StructureController;
        if (sources.length === 1) {
          const source = sources[0];
          const result = creep.reserveController(controller);
          if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller);
          }
          console.log(`${creep.name} is reserving controller in ${creep.room.name}: ${result}`);

        } else {
          if (creep.claimController(controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller);
          }
        }
      }
    }
  }
};

export default drone;
