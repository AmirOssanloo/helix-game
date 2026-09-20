import { mountPanel } from "@devtools/public";
import type { Boot } from "./public";

const DEVTOOLS_HOST_ID = "devtools";

export const boot: Boot = (): void => {
  if (__DEV__) {
    const host = document.getElementById(DEVTOOLS_HOST_ID);

    if (host === null) {
      throw new Error(
        `index.html has no element with id "${DEVTOOLS_HOST_ID}" to mount the developer panel into`,
      );
    }

    mountPanel(host);
  }
};

boot();
