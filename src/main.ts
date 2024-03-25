import { ErrorMapper } from "utils/ErrorMapper";

import worker from 'worker';
import nurse from 'nurse';
import harvester from 'harvester';
import repairer from 'repairer';
import courier from 'courier';

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

function minCreeps(role: string, minCount: number, bodyConfig: BodyPartConstant[], spawnName: string, roomName: string) {
  const activeCreeps = _.filter(Game.creeps, (c) => c.memory.role === role && c.memory.room === roomName);
  if (_.size(activeCreeps) < minCount) {
    Game.spawns[spawnName].spawnCreep(bodyConfig, `${role}_${roomName}_${Game.time}`, { memory: { role: role, room: roomName, working: false, status: '', energyPriority: []} });
  }
}
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);
  // If 'worker' does not exist, spawn it
  minCreeps('nurse', 2, [CARRY, CARRY, MOVE, MOVE], 'E22N16_1', 'E22N16');
  minCreeps('repairer', 1, [WORK, CARRY, MOVE], 'E22N16_1', 'E22N16');
  minCreeps('courier', 3, [CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE], 'E22N16_1', 'E22N16');
  minCreeps('worker', 4, [
    WORK, WORK, WORK,
    CARRY, CARRY, CARRY,
    MOVE, MOVE
  ], 'E22N16_1', 'E22N16');

  let sources = Game.rooms['E22N16'].find(FIND_SOURCES);
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
    }
  }

  // Log CPU and Memory usage
  console.log(`CPU: ${Game.cpu.getUsed().toFixed(2)}/20`);
});
