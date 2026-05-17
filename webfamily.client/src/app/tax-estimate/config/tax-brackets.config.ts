// ─────────────────────────────────────────────────────────────────────────────
// tax-brackets.config.ts
//
// Single source of truth for all year-specific tax constants.
// To update when IRS releases official numbers:
//   1. Update the brackets/thresholds for the relevant year
//   2. Set isEstimated: false
//   3. Update the note to 'Official IRS figures'
// ─────────────────────────────────────────────────────────────────────────────

export interface OrdinaryBracket {
  ceiling: number;   // upper bound of bracket (Infinity for top bracket)
  rate: number;      // decimal rate e.g. 0.10
}

export interface LtcgBracket {
  ceiling: number;
  rate: number;
}

export interface TaxYearConfig {
  year: number;
  isEstimated: boolean;
  note: string;

  // Federal
  standardDeductionMFJ: number;
  ordinaryBrackets: OrdinaryBracket[];   // MFJ ordinary income brackets
  ltcgBrackets: LtcgBracket[];           // MFJ LTCG brackets
  niitThresholdMFJ: number;              // NIIT MAGI threshold MFJ (fixed by statute)

  // AOTC / LLC phaseout MFJ
  aotcPhaseoutStart: number;
  aotcPhaseoutEnd: number;

  // IRMAA MFJ surcharge start
  irmaaThresholdMFJ: number;

  // Washington State
  waExemption: number;                   // WA LTCG excise exemption
  waExciseRate: number;                  // WA excise rate (7% fixed by statute)
}

// ─────────────────────────────────────────────────────────────────────────────
// Year Configurations
// ─────────────────────────────────────────────────────────────────────────────
export const TAX_YEAR_CONFIGS: Record<number, TaxYearConfig> = {

  2025: {
    year: 2025,
    isEstimated: false,
    note: 'Official IRS 2025 figures (Rev. Proc. 2024-40)',

    standardDeductionMFJ: 30_000,
    ordinaryBrackets: [
      { ceiling: 23_850,   rate: 0.10 },
      { ceiling: 96_950,   rate: 0.12 },
      { ceiling: 206_700,  rate: 0.22 },
      { ceiling: 394_600,  rate: 0.24 },
      { ceiling: 501_050,  rate: 0.32 },
      { ceiling: 751_600,  rate: 0.35 },
      { ceiling: Infinity, rate: 0.37 },
    ],
    ltcgBrackets: [
      { ceiling: 96_700,   rate: 0.00 },
      { ceiling: 600_050,  rate: 0.15 },
      { ceiling: Infinity, rate: 0.20 },
    ],
    niitThresholdMFJ: 250_000,
    aotcPhaseoutStart: 160_000,
    aotcPhaseoutEnd:   180_000,
    irmaaThresholdMFJ: 212_000,
    waExemption: 270_000,
    waExciseRate: 0.07,
  },

  2026: {
    year: 2026,
    isEstimated: true,
    note: 'Estimated — based on 2025 IRS figures with ~2.5% inflation adjustment. Update when IRS releases official 2026 figures (expected Oct/Nov 2025).',

    standardDeductionMFJ: 30_800,        // ~2.5% inflation adj from $30,000
    ordinaryBrackets: [
      { ceiling: 24_450,   rate: 0.10 }, // ~2.5% adj
      { ceiling: 99_350,   rate: 0.12 },
      { ceiling: 211_900,  rate: 0.22 },
      { ceiling: 404_450,  rate: 0.24 },
      { ceiling: 513_600,  rate: 0.32 },
      { ceiling: 770_400,  rate: 0.35 },
      { ceiling: Infinity, rate: 0.37 },
    ],
    ltcgBrackets: [
      { ceiling: 99_100,   rate: 0.00 },
      { ceiling: 615_050,  rate: 0.15 },
      { ceiling: Infinity, rate: 0.20 },
    ],
    niitThresholdMFJ: 250_000,           // Fixed by statute — does not inflate
    aotcPhaseoutStart: 160_000,          // Fixed by statute — does not inflate
    aotcPhaseoutEnd:   180_000,          // Fixed by statute — does not inflate
    irmaaThresholdMFJ: 220_000,          // ~2.5% adj estimate
    waExemption: 270_000,                // Fixed by WA statute — confirm annually
    waExciseRate: 0.07,
  },

  2027: {
    year: 2027,
    isEstimated: true,
    note: 'Estimated — projected from 2026 estimates with ~2.5% inflation adjustment. Replace with official IRS figures when released.',

    standardDeductionMFJ: 31_600,
    ordinaryBrackets: [
      { ceiling: 25_050,   rate: 0.10 },
      { ceiling: 101_800,  rate: 0.12 },
      { ceiling: 217_200,  rate: 0.22 },
      { ceiling: 414_600,  rate: 0.24 },
      { ceiling: 526_400,  rate: 0.32 },
      { ceiling: 789_900,  rate: 0.35 },
      { ceiling: Infinity, rate: 0.37 },
    ],
    ltcgBrackets: [
      { ceiling: 101_600,  rate: 0.00 },
      { ceiling: 630_400,  rate: 0.15 },
      { ceiling: Infinity, rate: 0.20 },
    ],
    niitThresholdMFJ: 250_000,
    aotcPhaseoutStart: 160_000,
    aotcPhaseoutEnd:   180_000,
    irmaaThresholdMFJ: 228_000,
    waExemption: 270_000,
    waExciseRate: 0.07,
  },

};

export const AVAILABLE_TAX_YEARS = Object.keys(TAX_YEAR_CONFIGS)
  .map(Number)
  .sort((a, b) => b - a); // descending: 2027, 2026, 2025

export const DEFAULT_TAX_YEAR = 2026;
