// jobs.js
const jobs = {
    refillTowers: function(creep: Creep) {
      // Refill towers in the room
      const towers = creep.room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
          return structure.structureType === STRUCTURE_TOWER
            && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
      });
      if (towers.length > 0) {
        // If creep has at least 50 energy, fill the nearest tower that needs energy
        if (creep.store[RESOURCE_ENERGY] >= 50) {
          const target = creep.pos.findClosestByPath(towers) as AnyOwnedStructure;
          if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: "#0af" }, ignoreCreeps: false });
          }
        } else {
          // If the creep has less than 50 energy, collect more
          this.collect(creep);
        }
      }
    },
    nourish: function(creep: Creep) {
      //console.log(`${creep.name} is nourishing`);
      // If the creep already has a target and that target is not yet full, do not get a new target
      if (creep.memory.targetId) {
        //console.log(`${creep.name} has a target already, checking if it's full.`);
        const target = Game.getObjectById(creep.memory.targetId) as AnyOwnedStructure;
        if (!target) {
          //console.log(`${creep.name} has lost its target`);
          delete creep.memory.targetId;
          return;
        }

        // If structure type is not a spawn or extension, delete the target
        if (target.structureType !== STRUCTURE_SPAWN && target.structureType !== STRUCTURE_EXTENSION) {
          delete creep.memory.targetId;
          return;
        }
        // Check if the target still needs energy before attempting to transfer
        if (target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) { // throws an error if target doesn't have a store
          // Target is already full, clear the current targetId and find a new target next tick
          delete creep.memory.targetId;
          //console.log(`${creep.name} found its target already full, looking for a new target.`);
          return; // Exit the function to allow for new target selection in the next tick
        }
        //console.log(`${creep.name} attempting to transfer to ${target.structureType} at ${target.pos}, Energy: ${creep.store.getUsedCapacity(RESOURCE_ENERGY)}`);
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: "#f96" }, ignoreCreeps: false });
        } else if (creep.transfer(target, RESOURCE_ENERGY) === OK) {
          //console.log(`${creep.name} transferred energy to ${target.structureType}`);
        } else {
          //console.log(`${creep.name} encountered an error while transferring energy to ${target.structureType}`);
          delete creep.memory.targetId;
          return;
        }
      } else {
        // If the creep has no target or the target is full, find a new target
        delete creep.memory.targetId;

        //console.log(`${creep.name} is looking for a new target`);
        // Needs to be able to filter out already targeted structures and sort the rest ascending by distance
        const targets = creep.room.find(FIND_MY_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType === STRUCTURE_SPAWN
                || structure.structureType === STRUCTURE_EXTENSION)
              && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          }
        }).sort((a, b) => {
          return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
        });

        if (targets.length > 0) {
          creep.memory.targetId = targets[0].id;
          //console.log(`${creep.name} found a new target: ${creep.memory.targetId}`);
        } else {
          //console.log(`${creep.name} found no new targets`);
          return;
        }
      }

      if (creep.memory.targetId) {
        const target = Game.getObjectById(creep.memory.targetId) as AnyOwnedStructure;
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: "#f96" }, ignoreCreeps: false });
        }
      }
    },
    getRepairTarget: function(creep: Creep) {
      const targets = creep.room.find(FIND_STRUCTURES, { filter: object => object.hits < object.hitsMax });
      const untargetedTargets = targets.filter(target => {
        return !_.some(Game.creeps, { memory: { target: target.id } });
      });

      if (untargetedTargets.length > 0) {
        untargetedTargets.sort((a, b) => a.hits - b.hits);
        creep.memory.targetId = untargetedTargets[0].id;
      }
    },
    repair: function(creep: Creep) {
      if (creep.memory.targetId) {
        //console.log(`Creep ${creep.name} is repairing target ${creep.memory.target}`);
      } else {
        //console.log(`Creep ${creep.name} has no repair target`);
        this.getRepairTarget(creep);
        //console.log(`Creep ${creep.name} has new repair target ${creep.memory.target}`);
      }

      const targetToRepair = Game.getObjectById(creep.memory.targetId as string) as AnyOwnedStructure;
      if (targetToRepair) {
        if (creep.repair(targetToRepair) === ERR_NOT_IN_RANGE) {
          creep.moveTo(targetToRepair, { visualizePathStyle: { stroke: "#fa0" }, ignoreCreeps: false });
        }
        // If target is full, unset target
        if (targetToRepair.hits === targetToRepair.hitsMax) {
          delete creep.memory.targetId;
        }
      } else {
        delete creep.memory.targetId;
      }
    },
    build: function(creep: Creep) {
      let target;
      if (creep.memory.targetId) {
        target = Game.getObjectById(creep.memory.targetId) as ConstructionSite;
      } else {
        target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
      }
      if (target) {
        if (creep.build(target) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: "#fa0" }, ignoreCreeps: false });
        }
      } else {
        creep.memory.status = "idle";
      }
    },
    collect: function(creep: Creep) {
      let target;
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        delete creep.memory.status;
        delete creep.memory.targetId;
        return;
      }
      //console.log(`Checking ${creep.name}'s energy priority list: ${(creep.memory.energyPriority)}`);
      // Use the creep's personal priority list if available, otherwise default
      const priorityTargets = (creep.memory.energyPriority)? creep.memory.energyPriority : ["TOMBSTONE", "RUIN", "CONTAINER_STORAGE", "DROPPED_RESOURCE", "SOURCE"];

      //console.log(`${creep.name} is collecting with priority ${priorityTargets}`);
      if (creep.memory.targetId) {
        // If a target is no longer valid, remove it from creep memory
        const thisTarget = Game.getObjectById(creep.memory.targetId) as Tombstone | Ruin | StructureContainer | StructureStorage | StructureLink | Source | Resource
        if (thisTarget) {
          // @ts-ignore
          if (thisTarget.store && thisTarget.store[RESOURCE_ENERGY] === 0) {
            //console.log(`${creep.name}'s target ${creep.memory.targetId} is empty.`);
            delete creep.memory.targetId;
          }
        }
      }

      // Now that we have unset invalid targets, if it is not set, get a new target
      if (!creep.memory.targetId) {
        //console.log(`${creep.name} is looking for a new target`);
        for (const targetType of priorityTargets) {
          if (targetType === "DROPPED_RESOURCE") {
            // If range is null, use findClosestByPath for maximum flexibility
            target = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
              filter: (r) => r.resourceType === RESOURCE_ENERGY
            });
            if (target) break; // Exit loop if a target is found
          } else if (targetType === "TOMBSTONE") {
            target = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
              filter: (t) => t.store[RESOURCE_ENERGY] > 0
            });
            if (target) break;
          } else if (targetType === "RUIN") {
            // Use the same logic as for tombstones and dropped resources
            target = creep.pos.findClosestByPath(FIND_RUINS, {
              filter: (r) => r.store[RESOURCE_ENERGY] > 0
            });
            if (target) break;
          } else if (targetType === "CONTAINER_STORAGE") {
            // Find the closest container or storage with energy
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
              filter: (s) => (s.structureType === STRUCTURE_CONTAINER
                  || s.structureType === STRUCTURE_STORAGE)
                && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            });

          } else if (targetType === "CONTAINER") {
            // Find the closest container with energy
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
              filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
            });
            //console.log(`Container found ${targetType} ${target}`);
          } else if (targetType === "STORAGE") {
            // Find the closest storage
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
              filter: (s) => (s.structureType === STRUCTURE_STORAGE)
                && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            });
            //console.log(`Storage found ${targetType} ${target}`);
          } else if (targetType === "LINK") {
            // Find the closest Link with energy
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
              filter: (s) => s.structureType === STRUCTURE_LINK && s.store[RESOURCE_ENERGY] > 0
            });
            if (target) break; // Exit loop if a target is found
          } else if (targetType === "SOURCE") {
            // Finding the closest active source
            target = creep.pos.findClosestByPath(FIND_SOURCES);
            //console.log(`Found ${targetType} ${target}`);
          } else {
            //console.log(`Unknown target type: ${targetType}`);
          }

          if (target) {
            // store it in memory
            creep.memory.targetId = target.id;
            break; // Exit loop if a target is found
          }
        }
      }

      if (!target) {
        target = Game.getObjectById(creep.memory.targetId as string);
      }
      //console.log(`${creep.name} is collecting from ${target}`);

      // Attempt to interact with the target based on its type
      if (target instanceof Resource && creep.pickup(target) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: "#0fa" }, ignoreCreeps: false });
      } else if (target instanceof Source
        && creep.harvest(target) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: "#0fa" }, ignoreCreeps: false });
      } else if ((target instanceof Tombstone
          || target instanceof Ruin
          || target instanceof StructureContainer
          || target instanceof StructureStorage
          || target instanceof StructureLink)
        && creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        //console.log(`${creep.name} found ${target}, moving to it now`);

        creep.moveTo(target, { visualizePathStyle: { stroke: "#0fa" }, ignoreCreeps: false });
      }
    },

    upgrade: function(creep: Creep) {

      if (creep.memory.status === '⚡ Upgrade' && creep.store[RESOURCE_ENERGY] === 0) {
        creep.memory.status = '🔄 Collect';
        creep.say("🔄 Collect");
      }
      if (creep.memory.status !== '⚡ Upgrade' && creep.store.getFreeCapacity() === 0) {
        creep.memory.status = '⚡ Upgrade';
        creep.say("⚡ Upgrade");
      }

      if (creep.memory.status === '⚡ Upgrade') {
        if (creep.upgradeController(creep.room.controller as StructureController) === ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.controller as StructureController, { visualizePathStyle: { stroke: "#fa0" }, ignoreCreeps: false });
        }
      } else {
        this.collect(creep);
      }
    }

// Rest of the jobs.js functions
  }
;

export default jobs;
