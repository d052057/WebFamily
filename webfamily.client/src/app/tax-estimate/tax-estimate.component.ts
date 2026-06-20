import {
  Component,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxDataService } from './services/tax-data.service';
import { TaxEstimateModel } from '../models/tax-estimate.model';
import {
  TAX_YEAR_CONFIGS,
  AVAILABLE_TAX_YEARS,
  DEFAULT_TAX_YEAR,
  TaxYearConfig
} from './config/tax-brackets.config';

@Component({
  selector: 'app-tax-estimate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tax-estimate.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./tax-estimate.component.scss']
})
export class TaxEstimateComponent {
  private taxService = inject(TaxDataService);

  // ── Constants (not year-dependent) ────────────────────────────────────────
  readonly niitValue = 0.038;   // 3.8% — fixed by statute
  readonly availableYears = AVAILABLE_TAX_YEARS;

  // ── Selected Tax Year Signal ───────────────────────────────────────────────
  selectedYear = signal<number>(DEFAULT_TAX_YEAR);

  // ── Derived: current year config ──────────────────────────────────────────
  yearConfig = computed<TaxYearConfig>(() => TAX_YEAR_CONFIGS[this.selectedYear()]);

  // ── Income Data Signal ────────────────────────────────────────────────────
  // socialSecurityBenefits is line 6a on 1040, but we calculate taxability in the component based on provisional income, so we store the raw amount here and compute taxable portion separately.
  taxData = signal<TaxEstimateModel>({
    line1_wages: 0,
    line2b_taxable_interest: 0,
    line3b_ordinary_dividends: 0,
    line7_capital_gain: 0,
    line4b_taxable_ira: 0,
    shortTermCapitalGain: 0,
    longTermCapitalGain: 0,
    socialSecurityBenefits: 0,
    educationExpenses: 0,
    educationCredit: 'AOTC',
    federalWithheld: 0,
    estimatedPayments: 0,
    filingStatus: 'MFJ',
    dependents: 1
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.taxService.loadTaxData().subscribe(data => {
      this.taxData.set({
        ...data,
        shortTermCapitalGain: 0,
        longTermCapitalGain: data.line7_capital_gain,
        socialSecurityBenefits: data.socialSecurityBenefits ?? 0,
        educationExpenses: data.educationExpenses ?? 0,
        educationCredit: data.educationCredit ?? 'AOTC',
        federalWithheld: data.federalWithheld ?? 0,
        estimatedPayments: data.estimatedPayments ?? 0,
      });
    });
  }

  onYearChange(year: number): void {
    this.selectedYear.set(Number(year));
  }

  updateField<K extends keyof TaxEstimateModel>(key: K, value: TaxEstimateModel[K]): void {
    this.taxData.update(current => ({
      ...current,
      [key]: typeof value === 'number' ? Number(value) : value
    }));
  }

  // ── Social Security Taxability ─────────────────────────────────────────────
  // Provisional income = non-SS MAGI + 50% of SS benefits
  // MFJ: $32K (50% taxable), $44K (85% taxable) — fixed by statute, no inflation adj
  taxableSocialSecurity = computed(() => {
    const data = this.taxData();
    const ss = data.socialSecurityBenefits ?? 0;
    if (ss === 0) return 0;

    const magiExSS =
      data.line1_wages +
      data.line2b_taxable_interest +
      data.line3b_ordinary_dividends +
      data.line4b_taxable_ira +
      (data.shortTermCapitalGain ?? 0) +
      (data.longTermCapitalGain ?? 0);

    const provisional = magiExSS + ss * 0.5;

    if (provisional >= 44_000) return Math.min(ss * 0.85, ss);
    if (provisional >= 32_000) return Math.min(ss * 0.50, ss);
    return 0;
  });

  // ── Ordinary Income (includes taxable SS, excludes LTCG) ──────────────────
  ordinaryIncome = computed(() => {
    const data = this.taxData();
    return (
      data.line1_wages +
      data.line2b_taxable_interest +
      data.line3b_ordinary_dividends +
      data.line4b_taxable_ira +
      (data.shortTermCapitalGain ?? 0) +
      this.taxableSocialSecurity()
    );
  });

  totalCapitalGain = computed(() => this.taxData().longTermCapitalGain ?? 0);

  // ── MAGI ──────────────────────────────────────────────────────────────────
  magi = computed(() => this.ordinaryIncome() + this.totalCapitalGain());

  // ── Taxable Income (after standard deduction) ──────────────────────────────
  taxableIncome = computed(() => {
    return Math.max(this.magi() - this.yearConfig().standardDeductionMFJ, 0);
  });

  // ── Ordinary Taxable Income (excludes LTCG — used for bracket table & ordinary tax calc) ──
  // Correct approach: standard deduction is applied to total taxable income.
  // The deduction is allocated first against ordinary income, then LTCG.
  // So ordinary taxable = taxableIncome (after deduction) - LTCG, but floored at 0.
  // Equivalently: ordinaryIncome - max(standardDeduction - LTCG, 0), floored at 0.
  // Using taxableIncome - LTCG is correct ONLY when ordinaryIncome >= standardDeduction.
  // We use the IRS-correct stacking: deduction comes off ordinary first.
  ordinaryTaxableIncome = computed(() => {
    const cfg = this.yearConfig();
    const ordIncome = this.ordinaryIncome();
    // Standard deduction offsets ordinary income first
    const ordAfterDeduction = Math.max(ordIncome - cfg.standardDeductionMFJ, 0);
    // Any unused deduction spills into LTCG (handled in taxableIncome already)
    return ordAfterDeduction;
  });

  // ── Bracket Breakdown rows for display table ───────────────────────────────
  bracketBreakdown = computed(() => {
    const income = this.ordinaryTaxableIncome();
    const brackets = this.yearConfig().ordinaryBrackets;
    let prev = 0;

    return brackets.map(b => {
      const floor = prev;
      const ceiling = b.ceiling;
      const taxableAmount = Math.max(Math.min(income, ceiling) - floor, 0);
      const taxAmount = taxableAmount * b.rate;
      const isFilled = income > ceiling;
      const isActive = income > floor && income <= ceiling;
      const rateLabel = `${(b.rate * 100).toFixed(0)}%`;
      const rangeStr = ceiling === Infinity
        ? `$${floor.toLocaleString()}+`
        : `$${floor.toLocaleString()} – $${ceiling.toLocaleString()}`;
      prev = ceiling;
      return { name: rateLabel, rate: rateLabel, range: rangeStr, taxableAmount, taxAmount, isFilled, isActive };
    });
  });

  // ── Ordinary Income Tax (progressive brackets) ─────────────────────────────
  ordinaryIncomeTax = computed(() => {
    return this.calcProgressiveTax(this.ordinaryTaxableIncome(), this.yearConfig().ordinaryBrackets);
  });

  // ── LTCG Tax (stacked on top of ordinary taxable income for bracket determination) ──
  // IRS stacking rule: LTCG sits on top of ordinary income.
  // Any unused standard deduction from ordinary income spills into LTCG first.
  ltcgTax = computed(() => {
    const ltcg = this.totalCapitalGain();
    if (ltcg === 0) return 0;
    const cfg = this.yearConfig();
    const ordinaryTaxable = this.ordinaryTaxableIncome();
    // Unused standard deduction (if ordinary income < std deduction) reduces LTCG
    const unusedDeduction = Math.max(cfg.standardDeductionMFJ - this.ordinaryIncome(), 0);
    const ltcgTaxable = Math.max(ltcg - unusedDeduction, 0);
    // LTCG is stacked on top of ordinary for bracket rate determination
    const taxOnTotal = this.calcProgressiveTax(ordinaryTaxable + ltcgTaxable, cfg.ltcgBrackets);
    const taxOnOrdinary = this.calcProgressiveTax(ordinaryTaxable, cfg.ltcgBrackets);
    return taxOnTotal - taxOnOrdinary;
  });

  capitalGainRate = computed(() => {
    const cfg = this.yearConfig();
    const ordinaryTaxable = this.ordinaryTaxableIncome();
    const unusedDeduction = Math.max(cfg.standardDeductionMFJ - this.ordinaryIncome(), 0);
    const ltcgTaxable = Math.max(this.totalCapitalGain() - unusedDeduction, 0);
    const stackedIncome = ordinaryTaxable + ltcgTaxable;
    if (stackedIncome <= cfg.ltcgBrackets[0].ceiling) return '0%';
    if (stackedIncome <= cfg.ltcgBrackets[1].ceiling) return '15%';
    return '20%';
  });

  // ── NIIT ──────────────────────────────────────────────────────────────────
  niitExposure = computed(() => {
    return Math.max(this.magi() - this.yearConfig().niitThresholdMFJ, 0);
  });

  niitTax = computed(() => {
    const netInvestmentIncome =
      this.taxData().line2b_taxable_interest +
      this.taxData().line3b_ordinary_dividends +
      (this.taxData().longTermCapitalGain ?? 0) +
      (this.taxData().shortTermCapitalGain ?? 0);
    return Math.min(this.niitExposure(), netInvestmentIncome) * this.niitValue;
  });

  remainingRoom = computed(() => {
    return Math.max(this.yearConfig().niitThresholdMFJ - this.magi(), 0);
  });

  // ── Education Credits ──────────────────────────────────────────────────────
  educationCreditAmount = computed(() => {
    const creditType = this.taxData().educationCredit;
    if (creditType === 'NONE') return 0;

    const expenses = this.taxData().educationExpenses ?? 0;
    const phaseoutRatio = this.educationPhaseoutRatio(this.magi());
    if (phaseoutRatio === 0) return 0;

    let rawCredit = 0;
    if (creditType === 'AOTC') {
      const first2k = Math.min(expenses, 2_000);
      const next2k = Math.max(Math.min(expenses - 2_000, 2_000), 0);
      rawCredit = first2k + next2k * 0.25;
    } else if (creditType === 'LLC') {
      rawCredit = Math.min(expenses, 10_000) * 0.20;
    }

    return rawCredit * phaseoutRatio;
  });

  educationPhaseoutNote = computed(() => {
    const cfg = this.yearConfig();
    const magi = this.magi();
    const ratio = this.educationPhaseoutRatio(magi);
    if (ratio === 0) return `Fully phased out — MAGI ${this.formatCurrency(magi)} exceeds $${cfg.aotcPhaseoutEnd.toLocaleString()} limit`;
    if (ratio < 1) return `Partially phased out — MAGI ${this.formatCurrency(magi)} is in $${cfg.aotcPhaseoutStart.toLocaleString()}–$${cfg.aotcPhaseoutEnd.toLocaleString()} range`;
    return '';
  });

  private educationPhaseoutRatio(magi: number): number {
    const cfg = this.yearConfig();
    if (magi <= cfg.aotcPhaseoutStart) return 1;
    if (magi >= cfg.aotcPhaseoutEnd) return 0;
    return 1 - (magi - cfg.aotcPhaseoutStart) / (cfg.aotcPhaseoutEnd - cfg.aotcPhaseoutStart);
  }

  // ── Federal Tax Summary ────────────────────────────────────────────────────
  grossFederalTax = computed(() => {
    return (
      this.ordinaryIncomeTax() +
      this.ltcgTax() +
      this.niitTax() -
      this.educationCreditAmount()
    );
  });

  federalTaxOwed = computed(() => {
    const withheld = (this.taxData().federalWithheld ?? 0) + (this.taxData().estimatedPayments ?? 0);
    return this.grossFederalTax() - withheld;
  });

  // ── WA State Capital Gains Excise Tax ─────────────────────────────────────
  waExcisableLTCG = computed(() => {
    return Math.max((this.taxData().longTermCapitalGain ?? 0) - this.yearConfig().waExemption, 0);
  });

  waExciseTax = computed(() => {
    return this.waExcisableLTCG() * this.yearConfig().waExciseRate;
  });

  // ── AMT Flag ──────────────────────────────────────────────────────────────
  amtFlagMessage = computed((): string => {
    const magi = this.magi();
    const rothConversion = this.taxData().line4b_taxable_ira ?? 0;
    if (magi > 500_000) {
      return `Your MAGI of ${this.formatCurrency(magi)} may trigger AMT. Consult a CPA to calculate Form 6251.`;
    }
    if (rothConversion > 100_000) {
      return `A Roth conversion of ${this.formatCurrency(rothConversion)} can trigger AMT in some situations. Review Form 6251 with your tax advisor.`;
    }
    return '';
  });

  // ── IRMAA Flag ─────────────────────────────────────────────────────────────
  iirmaFlagMessage = computed((): string => {
    const cfg = this.yearConfig();
    const magi = this.magi();
    if (magi > cfg.irmaaThresholdMFJ) {
      return `Your estimated MAGI of ${this.formatCurrency(magi)} exceeds the ${this.formatCurrency(cfg.irmaaThresholdMFJ)} IRMAA threshold (MFJ ${cfg.year}). ` +
        `If you enroll in Medicare, this income could increase your Part B & D premiums 2 years from now. ` +
        `Consider Roth conversion timing carefully.`;
    }
    return '';
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  private calcProgressiveTax(
    income: number,
    brackets: Array<{ ceiling: number; rate: number }>
  ): number {
    let tax = 0;
    let prev = 0;
    for (const { ceiling, rate } of brackets) {
      if (income <= prev) break;
      const taxable = Math.min(income, ceiling) - prev;
      tax += taxable * rate;
      prev = ceiling;
    }
    return tax;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0
    }).format(value);
  }
}
