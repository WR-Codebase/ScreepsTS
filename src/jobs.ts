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
            creep.pathTo(target.pos, { reusePath: 20, visualizePathStyle: { stroke: "#0af" }, ignoreCreeps: false });
          }
        } else {
          // If the creep has less than 50 energy, collect more
          this.collect(creep);
        }
      }
    },
    nourish: function(creep: Creep) {
      //console.log(`${creep.name} is nourishing ${creep.memory.targetId}`);
      // If the creep already has a target and that target is not yet full, do not get a new target

      // First check if the creep has a target spawn or extension and it still needs energy
      if (creep.memory.targetId) {
        //console.log(`Target still valid, ${creep} is nourishing ${creep.memory.targetId}`);
        const target = Game.getObjectById(creep.memory.targetId) as StructureSpawn | StructureExtension;
        if (target && target.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
          if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.pathTo(target.pos, { visualizePathStyle: { stroke: "#f77", lineStyle: "solid" }, ignoreCreeps: false });
          }
          return;
        }
      }

      // If we get here, we need a new target, starting with extensions that are not yet full
      const extensions = creep.room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType === STRUCTURE_EXTENSION)
            && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
      }) as StructureExtension[];

      if (extensions.length > 0) {
        // find the closest by path and fill it
        extensions.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));
        creep.memory.targetId = extensions[0].id;
      } else {
        // Otherwise find the closest spawn that needs energy
        const spawns = creep.room.find(FIND_MY_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType === STRUCTURE_SPAWN)
              && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          }
        }) as StructureSpawn[];
        if (spawns.length > 0) {
          spawns.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));
          creep.memory.targetId = spawns[0].id;
        }
      }

      //console.log(`Checking ${creep.name} target: ${creep.memory.targetId}`);
      if (creep.memory.targetId) {
        const target = Game.getObjectById(creep.memory.targetId) as AnyOwnedStructure;
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.pathTo(target.pos, { visualizePathStyle: { stroke: "#f77", lineStyle: "solid" }, ignoreCreeps: false });
        }
      }
    },
    getRepairTarget: function(creep: Creep) {
      // Find structures with less than 100,000 hits
      const targets = creep.room.find(FIND_STRUCTURES, { filter: object => object.hits < object.hitsMax && object.hits <= 100000 });
      // remove any already targeted for repair
      const untargetedTargets = targets.filter(target => {
        return !_.some(Game.creeps, { reusePath: 20, memory: { role: 'repairer', targetId: target.id } });
      });

      // Sort by percentage of health, lowest to highest
      if (untargetedTargets.length > 0) {
        untargetedTargets.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
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
          creep.moveTo(targetToRepair, { reusePath: 20, visualizePathStyle: { stroke: "#fa0", lineStyle: "dashed" }, ignoreCreeps: false });
          //creep.travelTo(targetToRepair, { ignoreCreeps: false });
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
          creep.moveTo(target, { reusePath: 10, visualizePathStyle: { stroke: "#fa0", lineStyle: "dotted" }, ignoreCreeps: false });
        }
      } else {
        creep.memory.status = "idle";
      }
    },
    collect: function(creep: Creep) {
      let target;

      // If creep is full, stop collecting.
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        delete creep.memory.status;
        delete creep.memory.targetId;
        return;
      }

      // Use the creep's personal priority list if available, otherwise default
      const priorityTargets = (creep.memory.energyPriority)? creep.memory.energyPriority : ["TOMBSTONE", "RUIN", "CONTAINER_STORAGE", "DROPPED_RESOURCE", "SOURCE"];

      // If the creep has a target in memory, check if it is still valid
      if (creep.memory.targetId) {
        // If a target is no longer valid, remove it from creep memory
        const thisTarget = Game.getObjectById(creep.memory.targetId) as Tombstone | Ruin | StructureContainer | StructureStorage | StructureLink | Source | Resource | StructureSpawn;
        if (thisTarget) {
          // @ts-ignore
          if (thisTarget.store && thisTarget.store[RESOURCE_ENERGY] === 0) {
            // If target in memory is empty, remove it
            delete creep.memory.targetId;
          }
        }
      }

      // Now that we have unset invalid targets, If we don't have a target, get a new one
      if (!creep.memory.targetId) {
        //console.log(`${creep.name} is looking for a new target`);
        for (const targetType of priorityTargets) {
          if (targetType === "DROPPED_RESOURCE") {
            // If range is null, use findClosestByPath for maximum flexibility
            target = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
              filter: (r: Resource) => (r.resourceType === RESOURCE_ENERGY)
            });
            if (target) break; // Exit loop if a target is found
          } else if (targetType === "TOMBSTONE") {
            target = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
              filter: (t: Tombstone) => (t.store[RESOURCE_ENERGY] > 0)
            });
            if (target) break;
          } else if (targetType === "RUIN") {
            // Use the same logic as for tombstones and dropped resources
            target = creep.pos.findClosestByPath(FIND_RUINS, {
              filter: (r: Ruin) => (r.store[RESOURCE_ENERGY] > 0)
            });
            if (target) break;
          } else if (targetType === "CONTAINER_STORAGE") {
            // Find the closest container or storage with energy
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
              filter: (s: StructureContainer | StructureStorage) => ((s.structureType === STRUCTURE_CONTAINER
                  || s.structureType === STRUCTURE_STORAGE)
                && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            });

          } else if (targetType === "CONTAINER") {
            // Find the closest container with energy
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
              filter: (s: StructureContainer) => (s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0)
            });
            //console.log(`Container found ${targetType} ${target}`);
          } else if (targetType === "STORAGE") {
            //console.log(`${creep.name} is looking for storage`);
            // Find the closest storage
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
              filter: (s) => (s.structureType === STRUCTURE_STORAGE)
                && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            });
            //console.log(`Storage found ${targetType} ${target}`);
          } else if (targetType === "LINK") {
            // Find the closest Link with energy
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
              filter: (s: StructureLink) => (s.structureType === STRUCTURE_LINK && s.store[RESOURCE_ENERGY] > 0)
            });
            if (target) break; // Exit loop if a target is found
          } else if (targetType === "SOURCE") {
            // Finding the closest active source
            target = creep.pos.findClosestByPath(FIND_SOURCES);
            //console.log(`Found ${targetType} ${target}`);
          } else if (targetType === "SPAWN") {
            // Try drawing energy from spawns and putting it in extensions
            const spawn = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_SPAWN } }) as StructureSpawn;
            if (spawn && spawn.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
              target = spawn;
            }
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
      console.log(`${creep.name} is collecting from ${target}`);
      // Attempt to interact with the target based on its type
      if (target instanceof Resource && creep.pickup(target) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: "#0f0", lineStyle: "dotted" }, ignoreCreeps: false });
      } else if (target instanceof Source
        && creep.harvest(target) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: "#0f0", lineStyle: "dotted" }, ignoreCreeps: false });
      } else if ((target instanceof Tombstone
          || target instanceof Ruin
          || target instanceof StructureContainer
          || target instanceof StructureStorage
          || target instanceof StructureLink
          || target instanceof StructureSpawn)
        && creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        //console.log(`${creep.name} found ${target}, moving to it now`);

        creep.moveTo(target, { visualizePathStyle: { stroke: "#0f0", lineStyle: "dotted" }, ignoreCreeps: false });
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
          creep.moveTo(creep.room.controller as StructureController, { reusePath: 20, visualizePathStyle: { stroke: "#fa0", lineStyle: "dotted" }, ignoreCreeps: false });
        }
      } else {
        this.collect(creep);
      }
    }

// Rest of the jobs.js functions
  }
;

export default jobs;
