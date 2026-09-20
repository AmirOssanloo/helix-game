/**
 * A string only developer-panel code carries into a bundle. The production build searches its
 * output for it and fails when found, so a panel mounted outside the development branch is caught.
 */
export const DEVTOOLS_SENTINEL = 'helix-devtools-sentinel';
