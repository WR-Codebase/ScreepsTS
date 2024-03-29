// The Drone seeks out locations for new colonies. If not in the target room, it will move there. When it gets there it will claim the room controller.

const drone = {
  template: {
    pattern: [],
    prefix: [CLAIM, MOVE],
    suffix: []
  },
  run(creep: Creep) {
    creep.memory.targetId = 'E52N17';
    if (creep.memory.targetId) {
      if (creep.room.name !== creep.memory.targetId) {
        // Find the exit that leads to the target room
        const exitDir = creep.room.findExitTo(creep.memory.targetId);
        // Move to the exit
        const exit = creep.pos.findClosestByPath(exitDir as ExitConstant);
        if (exit) {
          creep.moveTo(exit, { reusePath: 20, visualizePathStyle: { stroke: "#f0f", lineStyle: "dashed" }, ignoreCreeps: true });
        }
      } else {
        const controller = creep.room.controller;
        if (controller) {
          if (creep.claimController(controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller);
          }
        }
      }
    }
  }
};

export default drone;
