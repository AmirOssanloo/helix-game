import type { FormDef } from "@domain/public";
import { skeinDef } from "./skein.def";

/** Every form, in the order the content tier validates them. A form not listed here does not exist. */
export const forms = [skeinDef] as const satisfies readonly FormDef[];
