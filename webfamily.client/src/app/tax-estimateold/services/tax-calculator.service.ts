import { Injectable } from '@angular/core';

export interface TaxInputs {
  wages: number;
  socialSecurity: number;
  ordinaryDividends: number;
  interest: number;
  shortTermGains: number;
  longTermGains: number;
  iraWithdrawal: number;
  dependentsUnder17: number;
  collegeStudents: number;
  educationExpenses: number;
  isFirstFourYears: boolean;
}

export interface BracketDetail {
  rate: number;
  min: number;
  max: number;
  taxableInBracket: number;
  taxInBracket: number;
  label: string;
}

export interface TaxResult {
  // Income breakdown
  grossIncome: number;
  agi: number;
  standardDeduction: number;
  taxableOrdinaryIncome: number;
  taxableLTCG: number;

  // Federal ordinary tax
  ordinaryTax: number;
  bracketDetails: BracketDetail[];
  currentBracketRate: number;

  // LTCG federal tax
  ltcgTax: number;
  ltcgRate: number;

  // NIIT
  niitBase: number;
  niitTax: number;
  niitApplies: boolean;

  // WA excise
  waExciseBase: number;
  waExciseTax: number;
  waExciseApplies: boolean;

  // Credits
  childTaxCredit: number;
  educationCredit: number;
  educationCreditType: 'AOTC' | 'LLC' | 'none' | 'phased-out';
  educationCreditNote: string;
  totalCredits: number;

  // Totals
  totalFederalTax: number;
  totalTax: number;
  effectiveRate: number;
  effectiveRateAfterCredits: number;
  marginalRate: number;

  // IRA optimizer
  iraRoomToCurrentBracket: number;
  iraRoomToNIIT: number;
  iraRoomToWAExcise: number;
}

// 2025 MFJ Brackets
const ORDINARY_BRACKETS = [
  { rate: 0.10, min: 0,      max: 23850 },
  { rate: 0.12, min: 23850,  max: 96950 },
  { rate: 0.22, min: 96950,  max: 206700 },
  { rate: 0.24, min: 206700, max: 394600 },
  { rate: 0.32, min: 394600, max: 501050 },
  { rate: 0.35, min: 501050, max: 751600 },
  { rate: 0.37, min: 751600, max: Infinity },
];

// 2025 LTCG brackets MFJ (based on taxable income including LTCG)
const LTCG_BRACKETS = [
  { rate: 0.00, min: 0,      max: 96700 },
  { rate: 0.15, min: 96700,  max: 600050 },
  { rate: 0.20, min: 600050, max: Infinity },
];

const STANDARD_DEDUCTION = 31500;
const NIIT_THRESHOLD_MFJ = 250000;
const NIIT_RATE = 0.038;
const WA_STANDARD_DEDUCTION = 278000;
const WA_TIER1_MAX = 1000000;
const WA_TIER1_RATE = 0.07;
const WA_TIER2_RATE = 0.099;
const CHILD_TAX_CREDIT = 2200;
const AOTC_MAX = 2500;
const LLC_MAX = 2000;
const EDUCATION_PHASEOUT_START = 160000;
const EDUCATION_PHASEOUT_END = 180000;

function calcBracketTax(income: number, brackets: typeof ORDINARY_BRACKETS): { tax: number; details: BracketDetail[] } {
  let tax = 0;
  const details: BracketDetail[] = [];
  for (const b of brackets) {
    if (income <= b.min) break;
    const taxable = Math.min(income, b.max) - b.min;
    const t = taxable * b.rate;
    tax += t;
    details.push({
      rate: b.rate,
      min: b.min,
      max: b.max,
      taxableInBracket: taxable,
      taxInBracket: t,
      label: `${(b.rate * 100).toFixed(0)}%`,
    });
  }
  return { tax, details };
}

function phaseOutCredit(credit: number, magi: number, start: number, end: number): number {
  if (magi <= start) return credit;
  if (magi >= end) return 0;
  const ratio = (magi - start) / (end - start);
  return credit * (1 - ratio);
}

@Injectable({ providedIn: 'root' })
export class TaxCalculatorService {

