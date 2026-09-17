// Consolidated: this used to duplicate app/rpm/interfaces/rpm.interface.ts
// (unused - no file in the project imported from here). Re-exporting from
// the single source of truth instead of maintaining two copies that can
// drift out of sync, as they already had (this file was still on the old
// string `duration` field and had no trackNumber/artist).
export * from '../rpm/interfaces/rpm.interface';
