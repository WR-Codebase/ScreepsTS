import { ErrorMapper } from "utils/ErrorMapper";
import creepHandler from "creepHandler";
import "pathTo";

// Global memory interfaces
declare global {
  interface Memory {
    uuid: number;
    log: any;
  }

  // Define the interface for a Task
  interface Task {
    id: string; // Unique identifier for the task
    type: string; // Type of the task (e.g., 'harvest', 'build', 'repair')
    priority: number; // Priority of the task (lower number = higher priority)
    assignedTo: string[]; // Array of creep names assigned to this task
    status: 'pending' | 'inProgress' | 'completed'; // Status of the task
    roomName: string; // The name of the room where the task is to be executed
    targetId: string; // The ID of the target object for the task (e.g., source, construction site)
    // Additional task-specific parameters can be added here
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
    status?: string;
    energyPriority?: string[];
    targetId?: string;
    targetRoom?: string;
    _move?: {
      dest: RoomPosition;
      path: RoomPosition[];
    }
    _shoveTarget?: RoomPosition;
  }

  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

// Global constants for use with memory segments, ROOMS = 0, PATHS = 1, TASKS = 2
const ROOMS = 0;
const PATHS = 1;
const TASKS = 2;

function canClaimController(controller : StructureController) {
  // Check if the controller is unowned
  if (!controller.owner) {
    // Check if the controller is reserved by another player
    if (controller.reservation && controller.reservation.username !== 'WoodenRobot') {
      return false; // Controller is reserved by someone else
    }
    return true; // Controller is unreserved or reserved by you, and can be claimed
  }
  return false; // Controller is owned by someone else
}

/**
 * purgeMemory - removes no-longer-used memory entries
 * @returns {void}
 */
function purgeMemory() {
  // tidy up dead creeps
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
    }
  }
}

/**
 * Handles the energy transfer between links in a room
 * @returns {void}
 */
function runLinks(){
  // Iterate over all rooms controlled by your AI
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    console.log(`Checking room ${roomName} for links`);

    // Continue only if the room has a storage and controller owned by you
    if (room.storage && room.controller?.my) {
      // Find all links in the room
      const links = room.find(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_LINK }
      });

      if (links.length > 1) {
        // Determine the link closest to the storage to set it as the target link
        const targetLink = room.storage.pos.findClosestByRange(links) as StructureLink;

        // Filter out the target link to get a list of source links
        const sourceLinks = links.filter(link => link.id !== targetLink.id) as StructureLink[]

        // Ensure the target link and source links are not in cooldown and have enough energy
        sourceLinks.forEach(sourceLink => {
          if (sourceLink.cooldown === 0 && targetLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            // Attempt to transfer as much energy as possible to the target link
            sourceLink.transferEnergy(targetLink);
          }
        });
      } else if (links.length === 1) {
        console.log(`Room ${roomName} has only one link, which serves as both source and target.`);
      } else {
        console.log(`Room ${roomName} does not have any links.`);
      }
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

