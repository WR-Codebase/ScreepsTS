import jobs from 'jobs';
declare global {
  interface CreepMemory {
    status?: string;
    energyPriority?: string[];
    targetId?: string;
  }
}

const worker = {
  // The role name helps identify the purpose of this module
  role: 'worker',
  status: 'idle',

  template: {
    pattern: [WORK, CARRY],
    prefix: [],
    suffix: [MOVE, MOVE]
  },

  run: function (creep: Creep) {
    //console.log(`${creep.name} is ${this.status}`);
    // Adjusted logic to ensure the worker completes using all energy before refilling
    const oldStatus = creep.memory.status;

    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) !== 0) {
      // Check for construction sites
      if (creep.room.find(FIND_CONSTRUCTION_SITES).length > 0) {
        // If there are construction sites, prioritize building
        creep.memory.status = '🚧 Build';
      } else {
        // If no construction sites, then upgrade the controller
        creep.memory.status = '⚡ Upgrade';
      }
    } else {
      // If the worker has no energy, set energy collection priorities and collect
      creep.memory.status = '🔄 Collect';
    }

    if (creep.memory.status === '🚧 Build') {
      jobs.build(creep);
    } else if (creep.memory.status === '⚡ Upgrade') {
      jobs.upgrade(creep);
    } else {
      creep.memory.energyPriority = ['CONTAINER_STORAGE', 'DROPPED_RESOURCE']; //
      jobs.collect(creep);
    }

    if (oldStatus !== creep.memory.status) {
      delete creep.memory.targetId
      creep.say(creep.memory.status);
    }
  }
};

export default worker;
