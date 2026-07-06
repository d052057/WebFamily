//export * from './triggers';
//export {
//  setTheme,
//  getBsVer,
//  currentBsVersion,
//  IBsVersion,
//  BsVerions,
//  AvailableBsVersions
//} from './theme-provider';

//export {
//  listenToTriggersV2,
//  registerOutsideClick,
//  registerEscClick
//} from './triggers';

//export { Trigger } from './trigger.class';
//export { Utils } from './utils.class';
//export { window, document } from './facade/browser';
export * from './triggers';

export type { IBsVersion, AvailableBsVersions } from './theme-provider';
export { setTheme, getBsVer, currentBsVersion, BsVerions } from './theme-provider';

export {
  listenToTriggersV2,
  registerOutsideClick,
  registerEscClick
} from './triggers';

export { Trigger } from './trigger.class';
export { Utils } from './utils.class';
export { window, document } from './facade/browser';
