import { join } from "node:path";
import { PRESENTATION_FIELDS } from "@simulation/testing";
import { doorsOpenTo, LAYER_IMPORTS } from "../eslint/matrix.js";
import {
  describeGameConfig,
  describeLayerDoors,
  describeLayerImports,
  describeNoModuleState,
  describeNoSpecUnderSrc,
  describeOrderWritesOnlyInOrders,
  describePresentationFieldsUnread,
  describeTypesOnlyDoor,
  SOURCE_DIR,
} from "./helpers";

describeLayerImports({ srcDir: SOURCE_DIR, layerImports: LAYER_IMPORTS });

describeLayerDoors({
  srcDir: SOURCE_DIR,
  layerImports: LAYER_IMPORTS,
  doorsOpenTo,
});

describeTypesOnlyDoor({ file: join(SOURCE_DIR, "domain", "public.ts") });

describeNoSpecUnderSrc({ srcDir: SOURCE_DIR });

describeNoModuleState({
  srcDir: SOURCE_DIR,
  folders: ["domain", "simulation"],
});

describeOrderWritesOnlyInOrders({
  srcDir: SOURCE_DIR,
  ownerDir: "domain/orders",
});

describeGameConfig({
  configFile: join(SOURCE_DIR, "app", "game-config.ts"),
  absentUntilCreated: false,
});

describePresentationFieldsUnread({
  srcDir: SOURCE_DIR,
  fields: PRESENTATION_FIELDS,
  copiedInto: ["frame", "tint"],
  checkedIn: {
    "src/domain/definitions/effect-checks.ts":
      "checks each frame a definition names is one the atlas has",
    "src/domain/definitions/kinds/form.kind.ts":
      "checks each frame a definition names is one the atlas has",
    "src/domain/definitions/kinds/hero.kind.ts":
      "checks each frame a definition names is one the atlas has",
    "src/domain/definitions/kinds/item-base.kind.ts":
      "checks each frame a definition names is one the atlas has",
    "src/domain/definitions/kinds/status.kind.ts":
      "checks each frame a definition names is one the atlas has",
    "src/domain/definitions/unit-checks.ts":
      "checks each frame a definition names is one the atlas has",
  },
});
