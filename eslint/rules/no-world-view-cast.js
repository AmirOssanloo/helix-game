/**
 * `no-restricted-syntax` entries banning a cast that widens the `Readonly` world view back to
 * the live world outside src/simulation/. The view is a compile-time promise that the
 * presentation and the panel only read; a cast breaks the promise silently and the change is
 * invisible to the input log.
 *
 * The cast is caught by the name of the type it targets: the live world type and the two
 * conventional widening helpers. A cast to anything else is not a world cast.
 *
 * Add them to the `no-restricted-syntax` array of every src/ block outside simulation. A
 * narrower block replaces a wider one's array rather than adding to it.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-public-doors
 */

const MESSAGE =
  "Casting the world view back to the live world lets a view or the panel mutate state outside the command buffer. Read through the `Readonly` view and submit a command to change anything. See docs/adr/0004-all-mutation-enters-as-commands.md.";

const TARGET_TYPES = "/^(World|Mutable|Writable)$/";

export const NO_WORLD_VIEW_CAST = [
  {
    selector: `TSAsExpression > TSTypeReference[typeName.name=${TARGET_TYPES}]`,
    message: MESSAGE,
  },
  {
    selector: `TSTypeAssertion > TSTypeReference[typeName.name=${TARGET_TYPES}]`,
    message: MESSAGE,
  },
];
