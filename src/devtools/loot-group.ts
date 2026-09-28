import type { FolderApi } from "tweakpane";
import type { EnemyTier } from "@domain/public";
import { createDropRoll, ENEMY_TIERS } from "@domain/queries";
import { firstOf, optionsOf, readout } from "./bindings";
import type { DevApi } from "./dev-api";
import { previewLoot, previewText } from "./loot-preview";
import type { PanelGroup } from "./panel-group";

/** What the fields start at: a level every base reaches, a purse worth shopping with, and enough rolls to read a table's spread. */
const ITEM_LEVEL = 1;
const GOLD_AMOUNT = 1000;
const PREVIEW_COUNT = 10000;
const WHOLE_STEP = 1;

/** Lines the preview's text has room for: one per count it shows. */
const PREVIEW_ROWS = 6;

/** What the preview line shows before the first preview. */
const NO_PREVIEW = "none yet";

/**
 * The loot group: grant an item, grant gold, and preview a loot table. **Grant item** names a
 * base or a Legendary piece, read from run scope so a new one appears without a code change, a
 * rarity from the run's table, and an item level, as one `grant_item` command; a piece is
 * granted only as Legendary and a base only as anything else, and the world refuses the rest.
 * **Grant gold** is one `grant_gold` command. **Preview loot table** rolls what the chosen
 * number of enemies of the chosen tier would drop on this tick at the map's level, through the
 * one roll a death makes, into one drop record made here, and shows the counts; it reads the
 * view and sends no command.
 */
export const lootGroup = (folder: FolderApi, api: DevApi): PanelGroup => {
  const run = api.view.run;
  const itemIds = [
    ...run.itemBases.map((base): string => base.id),
    ...run.legendaries.map((piece): string => piece.id),
  ];
  const rarityIds = run.rarities.map((rarity): string => rarity.id);
  const fields = {
    itemId: firstOf(itemIds),
    rarity: firstOf(rarityIds),
    itemLevel: ITEM_LEVEL,
    gold: GOLD_AMOUNT,
    tier: "boss" as EnemyTier,
    count: PREVIEW_COUNT,
    preview: NO_PREVIEW,
  };
  const out = createDropRoll();

  folder.addBinding(fields, "itemId", {
    label: "Item",
    options: optionsOf(itemIds),
  });
  folder.addBinding(fields, "rarity", {
    label: "Rarity",
    options: optionsOf(rarityIds),
  });
  folder.addBinding(fields, "itemLevel", {
    label: "Item level",
    step: WHOLE_STEP,
  });
  folder.addButton({ title: "Grant item" }).on("click", (): void => {
    api.submit({
      itemId: fields.itemId,
      itemLevel: fields.itemLevel,
      kind: "grant_item",
      rarity: fields.rarity,
    });
  });

  folder.addBinding(fields, "gold", { label: "Gold amount", step: WHOLE_STEP });
  folder.addButton({ title: "Grant gold" }).on("click", (): void => {
    api.submit({ amount: fields.gold, kind: "grant_gold" });
  });

  const gold = readout(folder, "Gold");

  folder.addBinding(fields, "tier", {
    label: "Preview tier",
    options: optionsOf(ENEMY_TIERS),
  });
  folder.addBinding(fields, "count", { label: "Rolls", step: WHOLE_STEP });

  const previewLine = folder.addBinding(fields, "preview", {
    interval: 0,
    label: "Preview",
    multiline: true,
    readonly: true,
    rows: PREVIEW_ROWS,
  });

  folder.addButton({ title: "Preview loot table" }).on("click", (): void => {
    const count = Math.max(0, Math.floor(fields.count));

    fields.preview = previewText(
      api.view,
      previewLoot(api.view, fields.tier, count, out),
    );
    previewLine.refresh();
  });

  return {
    refresh: (): void => {
      gold.show(String(api.view.run.gold));
    },
  };
};
