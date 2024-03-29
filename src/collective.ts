/**
 * @module collective
 * @description This module is responsible for managing the collective consciousness of the colony.
 * It tracks the needs of the colony and assigns roles to creeps based on those needs and the creeps' available parts.
 * It tracks/plans static/long-term features such as energy source locations, room ownership, and room layout.
 * It responds to dynamic changes in the Screeps world, such as the appearance of hostile creeps.
 */

declare global {
  interface Memory {
    collective: {
      time?: any,
      rooms?: any,
      creeps?: any
    };
  }
}

const collective: any = {
  run: function() {
    //console.log(`Collective is running!`);

    //delete Memory.collective.rooms['E22N16'];
    const selfName = "WoodenRobot";
    if (!Memory.collective) {
    // Home room is the one with the initial spawn in it
    const initialSpawn = Game.spawns[Object.keys(Game.spawns)[0]];
    const homeRoom = initialSpawn.room;
      //console.log(`Home room: ${homeRoom}`);
      Memory.collective = {
        rooms: {}
      };
      Memory.collective.rooms = {
        [homeRoom.name]: {
          owner: homeRoom.controller?.owner?.username || "unowned",
          energy: homeRoom.energyAvailable,
          energyCapacity: homeRoom.energyCapacityAvailable,
          exits: [],
          sources: {},
          mineral: {
            id: homeRoom.find(FIND_MINERALS)[0].id,
            type: homeRoom.find(FIND_MINERALS)[0].mineralType,
            density: homeRoom.find(FIND_MINERALS)[0].density,
            amount: homeRoom.find(FIND_MINERALS)[0].mineralAmount,
            pos: homeRoom.find(FIND_MINERALS)[0].pos
          },
          controller: {
            id: homeRoom.controller?.id || "",
            owner: homeRoom.controller?.owner?.username || "unowned",
            level: homeRoom.controller?.level || 0,
            progress: homeRoom.controller?.progress || 0,
            progressTotal: homeRoom.controller?.progressTotal || 0,
            downgradeTimer: homeRoom.controller?.ticksToDowngrade || 0,
            safeModeAvailable: homeRoom.controller?.safeModeAvailable || 0,
            powerEnabled: homeRoom.controller?.isPowerEnabled,
            pos: homeRoom.controller?.pos
          }
        }
      };
    }

    // If the collective memory has a time object
    if (!Memory.collective.time) {
      Memory.collective.time = {
        tick: Game.time,
        ten: Game.time + 10,
        hundred: Game.time + 100
      };
    } else {
      // Update the tick
      Memory.collective.time.tick = Game.time;

      if (Game.time === Memory.collective.time.hundred) {
        // Run the 100 tick code
        // Increment the next hundred
        Memory.collective.time.hundred = Game.time + 100;
      } else if (Game.time === Memory.collective.time.ten) {
        // Run the 10 tick code
        // Once per room, populate the static values
        for (const roomName in Game.rooms) {
          if (!Memory.collective.rooms.hasOwnProperty(roomName)) {
            Memory.collective.rooms[roomName] = {
              owner: Game.rooms[roomName].controller?.owner?.username || "unowned",
              energy: Game.rooms[roomName].energyAvailable,
              energyCapacity: Game.rooms[roomName].energyCapacityAvailable,
              sources: {}
            };
          }
          // Check exits
          // TypeError: Cannot read property 'length' of undefined
          if (Memory.collective.rooms[roomName].exits.length === 0) {
            Memory.collective.rooms[roomName].exits = Game.rooms[roomName].find(FIND_EXIT);
          }
          // Populate the sources
          if (Object.keys(Memory.collective.rooms[roomName].sources).length === 0) {
            const sources = Game.rooms[roomName].find(FIND_SOURCES);
            sources.forEach(source => {
              Memory.collective.rooms[roomName].sources[source.id] = {
                x: source.pos.x,
                y: source.pos.y
              };
            });
          }
          // Populate the mineral
          if (!Memory.collective.rooms[roomName].mineral) {
            const mineral = Game.rooms[roomName].find(FIND_MINERALS)[0];
            Memory.collective.rooms[roomName].mineral = {
              id: mineral.id,
              type: mineral.mineralType,
              density: mineral.density,
              amount: mineral.mineralAmount,
              pos: mineral.pos
            };
          }

          // Populate the controller
          if (!Memory.collective.rooms[roomName].controller) {
            const controller = Game.rooms[roomName].controller;
            Memory.collective.rooms[roomName].controller = {
              id: controller?.id || "",
              owner: controller?.owner?.username || "unowned",
              level: controller?.level || 0,
              safeModeAvailable: controller?.safeModeAvailable || 0,
              powerEnabled: controller?.isPowerEnabled,
              pos: controller?.pos
            };
          }
        }

        // Increment the next ten
        Memory.collective.time.ten = Game.time + 10;
      } else {
        // Run the 1 tick code

      }
    }

    //console.log(`Collective memory: ${JSON.stringify(Memory.collective)}`);
  }
};

export default collective;
