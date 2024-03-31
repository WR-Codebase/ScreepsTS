// harvester.ts
declare global {
  interface CreepMemory {
    status?: string;
    energyPriority?: string[];
    targetId?: string;
  }
}

const harvester = {
  template: {
    pattern: [WORK],
    prefix: [CARRY],
    suffix: [MOVE]
  },
  run: function (creep: Creep) {
    //console.log(`Running harvester ${creep.name}`);
    // Check if the creep has a source assigned in memory
    if (!creep.memory.targetId) {
      // Find all sources in the room
      const sources = creep.room.find(FIND_SOURCES);
      // Assign a source to this creep
      for (const source of sources) {
        // Check if this source is already assigned to a harvester
        if (!_.some(Game.creeps, c => c.memory.role === 'harvester'
          && c.memory.targetId === source.id)) {
          creep.memory.targetId = source.id;
          break; // Break the loop once a source has been assigned
        }
      }
    }

    if (creep.room.name !== creep.memory.room) {
      const targetRoom = creep.memory.room;
      const targetPosition = new RoomPosition(25, 25, targetRoom);
      creep.moveTo(targetPosition, { visualizePathStyle: { stroke: '#f0f', lineStyle: "dashed" } })
    }
    // Proceed to harvest from the assigned source
    const source = Game.getObjectById(creep.memory.targetId as string) as Source;
    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
      creep.moveTo(source, { visualizePathStyle: { stroke: '#0f0' } });
    }

    // If the creep is full, attempt to transfer energy to a link
    if (creep.store.getFreeCapacity() === 0) {
      //console.log(`Harvester ${creep.name} is full, checking for links`);
      const link = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
        filter: { structureType: STRUCTURE_LINK }
      })[0]; // Take the first link found, if any

      if (link) {
        //console.log(`Harvester ${creep.name} found link at ${link.pos}`);
        // Attempt to transfer energy to the link
        const transferResult = creep.transfer(link, RESOURCE_ENERGY);
        //console.log(`Harvester ${creep.name} transfer result: ${transferResult}`);
        if (transferResult === OK) {
          //console.log(`Harvester ${creep.name} transferred energy to link at ${link.pos}`);
        } else if (transferResult === ERR_NOT_IN_RANGE) {
          // This should not happen since we're checking for links within 1 tile, but it's a good safety check
          creep.moveTo(link);
        }
      }
    }
  }
};

export default harvester;
