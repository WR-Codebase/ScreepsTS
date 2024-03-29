/**
 * The Hauler role is responsible for carrying energy from drop harvesters to storage or other structures.
 */
const hauler = {
  template: {
    pattern: [CARRY, MOVE],
    prefix: [],
    suffix: []
  },
  run: function (creep: Creep) {

    const oldStatus= creep.memory.status;
    // Ensure the creep has a valid state
    if (creep.store.getFreeCapacity() > 0 && creep.memory.status !== '🚚 Deliver') {
      creep.memory.status = '🔄 Collect';
    } else if (creep.store.getUsedCapacity() === 0) {
      creep.memory.status = '🔄 Collect';
    } else {
      creep.memory.status = '🚚 Deliver';
    }

    if (creep.memory.status === '🔄 Collect') {
      this.collectEnergy(creep);
    } else {
      if (creep.room.name !== 'E53N17') {
        // Move to the exit
        const exitDir = creep.room.findExitTo('E53N17');
        const exit = creep.pos.findClosestByPath(exitDir as ExitConstant);
        if (exit) {
          creep.moveTo(exit, { visualizePathStyle: { stroke: '#f0f', lineStyle: 'dashed' }, ignoreCreeps: true });
        }
      } else {
        this.deliverEnergy(creep);
      }
    }

    if (oldStatus !== creep.memory.status) {
      creep.say(creep.memory.status);
    }

  },

  collectEnergy: function (creep: Creep) {
    const source = Game.getObjectById(creep.memory.targetId as string) as Source;
    if (!source) {
      //console.log(`Source not found for ID: ${creep.memory.targetId}`);
      // Handle reassignment or error
      return;
    }

    // New logic to check for and collect dropped energy within 3 tiles of the creep's position
    const nearbyDroppedEnergy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
      filter: (r) => r.resourceType === RESOURCE_ENERGY
    }) || [];

    if (nearbyDroppedEnergy.length > 0) {
      if (creep.pickup(nearbyDroppedEnergy[0]) === ERR_NOT_IN_RANGE) {
        creep.moveTo(nearbyDroppedEnergy[0], { visualizePathStyle: { stroke: '#0af' } });
      }
    } else {

      // Find closest dropped energy near the assigned source
      const droppedEnergy = source.pos.findInRange(FIND_DROPPED_RESOURCES, 3, {
        filter: (r) => r.resourceType === RESOURCE_ENERGY
      });

      if (droppedEnergy.length > 0) {
        if (creep.pickup(droppedEnergy[0]) === ERR_NOT_IN_RANGE) {
          creep.moveTo(droppedEnergy[0], { visualizePathStyle: { stroke: '#0af' } });
        }
      }
    }
  },
  deliverEnergy: function (creep: Creep) {
    // Tower first
    const tower = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType === STRUCTURE_TOWER)
          && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
      }
    }) as StructureTower;

    if (tower && creep.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      creep.moveTo(tower, { visualizePathStyle: { stroke: '#0af' } });
    } else {
      // Then container
      const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType === STRUCTURE_CONTAINER)
            && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
      }) as StructureContainer
      if (creep.transfer(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(container, { visualizePathStyle: { stroke: '#0af' } });
      } else {
        // Storage last
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType === STRUCTURE_STORAGE)
              && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          }
        }) as StructureStorage;
        if (target) {
          if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#0af' } });
          }
        }
      }
    }
  }
};

export default hauler;
