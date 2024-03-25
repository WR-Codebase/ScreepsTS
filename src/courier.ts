// Courier

import jobs  from 'jobs';

/**
 * The Courier role is responsible for gathering any resources and delivering them to storage, containers, and towers.
 */
const courier = {
  // Default properties
  status: '🔄 Collect',

  /** @param {Creep} creep **/
  run: function (creep: Creep) {
    creep.memory.energyPriority = ['TOMBSTONE', 'RUIN', 'DROPPED_RESOURCE', 'STORAGE'];
    const oldStatus = creep.memory.status;
    // The picker creep picks up temporary resources that have fallen on the ground (tombstones, ruins, and dropped energy) and delivers them to the nearest container
    if (creep.memory.status === undefined) creep.memory.status = '🔄 Collect'; // Default to collecting

    // Switch state between picking and delivering
    if (creep.memory.status === '🔄 Collect' && creep.store.getFreeCapacity() === 0) {
      creep.memory.status = '🚚 Delivering';
    }
    if (creep.memory.status === '🔄 Collect' && creep.store.getUsedCapacity() === 0) {
      creep.memory.status = '🔄 Collect';
    }

    if (creep.memory.status === '🔄 Collect') {
      // Set energy priority
      creep.memory.energyPriority = ['TOMBSTONE', 'RUIN', 'DROPPED_RESOURCE', 'STORAGE'];
      jobs.collect(creep);

      // If energy is full, switch to hauling
      if (creep.store.getFreeCapacity() === 0) creep.memory.status = '🚚 Delivering';
    } else {
      // Find the nearest container with available capacity. This needs to be rearranged in priority order. Containers first, then Towers, then Storage.
      const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) => (s.structureType === STRUCTURE_CONTAINER)
          && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      });

      if (container) {
        if (creep.transfer(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(container, { visualizePathStyle: { stroke: '#0af' } });
        }
      } else {
        const tower = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (s) => (s.structureType === STRUCTURE_TOWER)
            && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });
        if (tower) {
          if (creep.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(tower, { visualizePathStyle: { stroke: '#0af' } });
          }
        } else {
          const storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) => (s.structureType === STRUCTURE_STORAGE)
              && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          });
          if (storage) {
            if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              creep.moveTo(storage, { visualizePathStyle: { stroke: '#0af' } });
            }
          }
        }
      }

      // If empty, switch to picking
      if (creep.store.getUsedCapacity() === 0) creep.memory.status = '🔄 Collect';
    }
    if (oldStatus !== creep.memory.status) {
      creep.say(creep.memory.status);
    }
  }
};

export default courier
