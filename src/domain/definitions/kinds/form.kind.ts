import { KIT_KEYS } from "../../kits/kit-registry";
import {
  attributesSchema,
  bodySchema,
  conversionsSchema,
  statsSchema,
} from "../common-schemas";
import type { ListKind } from "../definition-kind";
import type { FormDef } from "../form-def";
import { formInSimulationUnits } from "../form-state";
import { checkFrame, checkReferences } from "../registry-checks";
import { arrayOf, idSchema, objectOf, stringSchema } from "../schema";

/**
 * Every form; the hero definition says which of them it takes and in what order. A form's
 * frame is in the list, its kit key resolves, and every spell it lists exists. A retune
 * rebuilds the form's record in simulation units.
 */
export const formKind: ListKind<"forms", FormDef, "form"> = {
  field: "forms",
  shape: "list",
  folder: "forms",
  namespace: "a form",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: () =>
    objectOf<FormDef>({
      id: idSchema,
      body: bodySchema,
      attributes: attributesSchema,
      attributeGains: attributesSchema,
      conversions: conversionsSchema,
      baseStats: statsSchema,
      abilities: arrayOf(idSchema),
      kit: idSchema,
      atlasFrame: stringSchema,
    }),
  check: (context, file, def): void => {
    checkFrame(context, file, "atlasFrame", def.atlasFrame);

    if (!KIT_KEYS.includes(def.kit)) {
      context.faults.push({
        file,
        path: "kit",
        message: `"${def.kit}" resolves to no kit; the registry holds ${KIT_KEYS.join(", ")}`,
      });
    }

    checkReferences(
      context,
      file,
      "abilities",
      def.abilities,
      context.space("spell or ability", ["spells", "abilities"]),
    );
  },
  tuning: {
    kind: "form",
    title: "Forms",
    rebuild: (run, id, def, simHz): void => {
      for (const form of run.forms) {
        if (form.def.id === id) {
          form.def = formInSimulationUnits(def, simHz);
        }
      }
    },
  },
};