// Main game loop
export const loop = ErrorMapper.wrapLoop(() => {

  console.log(`CPU usage before loop: ${Game.cpu.getUsed().toFixed(2)}`);

  if (typeof Memory.collective === 'undefined') {
    Memory.collective = {
      time: {
        tick: Game.time,
        five: Game.time + 5,
        ten: Game.time + 10,
        hundred: Game.time + 100
      }
    };
  }
  console.log(`Current game tick is ${Game.time}`);

  console.log(`CPU Usage at checkpoint: ${Game.cpu.getUsed().toFixed(2)}`);

  if (Game.time >= Memory.collective.time.hundred) {
    console.log(`100 tick code`);
    // Run the 100 tick code

    // Run Collective Consciousness AKA Raw Memory <=> Memory.collective sync
    //collective.run();

    // Increment the next hundred
    Memory.collective.time.hundred = Game.time + 100;
  }

  if (Game.time >= Memory.collective.time.ten) {
    console.log(`10 tick code`);


    console.log(`CPU usage before spawning: ${Game.cpu.getUsed().toFixed(2)}`);
    let cpuStat = Game.cpu.getUsed();
    for (const spawnName in Game.spawns) {
      if (Game.spawns[spawnName].spawning) continue; // Already spawning this tick
      // @ts-ignore
      creepHandler.spawn(spawnName);
    }

    const roomsAllowedToHarvest = ['E52N17', 'E53N17' , 'E53N18', 'E53N16', 'E54N17'];
    for (const room of roomsAllowedToHarvest) {

      // If the room is under attack, stop all non-combat spawning and generate three large remoteDefender creeps
      if (false) {/*
        Game.rooms[room].find(FIND_HOSTILE_CREEPS).length > 0
        // Spawn one remoteDefender per room
        const remoteDefenders = _.filter(Game.creeps, (creep) => creep.memory.role === "remoteDefender" && creep.memory.targetRoom === room);
        // 4 ranged attack, 4 move
        if (remoteDefenders.length < 3) {
          const newName = `remoteDefender_${room}_${Game.time}`;
          Game.spawns["E53N17_1"].spawnCreep([RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE], newName, {
            memory: {
              role: "remoteDefender",
              targetRoom: room,
              room: room,
              working: false
            }
          });
        }*/
      } else {
        try {
          console.log(`Checking room ${room}`);
          // If room is not E53N17, also spawn two haulers and a remote defender
          if (room !== 'E53N17') {
            // Spawn one remoteDefender per room
            const remoteDefenders = _.filter(Game.creeps, (creep) => creep.memory.role === "remoteDefender" && creep.memory.targetRoom === room);
            // 4 ranged attack, 4 move
            if (remoteDefenders.length < 1) {
              const newName = `remoteDefender_${room}_${Game.time}`;
              Game.spawns["E53N17_1"].spawnCreep([RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE], newName, {
                memory: {
                  role: "remoteDefender",
                  targetRoom: room,
                  room: room,
                  working: false
                }
              });
            }
          }

          // If room is not owned by the colony, spawn a drone for that room
          if (canClaimController(Game.rooms[room].controller as StructureController)) {
            const drones = _.filter(Game.creeps, (creep) => creep.memory.role === "drone" && creep.memory.room === room);
            if (drones.length < 1) {
              const newName = `drone_${room}_${Game.time}`;
              Game.spawns["E53N17_1"].spawnCreep([CLAIM, MOVE], newName, {
                memory: {
                  role: "drone",
                  room: room,
                  working: false
                }
              });
            }
          } else if (Game.rooms[room].controller?.my) {
            // If room is owned or reserved by the colony, spawn harvesters and haulers
            let sources = Game.rooms[room].find(FIND_SOURCES);
            // Ensure one harvester per source
            sources.forEach(source => {
              const harvestersForSource = _.filter(Game.creeps, (creep) => creep.memory.role === "harvester" && creep.memory.targetId === source.id);
              if (harvestersForSource.length < 1) {
                const newName = `harvester_${room}_${Game.time}`;
                Game.spawns["E53N17_1"].spawnCreep([WORK, WORK, WORK, WORK, WORK, CARRY, MOVE], newName, {
                  memory: {
                    role: "harvester",
                    targetId: source.id as string,
                    room: room,
                    working: false
                  }
                });
              }
              if (room !== 'E53N17') {
                const haulers = _.filter(Game.creeps, (creep) => creep.memory.role === "hauler" && creep.memory.targetId === source.id);
                if (haulers.length < 2) {
                  const newName = `hauler_${room}_${Game.time}`;
                  Game.spawns["E53N17_1"].spawnCreep([CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], newName, {
                    memory: {
                      role: "hauler",
                      targetId: source.id as string,
                      room: room,
                      working: false
                    }
                  });
                }
              }
            });
          }
        } catch (e) {
          console.log(`Error finding sources for room ${room}: ${e}`);
        }
      }
    }

    cpuStat = Game.cpu.getUsed() - cpuStat;
    console.log(`CPU usage for spawning: ${cpuStat.toFixed(2)}`);
    // Increment the next ten
    Memory.collective.time.ten = Game.time + 10;
  }

  if (Game.time >= Memory.collective.time.five) {
    console.log(`5 tick code`);
    // Run the 5 tick code

    // Task Queue
    // The task queue will live in RawMemory and will be an array of objects


    // Increment the next five
    Memory.collective.time.five = Game.time + 5;
  }
  // Run the 1 tick code

  // Structures
  runLinks();
  runTowers();

  // Creeps
  creepHandler.run();

  purgeMemory();

  // Log CPU and Memory usage
  console.log(`CPU: ${Game.cpu.getUsed().toFixed(2)}/20`);
});
