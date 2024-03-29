import { ErrorMapper } from "utils/ErrorMapper";

import worker from "worker";
import nurse from "nurse";
import harvester from "harvester";
import repairer from "repairer";
import courier from "courier";
import hauler from "hauler";
import scout from "scout";
import collective from "collective";
import remoteDefender from "remoteDefender";
import remoteHarvester from "remoteHarvester";
import creepHandler from "creepHandler";

declare global {
  interface Memory {
    uuid: number;
    log: any;
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
    status?: string;
    energyPriority?: string[];
    targetId?: string;
    targetRoom?: string;
  }

  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

/**
 * runTowers - Run the tower code for each tower in the room
 * @returns {void}
 */
function runTowers() {
  // Run Tower code here
  const towers = _.filter(Game.structures, s => s.structureType === STRUCTURE_TOWER) as StructureTower[];

  towers.forEach(tower => {
    // Find the closest hostile unit
    const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (closestHostile) {
      // Attack the closest hostile unit
      tower.attack(closestHostile);
    } else if (tower.store.getUsedCapacity(RESOURCE_ENERGY) > 850) {
      // Check if energy is over 850 and if so, find the most damaged structure and repair
      // Don't repair walls or roads, or you'll never stop repairing them
      const targets = tower.room.find(FIND_STRUCTURES, {
        filter: (structure) => structure.hits < structure.hitsMax
          && structure.hits <= 150000
          && structure.structureType !== STRUCTURE_ROAD
          && structure.structureType !== STRUCTURE_WALL
      });

      if (targets.length > 0) {
        // Sort the ramparts by hits in ascending order to find the most damaged one
        targets.sort((a, b) => a.hits - b.hits);
        // Repair the most damaged target
        tower.repair(targets[0]);
      }
    }
  });
}

function minCreeps(roleName: string, minCount: number, spawnName: string) {

  const activeCreeps = _.filter(Game.creeps, (c) => c.memory.role === roleName && c.memory.room === Game.spawns[spawnName].room.name);
  if (_.size(activeCreeps) < minCount) {
    creepHandler.spawn(spawnName, roleName);
  }
  console.log(`CPU after minCreeps: ${Game.cpu.getUsed().toFixed(2)}`);
}

export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // Structures
  runTowers();
  // Run Collective Consciousness
  //collective.run();

  console.log(`CPU usage before spawning: ${Game.cpu.getUsed().toFixed(2)}`);

  for (const spawnName in Game.spawns) {
    if (Game.spawns[spawnName].spawning) continue; // Already spawning this tick
    // @ts-ignore
    creepHandler.spawn(spawnName);
  }

  let sources = Game.rooms["E53N17"].find(FIND_SOURCES);
  // Hauler per source
  sources.forEach(source => {
    const haulersForSource = _.filter(Game.creeps, (creep) => (creep.memory.role === "hauler" && creep.memory.targetId === source.id));
    if (haulersForSource.length < 1) {
      const newName = "hauler_E53N17_" + Game.time;
      Game.spawns["E53N17_1"].spawnCreep([
        CARRY, CARRY, CARRY, CARRY, CARRY,
        MOVE, MOVE, MOVE, MOVE, MOVE
      ], newName, {
        memory: { role: "hauler", targetId: source.id, working: false, room: "E53N17" }
      });
    }
  });

  // Ensure one harvester per source
  sources.forEach(source => {
    const harvestersForSource = _.filter(Game.creeps, (creep) => creep.memory.role === "harvester" && creep.memory.targetId === source.id);
    if (harvestersForSource.length < 1) {
      const newName = `harvester_E53N17_${Game.time}`;
      Game.spawns["E53N17_1"].spawnCreep([WORK, WORK, WORK, MOVE], newName, {
        memory: {
          role: "harvester",
          targetId: source.id as string,
          room: "E53N17",
          working: false
        }
      });
    }
  });

  creepHandler.run();
  // Log CPU and Memory usage
  console.log(`CPU: ${Game.cpu.getUsed().toFixed(2)}/20`);
});
