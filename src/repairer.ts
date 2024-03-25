// repairer.ts
import jobs from 'jobs';

const repairer = {
  status: '🔄 Collect',

  /** @param {Creep} creep **/
  run: function (creep: Creep) {
    if (typeof creep.memory.status === 'undefined') creep.memory.status = '🔄 Collect'; // Default to not repairing
    const oldStatus = creep.memory.status;
    if (creep.store[RESOURCE_ENERGY] === 0) {
      delete creep.memory.targetId;
      creep.memory.status = '🔄 Collect';
      creep.memory.energyPriority = ['CONTAINER_STORAGE', 'DROPPED_RESOURCE'];
      jobs.collect(creep);
    }
    if (creep.store[RESOURCE_ENERGY] > 0) {
      creep.memory.status = '🔧 Repair';
      jobs.repair(creep);
    }
    if (oldStatus !== creep.memory.status) {
      creep.say(creep.memory.status);
    }
  }
};

export default repairer;
