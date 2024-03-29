const remoteHarvester = {
  run(creep: Creep) {
    const targetRoom = 'E21N16'; //creep.memory.targetRoom;
    const targetId = '5bbcae259099fc012e63876c'; // creep.memory.targetId;
    // remote harvester has four states based on two variables
    // 1. Creep is in target room and has full energy => return to home room and deposit energy
    // 2. Creep is in target room and does not have full energy => harvest creep.memory.targetId
    // 3. Creep is in home room and is not empty => deposit energy at nearest container or storage
    // 4. Creep is in home room and is empty => move to target room


    // State 1: Creep is in target room and has full energy => return to home room and deposit energy
    if (targetRoom === creep.room.name && creep.store.getFreeCapacity() === 0) {
      console.log(`${creep.name} is in ${targetRoom} and has full energy. Returning to home room.`);
      creep.moveTo(Game.spawns['E22N16_1'].pos, { visualizePathStyle: { stroke: '#0f0' } });
    } else if (targetRoom === creep.room.name && creep.store.getFreeCapacity() > 0) {
      console.log(`${creep.name} is in ${targetRoom} and does not have full energy. Harvesting source: ${creep.memory.targetId}.`);
      // State 2: Creep is in target room and does not have full energy => harvest creep.memory.targetId
      const source = Game.getObjectById(targetId) as Source;
      if (!source) {
        //console.log(`Source not found for ID: ${creep.memory.targetId}`);
        // Handle reassignment or error
        return;
      }

      if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
        console.log(`${creep.name} is moving to ${source}.`);

          // Proceed with moving to source
          creep.moveTo(source.pos, { visualizePathStyle: { stroke: '#0f0' } });
      }
    } else if (creep.memory.room === creep.room.name && creep.store.getUsedCapacity() > 0) {
      // State 3: Creep is in home room and is not empty => deposit energy at nearest container or storage
      const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) => (s.structureType === STRUCTURE_CONTAINER)
          && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      });
      if (container) {
        if (creep.transfer(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(container, { visualizePathStyle: { stroke: '#0af' } });
        }
      }
    } else {
      // State 4: Creep is in home room and is empty => move to target room
      const targetRoom = creep.memory.targetRoom;
      const exitDir = creep.room.findExitTo(targetRoom as string);
      const exit = creep.pos.findClosestByPath(exitDir as ExitConstant);

      if (exit) {
        creep.moveTo(exit, { visualizePathStyle: { stroke: '#0f0' } });
      }
    }
  }
};

export default remoteHarvester;
