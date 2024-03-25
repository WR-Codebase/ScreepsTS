// repairer.ts
import jobs from 'jobs';

const repairer = {
  /** @param {Creep} creep **/
  run: function (creep: Creep) {
    if (creep.store[RESOURCE_ENERGY] === 0) {
      delete creep.memory.targetId;
      jobs.collect(creep);
    }
    if (creep.store[RESOURCE_ENERGY] > 0) {
      jobs.repair(creep);
    }
  }
};

export default repairer;
