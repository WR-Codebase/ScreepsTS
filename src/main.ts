import { ErrorMapper } from "utils/ErrorMapper";

import worker from 'worker';
import nurse from 'nurse';
import harvester from 'harvester';
import repairer from 'repairer';
import courier from 'courier';
import hauler from 'hauler';

declare global {
  // Existing global declarations
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
  }

  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

function runTowers() {
  // Run Tower code here
  const towers= _.filter(Game.structures, s => s.structureType === STRUCTURE_TOWER) as StructureTower[];

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

function minCreeps(role: string, minCount: number, bodyConfig: BodyPartConstant[], spawnName: string, roomName: string) {
  const activeCreeps = _.filter(Game.creeps, (c) => c.memory.role === role && c.memory.room === roomName);
  if (_.size(activeCreeps) < minCount) {
    Game.spawns[spawnName].spawnCreep(bodyConfig, `${role}_${roomName}_${Game.time}`, { memory: { role: role, room: roomName, working: false, status: '', energyPriority: []} });
  }
}
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // Structures
  runTowers();

  // Creeps
  minCreeps('nurse', 2, [CARRY, CARRY, MOVE, CARRY, MOVE, MOVE], 'E22N16_1', 'E22N16');
  minCreeps('repairer', 2, [WORK, CARRY, MOVE], 'E22N16_1', 'E22N16');
  minCreeps('courier', 1, [CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE], 'E22N16_1', 'E22N16');
  minCreeps('worker', 4, [
    WORK, WORK, WORK, WORK,
    CARRY, CARRY, CARRY, CARRY,
    MOVE, MOVE, MOVE, MOVE
  ], 'E22N16_1', 'E22N16');

  let sources = Game.rooms['E22N16'].find(FIND_SOURCES);
  // Hauler per source
  sources.forEach(source => {
    const haulersForSource = _.filter(Game.creeps, (creep) => (creep.memory.role === 'hauler' && creep.memory.targetId === source.id));
    if (haulersForSource.length < 1) {
      const newName = 'hauler_E22N16_' + Game.time;
      Game.spawns['E22N16_1'].spawnCreep([
        CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
      ], newName, {
        memory: { role: 'hauler', targetId: source.id, working: false, room: 'E22N16'}
      });
    }
  });

  // Ensure one harvester per source
  sources.forEach(source => {
    const harvestersForSource = _.filter(Game.creeps, (creep) => creep.memory.role === 'harvester' && creep.memory.targetId === source.id);
    if (harvestersForSource.length < 1) {
      const newName = `harvester_E22N16_${Game.time}`;
      Game.spawns['E22N16_1'].spawnCreep([WORK, WORK, WORK, WORK, WORK, MOVE], newName, {
        memory: {
          role: 'harvester',
          targetId: source.id as string,
          room: 'E22N16',
          working: false
        }
      });
    }
  });

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role === 'worker') {
      worker.run(creep);
    } else if (creep.memory.role === 'nurse') {
      nurse.run(creep);
    } else if (creep.memory.role === 'harvester') {
      harvester.run(creep);
    } else if (creep.memory.role === 'repairer') {
      repairer.run(creep);
    } else if (creep.memory.role === 'courier') {
      courier.run(creep);
    } else if (creep.memory.role === 'hauler') {
      hauler.run(creep);
    }
  }

  // Log CPU and Memory usage
  console.log(`CPU: ${Game.cpu.getUsed().toFixed(2)}/20`);
});
