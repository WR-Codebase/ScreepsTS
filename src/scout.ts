const scout = {
  template: {
    pattern: [],
    prefix: [MOVE],
    suffix: []
  },
  run(creep: Creep) {

    if (!creep.memory.targetId) {
      // Check for exits to neighboring rooms
      const exits = creep.room.find(FIND_EXIT);
      // Choose a random exit
      const exit = exits[Math.floor(Math.random() * exits.length)];
      // Set the target room to the room on the other side of the exit
      creep.memory.targetId = exit.roomName;

    }

    if (creep.memory.targetId !== creep.room.name) {
      const targetRoom = creep.memory.targetId;
      const exitDir = creep.room.findExitTo(targetRoom as string);
      const exit = creep.pos.findClosestByPath(exitDir as ExitConstant);

      // Move to the exit
      if (exit) {
        creep.moveTo(exit, { visualizePathStyle: { stroke: "#f0f" } });
      } else {
        //console.log(`Scout ${creep.name} cannot find path to room ${targetRoom}.`);
      }
    } else {

      const target: RoomPosition = new RoomPosition(25, 25, creep.memory.targetId);
      creep.moveTo(target, { visualizePathStyle: { stroke: "#ff0000" } });
      // Perform scouting activities in the target room
      //console.log(`Scout ${creep.name} has arrived in room ${creep.memory.targetId}.`);
      // Here you can add more behavior, for example, exploring the room or marking positions of interest.

      // set targetId to next room at random
      const exits = creep.room.find(FIND_EXIT);
      const exit = exits[Math.floor(Math.random() * exits.length)];
      creep.memory.targetId = exit.roomName;
    }
  }
};
export default scout;
