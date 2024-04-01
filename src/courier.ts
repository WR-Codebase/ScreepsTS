// Courier

import jobs from "jobs";

/**
 * The Courier role is responsible for gathering any resources and delivering them to storage, containers, and towers.
 */
const courier = {
  // Default properties
  status: "🔄 Collect",
  template: {
    pattern: [CARRY, MOVE],
    prefix: [],
    suffix: []
  },

  /** @param {Creep} creep **/
  run: function(creep: Creep) {
    creep.memory.energyPriority = ["TOMBSTONE", "RUIN", "DROPPED_RESOURCE", "STORAGE"];
    const oldStatus = creep.memory.status;
    // The picker creep picks up temporary resources that have fallen on the ground (tombstones, ruins, and dropped energy) and delivers them to the nearest container
    if (creep.memory.status === undefined) creep.memory.status = "🔄 Collect"; // Default to collecting

    // New memory status, picking: If there are dropped minerals on the ground or tombstones, pick them up
    const tombstones = creep.room.find(FIND_TOMBSTONES, {
      filter: (t) => t.store.getUsedCapacity() > 0
    });
    // dropped minerals
    const droppedNonEnergy = creep.room.find(FIND_DROPPED_RESOURCES, { filter: (r) => r.resourceType !== RESOURCE_ENERGY });

    if (tombstones.length > 0 || droppedNonEnergy.length > 0) {
      creep.memory.status = "🔄 Pick";
    }

    // Switch state between collecting and delivering
    if (creep.memory.status === "🔄 Collect" && creep.store.getUsedCapacity() > 0) {
      creep.memory.status = "🚚 Delivering";
    }
    if (creep.memory.status === "🔄 Collect" && creep.store.getUsedCapacity() === 0) {
      creep.memory.status = "🔄 Collect";
    }

    if (creep.memory.status === "🔄 Pick") {
      // If there are dropped resources, pick them up
      if (droppedNonEnergy.length > 0) {
        if (creep.pickup(droppedNonEnergy[0]) === ERR_NOT_IN_RANGE) {
          creep.moveTo(droppedNonEnergy[0], { visualizePathStyle: { stroke: "#ffaa00" } });
        }
      } else {
        // If there are tombstones, pick them up
        if (creep.withdraw(tombstones[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(tombstones[0], { visualizePathStyle: { stroke: "#ffaa00" } });
        }
      }
      // If the creep has energy, deliver it to the nearest container
      if (creep.store.getUsedCapacity() > 0) {
        creep.memory.status = "🚚 Delivering";
      }
    }
    //console.log(`${creep.name} is ${creep.memory.status}`);
    if (creep.memory.status === "🔄 Collect") {
      // Set energy priority
      creep.memory.energyPriority = ["TOMBSTONE", "RUIN", "DROPPED_RESOURCE", "STORAGE"];
      jobs.collect(creep);
      console.log(`${creep.name} is ${creep.memory.status}`);

      // If energy is full, switch to hauling
      if (creep.store.getFreeCapacity() === 0) creep.memory.status = "🚚 Delivering";
    } else {
      // If the creep has any non-energy resource, deliver it to storage
      const nonEnergy = Object.keys(creep.store).filter((r) => r !== RESOURCE_ENERGY);
      if (nonEnergy.length > 0) {
        // filter creep store by non-energy
        if (creep.transfer(creep.room.storage as StructureStorage, nonEnergy[0] as ResourceConstant) === ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.storage as StructureStorage, { visualizePathStyle: { stroke: "#ffffff" } });
        }
      } else {
        // Find the nearest container with available capacity. This needs to be rearranged in priority order. Containers first, then Towers, then Storage.
        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (s) => (s.structureType === STRUCTURE_CONTAINER)
            && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (container) {
          if (creep.transfer(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(container, { visualizePathStyle: { stroke: "#0af" } });
          }
        } else {
          const tower = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) => (s.structureType === STRUCTURE_TOWER)
              && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          });
          if (tower) {
            if (creep.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              creep.moveTo(tower, { visualizePathStyle: { stroke: "#0af" } });
            }
          }
        }
      }

      // If empty, switch to picking
      if (creep.store.getUsedCapacity() === 0) creep.memory.status = "🔄 Collect";
    }
    //console.log(`${creep.name} is ${creep.memory.status}`);
    if (oldStatus !== creep.memory.status) {
      creep.say(creep.memory.status);
    }
  }
};

export default courier;
