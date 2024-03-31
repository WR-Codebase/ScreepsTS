import jobs from 'jobs';
declare global {
  interface CreepMemory {
    status?: string;
    energyPriority?: string[];
    targetId?: string;
  }
}
/**
 * The Nurse role nourishes larval creeps by filling the extensions and spawns with energy.
 * @type {{run: nurse.run}}
 */
const nurse = {
  template: {
    pattern: [],
    prefix: [],
    suffix: [CARRY, MOVE, CARRY, MOVE, CARRY, MOVE]
  },
  run: function (creep: Creep) {
    if (typeof creep.memory.status === 'undefined') creep.memory.status = '🔄 Collect'; // Default to not nursing
    const oldStatus = creep.memory.status;

    // This needs to be reworked so that the nurse keeps nourishing until empty, and then collects until full. It should not collect if it has any energy left.
    //creep.memory.nursing=true;
    if (creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.status = '🔄 Collect';
      delete creep.memory.targetId
    } else {
      creep.memory.status = '🍼 Nurse';
      delete creep.memory.targetId
    }

    if (creep.memory.status === '🍼 Nurse') {
      jobs.nourish(creep);
    } else {
      creep.memory.energyPriority = ['CONTAINER_STORAGE', 'DROPPED_RESOURCE', 'RUIN',  'TOMBSTONE'];
      jobs.collect(creep);
    }

    if (oldStatus !== creep.memory.status) {
      // The nursing state needs a baby bottle icon
      creep.say(creep.memory.status);
    }
  }
};

export default nurse;
