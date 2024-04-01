const minim = {
  template: {
    pattern: [],
    prefix: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
    suffix: [MOVE]
  },
  run: function (creep: Creep) {
    const storage = creep.room.storage as StructureStorage;
    // target link is the one nearest the storage
    if (storage) {
      const targetLink = storage.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
          return structure.structureType === STRUCTURE_LINK;
        }
      }) as StructureLink;

      // Duty 2: Transfer energy from Link to Storage if Link has energy and creep is empty
      if (targetLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        if (creep.withdraw(targetLink, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          //console.log(`Creep ${creep.name} is moving to link to collect energy`);
          creep.moveTo(targetLink, {visualizePathStyle: {stroke: '#ffaa00'}});
        } else {
          //console.log(`Creep ${creep.name} is moving to storage to deposit energy`);
          // If the creep has energy, deposit it into storage
          if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}});
            return;
          }
        }
      }
    } else {
      // Deliver energy to storage
      if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffffff' } });
        }
      }
    }
  }
};

export default minim;