  calculate(inputs: TaxInputs): TaxResult {
    const {
      wages, socialSecurity, ordinaryDividends, interest,
      shortTermGains, longTermGains, iraWithdrawal,
      dependentsUnder17, collegeStudents, educationExpenses, isFirstFourYears,
    } = inputs;

    // --- AGI ---
    const ordinaryIncome = wages + socialSecurity + ordinaryDividends + interest + shortTermGains + iraWithdrawal;
    const grossIncome = ordinaryIncome + longTermGains;
    const agi = grossIncome; // no above-the-line adjustments modeled
    const taxableOrdinaryIncome = Math.max(0, ordinaryIncome - STANDARD_DEDUCTION);
    const taxableLTCG = longTermGains; // LTCG not reduced by standard deduction (stacks on top)

    // Total taxable income for bracket placement
    const totalTaxableIncome = taxableOrdinaryIncome + taxableLTCG;

    // --- Ordinary income tax (applied only to ordinary portion) ---
    const { tax: ordinaryTax, details: bracketDetails } = calcBracketTax(taxableOrdinaryIncome, ORDINARY_BRACKETS);

    // Current bracket
    let currentBracketRate = 0.10;
    for (const b of ORDINARY_BRACKETS) {
      if (taxableOrdinaryIncome > b.min) currentBracketRate = b.rate;
    }

    // --- LTCG tax (stacked on top of ordinary income) ---
    // The LTCG rate is determined by where total taxable income falls in LTCG brackets
    // but only LTCG portion gets the preferential rate
    let ltcgTax = 0;
    let ltcgRate = 0;
    if (taxableLTCG > 0) {
      // LTCG stacks: ordinary income uses the bottom of the bracket space
      const ltcgStart = taxableOrdinaryIncome;
      const ltcgEnd = taxableOrdinaryIncome + taxableLTCG;
      for (const b of LTCG_BRACKETS) {
        if (ltcgEnd <= b.min) break;
        if (ltcgStart >= b.max) continue;
        const effectiveStart = Math.max(ltcgStart, b.min);
        const effectiveEnd = Math.min(ltcgEnd, b.max);
        const taxable = effectiveEnd - effectiveStart;
        ltcgTax += taxable * b.rate;
      }
      // Dominant rate for display
      for (const b of LTCG_BRACKETS) {
        if (totalTaxableIncome > b.min) ltcgRate = b.rate;
      }
    }

    // --- NIIT ---
    const netInvestmentIncome = ordinaryDividends + interest + shortTermGains + longTermGains;
    const magiExcessOverNIIT = Math.max(0, agi - NIIT_THRESHOLD_MFJ);
    const niitBase = Math.min(netInvestmentIncome, magiExcessOverNIIT);
    const niitTax = niitBase * NIIT_RATE;
    const niitApplies = niitTax > 0;

    // --- WA Excise Tax (LTCG only) ---
    const waExciseBase = Math.max(0, longTermGains - WA_STANDARD_DEDUCTION);
    let waExciseTax = 0;
    if (waExciseBase > 0) {
      if (waExciseBase <= WA_TIER1_MAX) {
        waExciseTax = waExciseBase * WA_TIER1_RATE;
      } else {
        waExciseTax = WA_TIER1_MAX * WA_TIER1_RATE + (waExciseBase - WA_TIER1_MAX) * WA_TIER2_RATE;
      }
    }
    const waExciseApplies = waExciseTax > 0;

    // --- Credits ---
    const childTaxCredit = dependentsUnder17 * CHILD_TAX_CREDIT;

    // Education credit
    let educationCredit = 0;
    let educationCreditType: TaxResult['educationCreditType'] = 'none';
    let educationCreditNote = '';

    if (collegeStudents > 0 && educationExpenses > 0) {
      if (agi > EDUCATION_PHASEOUT_END) {
        educationCreditType = 'phased-out';
        educationCreditNote = `MAGI of $${agi.toLocaleString()} exceeds $180,000 phase-out limit. Neither AOTC nor LLC is available.`;
      } else {
        const aotcRaw = isFirstFourYears ? Math.min(educationExpenses, AOTC_MAX) * collegeStudents : 0;
        const llcRaw = Math.min(educationExpenses * 0.20, LLC_MAX);
        const aotcPhased = phaseOutCredit(aotcRaw, agi, EDUCATION_PHASEOUT_START, EDUCATION_PHASEOUT_END);
        const llcPhased = phaseOutCredit(llcRaw, agi, EDUCATION_PHASEOUT_START, EDUCATION_PHASEOUT_END);

        if (isFirstFourYears && aotcPhased >= llcPhased) {
          educationCredit = aotcPhased;
          educationCreditType = 'AOTC';
          educationCreditNote = `AOTC recommended: $${aotcPhased.toFixed(0)} (up to $2,500/student, first 4 years, 40% refundable).`;
        } else if (!isFirstFourYears || llcPhased > aotcPhased) {
          educationCredit = llcPhased;
          educationCreditType = 'LLC';
          educationCreditNote = isFirstFourYears
            ? `LLC recommended: $${llcPhased.toFixed(0)} (higher than AOTC in your situation).`
            : `LLC recommended: $${llcPhased.toFixed(0)} (AOTC limited to first 4 years).`;
        }
        if (agi > EDUCATION_PHASEOUT_START) {
          educationCreditNote += ` (Partially phased out due to MAGI.)`;
        }
      }
    }

    const totalCredits = childTaxCredit + educationCredit;

    // --- Totals ---
    const totalFederalTax = Math.max(0, ordinaryTax + ltcgTax + niitTax - totalCredits);
    const totalTax = totalFederalTax + waExciseTax;
    const effectiveRate = grossIncome > 0 ? (ordinaryTax + ltcgTax + niitTax) / grossIncome : 0;
    const effectiveRateAfterCredits = grossIncome > 0 ? totalTax / grossIncome : 0;
    const marginalRate = currentBracketRate;

    // --- IRA Optimizer ---
    // How much more ordinary income before hitting next bracket
    let nextBracketMin = Infinity;
    for (const b of ORDINARY_BRACKETS) {
      if (b.min > taxableOrdinaryIncome) { nextBracketMin = b.min; break; }
    }
    const iraRoomToCurrentBracket = Math.max(0, nextBracketMin - taxableOrdinaryIncome);

    // How much more AGI before NIIT ($250K)
    const iraRoomToNIIT = Math.max(0, NIIT_THRESHOLD_MFJ - agi);

    // How much more LTCG before WA excise ($278K) — IRA doesn't affect WA excise directly
    // Show remaining room under WA deduction for LTCG
    const iraRoomToWAExcise = Math.max(0, WA_STANDARD_DEDUCTION - longTermGains);

    return {
      grossIncome, agi, standardDeduction: STANDARD_DEDUCTION,
      taxableOrdinaryIncome, taxableLTCG,
      ordinaryTax, bracketDetails, currentBracketRate,
      ltcgTax, ltcgRate,
      niitBase, niitTax, niitApplies,
      waExciseBase, waExciseTax, waExciseApplies,
      childTaxCredit, educationCredit, educationCreditType,
      educationCreditNote, totalCredits,
      totalFederalTax, totalTax,
      effectiveRate, effectiveRateAfterCredits, marginalRate,
      iraRoomToCurrentBracket, iraRoomToNIIT, iraRoomToWAExcise,
    };
  }
}
