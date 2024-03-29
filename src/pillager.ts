// The pillager Creep role is responsible for collecting resources from ruins and tombstones in E52N17. When full it returns to E53N17 to deposit the resources in storage.

export default {
  template:{
    pattern: [CARRY, MOVE],
    prefix: [],
    suffix: []
  },
  pillage: function(creep: Creep) {
    if (creep.room.name === "E52N17") {
      // Find the closest by path
      const ruin = creep.pos.findClosestByPath(FIND_RUINS, { filter: (r) => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0 });
      const tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, { filter: (t) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 });
      if (ruin) {
        if (creep.withdraw(ruin, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(ruin, { reusePath: 20, visualizePathStyle: { stroke: "#af0" }, ignoreCreeps: true  });
        }
      } else if (tombstone) {
        if (creep.withdraw(tombstone, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(tombstone, { reusePath: 20, visualizePathStyle: { stroke: "#af0" }, ignoreCreeps: true  });
        }
      }
    } else {
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
      // Transfer to nearest container or storage with capacity
      const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
      }) as StructureContainer | StructureStorage;
      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { reusePath: 20, visualizePathStyle: { stroke: "#0af", lineStyle: "dotted" }, ignoreCreeps: true  });
        }
      }
    } else {
      const exitDir = creep.room.findExitTo("E53N17");
      const exit = creep.pos.findClosestByPath(exitDir as ExitConstant);
      if (exit) {
        creep.moveTo(exit, { reusePath: 20, visualizePathStyle: { stroke: "#f0f" }, ignoreCreeps: true  });
      } else {
        console.log(`Pillager ${creep.name} cannot find path to room E53N17.`);
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
