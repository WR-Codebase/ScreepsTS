import courier from "courier";
import harvester from "harvester";
import hauler from "hauler";
import nurse from "nurse";
import repairer from "repairer";
import scout from "scout";
import worker from "worker";
import pillager from "pillager";

const creepHandler = {
  roles: {
    "courier": courier,
    "harvester": harvester,
    "hauler": hauler,
    "nurse": nurse,
    "repairer": repairer,
    "scout": scout,
    "worker": worker,
    "pillager": pillager
  },
  costs: {
    work: 100,
    carry: 50,
    move: 50,
    attack: 80,
    ranged_attack: 150,
    heal: 250,
    claim: 600,
    tough: 10
  },
  spawn: function(spawnName: string, roleName: string) {
    // Minimums
    const minimums = {
      nurse: 2,
      worker: 4,
      courier: 1,
      repairer: 1,
      pillager: 4
    }
    const roleCount = {
      nurse: 0,
      worker: 0,
      courier: 0,
      repairer: 0,
      pillager: 0
    };

    // For each creep, look up its role and add it to the count for that role
    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      const roleName = creep.memory.role as string;
      if (roleCount.hasOwnProperty(roleName)) {
        // @ts-ignore
        roleCount[roleName]++;
      } else {
        // @ts-ignore
        roleCount[roleName] = 1;
      }
    }

    // If the role count is less than the minimum, spawn a new creep
    for (const roleName in minimums) {
      // @ts-ignore
      if (roleCount[roleName] < minimums[roleName]) {
        console.log(`Begin spawning ${roleName} at ${spawnName} CPU: ${Game.cpu.getUsed()}`);
        // If cpu > 18 return
        //if (Game.cpu.getUsed() > 20) return;
        const spawn = Game.spawns[spawnName];
        console.log(`Found spawn: ${spawn} CPU: ${Game.cpu.getUsed()}`);
        // @ts-ignore
        const thisRole = this.roles[roleName];
        const template = JSON.parse(JSON.stringify(thisRole.template));


        // Get the cost of the parts
        console.log(`Template: ${JSON.stringify(thisRole.template)} CPU: ${Game.cpu.getUsed()}`);
        const prefixCost = (template.prefix.length>0)?template.prefix.reduce((acc: number, part: BodyPartConstant) => acc + this.costs[part], 0):0;
        const suffixCost = (template.suffix.length>0)?template.suffix.reduce((acc: number, part: BodyPartConstant) => acc + this.costs[part], 0):0;
        const patternCost = (template.pattern.length>0)?template.pattern.reduce((acc: number, part: BodyPartConstant) => acc + this.costs[part], 0):0;

        console.log(`Costs: prefix: ${prefixCost}, suffix: ${suffixCost}, pattern: ${patternCost} CPU: ${Game.cpu.getUsed()}`);
        // get the available energy for the spawn
        let energyAvailable = spawn.room.energyCapacityAvailable;
        if (energyAvailable <= 0) {
          console.log(`No energy available for ${roleName} CPU: ${Game.cpu.getUsed()}`);
          return;
        }
        if (energyAvailable < prefixCost + suffixCost + patternCost) {
          console.log(`Not enough energy available for ${roleName} CPU: ${Game.cpu.getUsed()}`);
          return;
        }

        energyAvailable -= prefixCost + suffixCost;
        const bodyPlan = template.prefix as BodyPartConstant[];

        console.log(`Buidling body plan with energy available: ${energyAvailable} CPU: ${Game.cpu.getUsed()}`);

        let limit = 10;
        let j = 0;
        // While energyAvailable > suffixCost, push the pattern to the bodyPlan and subtract the cost of the pattern from energyAvailable
        for (let i = energyAvailable; i > patternCost; i -= patternCost) {
          console.log(`Energy available: ${energyAvailable} CPU: ${Game.cpu.getUsed()}`);
          if (Game.cpu.getUsed() > 18) { console.log(`CPU used: ${Game.cpu.getUsed()}`); return; }
          bodyPlan.push(...template.pattern);
          j++;
          if (j > limit) {
            console.log(`Limit reached: ${j} CPU: ${Game.cpu.getUsed()}`);
            break;
          }
        }
        bodyPlan.push(...template.suffix);

        console.log(`Spawning ${roleName} with body plan: ${bodyPlan} CPU: ${Game.cpu.getUsed()} `);
        spawn.spawnCreep(bodyPlan, `${roleName}_${spawn.room.name}_${Game.time}`, {
          memory: {
            role: roleName,
            room: spawn.room.name,
            working: false,
            status: "",
            energyPriority: []
          }
        });
      }
    }

    console.log(`Ending spawn with CPU: ${Game.cpu.getUsed()}`);
  },
  run() {
    // Generate body plans for each role
    for (const name in Game.creeps) {
      // Get the used CPU before running the creep, return if it's > 18
      const cpuUsed = Game.cpu.getUsed();
      if (cpuUsed > 18) {
        console.log(`CPU used: ${cpuUsed}`);
        return;
      }
      const creep = Game.creeps[name];
      if (creep.memory.role === "worker") {
        worker.run(creep);
      } else if (creep.memory.role === "nurse") {
        nurse.run(creep);
      } else if (creep.memory.role === "harvester") {
        harvester.run(creep);
      } else if (creep.memory.role === "repairer") {
        repairer.run(creep);
      } else if (creep.memory.role === "courier") {
        courier.run(creep);
      } else if (creep.memory.role === "hauler") {
        hauler.run(creep);
      } else if (creep.memory.role === "scout") {
        scout.run(creep);
      } else if (creep.memory.role === "pillager") {
        pillager.run(creep);
      }
    }
  }
};

export default creepHandler;
