// The pillager Creep role is responsible for collecting resources from ruins and tombstones in E52N17. When full it returns to E53N17 to deposit the resources in storage.

export default {
  template:{
    pattern: [CARRY, MOVE],
    prefix: [],
    suffix: []
  },
  pillage: function(creep: Creep) {
    if (creep.room.name === "E52N17") {
      // If creep already has a target Id, find out if it's still got resources
      if (creep.memory.targetId) {
        const target = Game.getObjectById(creep.memory.targetId) as Ruin | Tombstone | Resource;
        if (target instanceof Resource && creep.pickup(target) === ERR_NOT_IN_RANGE) {
          creep.pathTo(target.pos, { visualizePathStyle: { stroke: "#0f0", lineStyle: "dotted" }, ignoreCreeps: false });
        } else if (target instanceof Source
          && creep.harvest(target) === ERR_NOT_IN_RANGE) {
          creep.pathTo(target.pos, { visualizePathStyle: { stroke: "#0f0", lineStyle: "dotted" }, ignoreCreeps: false });
        } else if ((target instanceof Tombstone
            || target instanceof Ruin
            || target instanceof StructureContainer
            || target instanceof StructureStorage
            || target instanceof StructureLink
            || target instanceof StructureSpawn)
          && creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          //console.log(`${creep.name} found ${target}, moving to it now`);

          creep.pathTo(target.pos, { visualizePathStyle: { stroke: "#0f0", lineStyle: "dotted" }, ignoreCreeps: false });
        } else {
          //console.log(`${creep.name} found ${target}, but it's empty`);
          delete creep.memory.targetId;
        }
      } else {
        // Find the closest by path
        const ruin = creep.pos.findClosestByPath(FIND_RUINS, { filter: (r) => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0 });
        const tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, { filter: (t) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 });
        const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, { filter: (r) => r.resourceType === RESOURCE_ENERGY });
        if (tombstone) {
          if (creep.withdraw(tombstone, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.pathTo(tombstone.pos, { reusePath: 20, visualizePathStyle: { stroke: "#af0" }, ignoreCreeps: true });
          }
          creep.memory.targetId = tombstone.id;
        } else if (droppedEnergy) {
          if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
            creep.pathTo(droppedEnergy.pos, { reusePath: 20, visualizePathStyle: { stroke: "#af0" }, ignoreCreeps: true });
          }
          creep.memory.targetId = droppedEnergy.id;
        } else if (ruin) {
          if (creep.withdraw(ruin, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.pathTo(ruin.pos, { reusePath: 20, visualizePathStyle: { stroke: "#af0" }, ignoreCreeps: true });
          }
          creep.memory.targetId = ruin.id;
        }
      }
    } else {
      console.log(`Pillager ${creep.name} is in room ${creep.room.name}. Looking for exit`);
      const exitDir = creep.room.findExitTo("E52N17");
      const exit = creep.pos.findClosestByPath(exitDir as ExitConstant);
      if (exit) {
        creep.moveTo(exit, { reusePath: 10, visualizePathStyle: { stroke: "#f0f", lineStyle: "dotted" }, ignoreCreeps: false });
      } else {
        console.log(`Pillager ${creep.name} cannot find path to room E52N17.`);
      }
    }
  },
  deliver: function(creep: Creep) {
    if (creep.room.name === "E53N17") {
      // Transfer to nearest storage with capacity or if there is no storage, transfer to nearest container
      const storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
      }) as StructureContainer | StructureStorage;
      if (storage) {
        if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.pathTo(storage.pos, { reusePath: 20, visualizePathStyle: { stroke: "#0af", lineStyle: "dotted" }, ignoreCreeps: false  });
        }
      } else {
        // deliver to nearest container with capacity
        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return structure.structureType === STRUCTURE_CONTAINER && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          }
        }) as StructureContainer;
        if (container) {
          if (creep.transfer(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.pathTo(container.pos, { reusePath: 20, visualizePathStyle: { stroke: "#0af", lineStyle: "dotted" }, ignoreCreeps: false  });
          }
        }
      }
    } else {
      const exitDir = creep.room.findExitTo("E53N17");

      console.log(`Pillager ${creep.name} is in room ${creep.room.name}. Looking for exit ${exitDir}`);
      const exit = creep.pos.findClosestByPath(exitDir as ExitConstant) as RoomPosition;
      console.log(`Pillager ${creep.name} is in room ${creep.room.name}. Looking for exit ${exit}`);
      if (exit) {
        creep.moveTo(exit, { reusePath: 20, visualizePathStyle: { stroke: "#f0f" }, ignoreCreeps: true  });
      } else {
        //console.log(`Pillager ${creep.name} cannot find path to room E53N17.`);
      }
    }
  },
  run: function(creep: Creep) {
    if (typeof creep.memory.status === "undefined") creep.memory.status = "🔄 Collect"; // Default to collecting resources (if not full)
    const oldStatus = creep.memory.status;
    // There are four possible states for the pillager:
    // 1. In E52N17 and not full => Collect from ruins and tombstones, status = '🔄 Collect'
    // 2. In E52N17 and full => Move to E53N17, status = '🚚 Deliver'
    // 3. In E53N17 and not empty => Deposit resources in storage, status = '🚚 Deliver'
    // 4. In E53N17 and empty => Move to E52N17, status = '🔄 Collect'

    if (creep.room.name === "E52N17") {
      if (creep.store.getFreeCapacity() === 0) {
        creep.memory.status = "🚚 Deliver";
      } else if (creep.store.getUsedCapacity() === 0) {
        creep.memory.status = "🔄 Collect";
      }
    } else if (creep.room.name === "E53N17") {
      if (creep.store.getUsedCapacity() === 0) {
        creep.memory.status = "🔄 Collect";
      } else if (creep.store.getFreeCapacity() === 0) {
        creep.memory.status = "🚚 Deliver";
      }
    }

    if (creep.memory.status === "🔄 Collect") {
      this.pillage(creep);
    } else {
      this.deliver(creep);
    }

    if (oldStatus !== creep.memory.status) {
      creep.say(creep.memory.status);
    }
  }
};
