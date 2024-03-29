
const scout = {
  template: {
    pattern: [],
    prefix: [MOVE],
    suffix: []
  },
  run(creep: Creep) {

    if (!creep.memory.targetId){
      // Check for exits to neighboring rooms
      const exits = creep.room.find(FIND_EXIT);
      // Choose a random exit
      const exit = exits[Math.floor(Math.random() * exits.length)];
      // Set the target room to the room on the other side of the exit
      creep.memory.targetId = exit.roomName;

    }
    // First check if the creep is still in its home room
    if (creep.memory.room !== creep.room.name) {
      // If not, check if the room is in memory
      if (!Memory.collective.rooms[creep.room.name]) {
        // If not, add the room to memory
        Memory.collective.rooms[creep.room.name] = {
          owner: creep.room.controller?.owner?.username || "unowned",
          energy: creep.room.energyAvailable,
          energyCapacity: creep.room.energyCapacityAvailable,
          exits: creep.room.find(FIND_EXIT),
          sources: {},
          mineral: {
            id: creep.room.find(FIND_MINERALS)[0].id,
            type: creep.room.find(FIND_MINERALS)[0].mineralType,
            density: creep.room.find(FIND_MINERALS)[0].density,
            amount: creep.room.find(FIND_MINERALS)[0].mineralAmount,
            pos: creep.room.find(FIND_MINERALS)[0].pos
          },
          controller: {
            id: creep.room.controller?.id || "",
            owner: creep.room.controller?.owner?.username || "unowned",
            level: creep.room.controller?.level || 0,
            progress: creep.room.controller?.progress || 0,
            progressTotal: creep.room.controller?.progressTotal || 0,
            downgradeTimer: creep.room.controller?.ticksToDowngrade || 0,
            safeModeAvailable: creep.room.controller?.safeModeAvailable || 0,
            powerEnabled: creep.room.controller?.isPowerEnabled,
            pos: creep.room.controller?.pos
          }
        };
        const sources = creep.room.find(FIND_SOURCES);

        for (const source of sources) {
          Memory.collective.rooms[creep.room.name].sources[source.id] = {
            pos: source.pos
          };
        }
      }
    }

    if (creep.memory.targetId !== creep.room.name) {
      const targetRoom = creep.memory.targetId
      const exitDir = creep.room.findExitTo(targetRoom as string);
      const exit = creep.pos.findClosestByPath(exitDir as ExitConstant);

      // Move to the exit
      if (exit) {
        creep.moveTo(exit, {visualizePathStyle: {stroke: '#f0f'}});
      } else {
        console.log(`Scout ${creep.name} cannot find path to room ${targetRoom}.`);
      }
    } else {
      // Perform scouting activities in the target room
      console.log(`Scout ${creep.name} has arrived in room ${creep.memory.targetId}.`);
      // Here you can add more behavior, for example, exploring the room or marking positions of interest.

      // set targetId to next room at random
      const exits = creep.room.find(FIND_EXIT);
      const exit = exits[Math.floor(Math.random() * exits.length)];
      creep.memory.targetId = exit.roomName;
    }
  }
}

export default scout;
