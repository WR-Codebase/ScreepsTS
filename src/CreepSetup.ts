/**
 * CreepSetup.ts
 *
 * Shamelessly borrowed from Overmind
 * https://github.com/bencbartlett/Overmind
 */

export interface BodyGeneratorReturn {
  body: BodyPartConstant[];
}

export interface BodySetup {
  /** body pattern to be repeated */
  pattern: BodyPartConstant[];
  /** maximum number of unit repetitions to make body */
  sizeLimit: number;
  /** stuff at beginning of body */
  prefix: BodyPartConstant[];
  /** stuff at end of body */
  suffix: BodyPartConstant[];
  /** (?) prefix/suffix scale with body size */
  proportionalPrefixSuffix: boolean;
  /** (?) assemble as WORK WORK MOVE MOVE instead of WORK MOVE WORK MOVE */
  ordered: boolean;
}

/* Return the cost of an entire array of body parts */
export function bodyCost(bodyparts: BodyPartConstant[]): number {
  return _.sum(bodyparts, (part) => BODYPART_COST[part]);
}

export function patternCost(setup: CreepSetup): number {
  return bodyCost(setup.bodySetup.pattern);
}

/**
 * The CreepSetup class contains methods for flexibly generating creep body arrays when needed for spawning
 */
export class CreepSetup {
  role: string;
  bodySetup: BodySetup;
  private cache: {
    [colonyName: string]: {
      result: BodyGeneratorReturn;
      expiration: number;
    };
  };

  constructor(
    roleName: string,
    bodySetup: Partial<BodySetup> = {}
  ) {
    this.role = roleName;
    // Defaults for a creep setup
    _.defaults(bodySetup, {
      pattern: [],
      sizeLimit: Infinity,
      prefix: [],
      suffix: [],
      proportionalPrefixSuffix: false,
      ordered: true
    });
    this.bodySetup = bodySetup as BodySetup;
    this.cache = {};
  }

  /**
   * Returns a new CreepSetup instance which is a copy of the existing setup but with boosts applied. This allows
   * you to easily make boosted versions of the default setups in setups.ts without modifying the original objects.
   */
  static boosted(setup: CreepSetup) {
    return new CreepSetup(setup.role, setup.bodySetup);
  }

  /**
   * Generate the body and best boosts for a requested creep
   */
  create(thisRoom: Room, useCache = false): BodyGeneratorReturn {
    // If you're allowed to use a cached result (e.g. for estimating wait times), return that
    const energyStructures: (StructureSpawn | StructureExtension)[] = thisRoom.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION }) as (StructureSpawn | StructureExtension)[];
    // Otherwise recompute
    const availableEnergy: number = _.sum(energyStructures ?? [], (s) => s.store.getUsedCapacity(RESOURCE_ENERGY)) ?? 0;
    const body = this.generateBody(availableEnergy);
    const bodyCounts = _.countBy(body);

    const boosts: MineralBoostConstant[] = [];

    const result = {
      body: body
    };
    this.cache[thisRoom.name] = {
      result: result,
      expiration: Game.time + 20
    };

    return result;
  }

  /**
   * Generate the largest body of a given pattern that can be made from a room, subject to limitations from maxRepeats
   */
  generateBody(availableEnergy: number): BodyPartConstant[] {
    let patternCost, patternLength, numRepeats: number;
    const prefix = this.bodySetup.prefix;
    const suffix = this.bodySetup.suffix;
    let body: BodyPartConstant[] = [];
    // calculate repetitions
    if (this.bodySetup.proportionalPrefixSuffix) {
      // if prefix and suffix are to be kept proportional to body size
      patternCost =
        bodyCost(prefix) +
        bodyCost(this.bodySetup.pattern) +
        bodyCost(suffix);
      patternLength =
        prefix.length + this.bodySetup.pattern.length + suffix.length;
      const energyLimit = Math.floor(availableEnergy / patternCost); // max number of repeats room can produce
      const maxPartLimit = Math.floor(MAX_CREEP_SIZE / patternLength); // max repetitions resulting in <50 parts
      numRepeats = Math.min(
        energyLimit,
        maxPartLimit,
        this.bodySetup.sizeLimit
      );
    } else {
      // if prefix and suffix don't scale
      const extraCost = bodyCost(prefix) + bodyCost(suffix);
      patternCost = bodyCost(this.bodySetup.pattern);
      patternLength = this.bodySetup.pattern.length;
      const energyLimit = Math.floor(
        (availableEnergy - extraCost) / patternCost
      );
      const maxPartLimit = Math.floor(
        (MAX_CREEP_SIZE - prefix.length - suffix.length) / patternLength
      );
      numRepeats = Math.min(
        energyLimit,
        maxPartLimit,
        this.bodySetup.sizeLimit
      );
    }
    // build the body
    if (this.bodySetup.proportionalPrefixSuffix) {
      // add the prefix
      for (let i = 0; i < numRepeats; i++) {
        body = body.concat(prefix);
      }
    } else {
      body = body.concat(prefix);
    }

    if (this.bodySetup.ordered) {
      // repeated body pattern
      for (const part of this.bodySetup.pattern) {
        for (let i = 0; i < numRepeats; i++) {
          body.push(part);
        }
      }
    } else {
      for (let i = 0; i < numRepeats; i++) {
        body = body.concat(this.bodySetup.pattern);
      }
    }

    if (this.bodySetup.proportionalPrefixSuffix) {
      // add the suffix
      for (let i = 0; i < numRepeats; i++) {
        body = body.concat(suffix);
      }
    } else {
      body = body.concat(suffix);
    }
    // return it
    return body;
  }

  generateMaxedBody() {
    // TODO hardcoded for our current cap with extensions missing
    return this.generateBody(11100);
  }

  /**
   * Returns the number of parts that a body will have if made from a given colony
   */
  getBodyPotential(partType: BodyPartConstant, thisRoom: Room): number {
    // If you're allowed to use a cached result (e.g. for estimating wait times), return that
    const energyStructures: (StructureSpawn | StructureExtension)[] = thisRoom.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION }) as (StructureSpawn | StructureExtension)[];
    // Otherwise recompute
    // Get max capacity of energyStructures
    let energyCapacity = _.sum(energyStructures ?? [], (s) => s.store.getCapacity(RESOURCE_ENERGY)) ?? 0;
    const body = this.generateBody(energyCapacity);
    return _.filter(body, (part: BodyPartConstant) => part == partType)
      .length;
  }
}
