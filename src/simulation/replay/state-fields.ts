import type { World } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import { excluded, fieldsOf, number, record } from "./field-list";
import { MAP_FIELDS } from "./map-fields";
import { RUN_FIELDS } from "./run-fields";

/**
 * The whole of world state a tick decides, in the canonical sequence the checksum hashes and
 * the comparison walks. A pool's capacity is fixed, its live count and its misses follow from
 * its slots or are the instrumentation's, and the order of its free list is not readable
 * through its view: a difference there shows as a different slot at the next acquire.
 */
export const WORLD_FIELDS = fieldsOf<DeepReadonly<World>>({
  tick: number("tick", (world, into, at) => {
    into[at] = world.tick;
  }),
  run: record("run", (world) => world.run, RUN_FIELDS),
  map: record("map", (world) => world.map, MAP_FIELDS),
  commands: excluded(
    "the tick's input, which the log holds; consumed and forgotten within the tick",
  ),
  events: excluded(
    "announcements the presentation reads; what they announce is hashed where it lives",
  ),
  scratch: excluded(
    "the rules' working memory, dead at the end of every tick: nothing in it is read on a later one",
  ),
});
