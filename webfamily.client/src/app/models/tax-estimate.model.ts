
export interface TaxEstimateModel {
  // ── Form 1040 Inputs ──────────────────────────────────────────────────────
  line1_wages: number;                  // Spouse W-2 wages
  line2b_taxable_interest: number;      // Taxable interest income
  line3b_ordinary_dividends: number;    // Ordinary dividends
  line4b_taxable_ira: number;           // Roth conversion / taxable IRA distribution
  line7_capital_gain: number;           // Total capital gain (used for initial load)
  shortTermCapitalGain: number;         // Short-term capital gain (ordinary rates)
  longTermCapitalGain: number;          // Long-term capital gain (preferential rates)

  // ── Retirement & SS ───────────────────────────────────────────────────────
  socialSecurityBenefits: number;       // Gross SS benefits received (up to 85% taxable)

  // ── Education ─────────────────────────────────────────────────────────────
  educationExpenses: number;            // Qualified tuition, fees, books
  educationCredit: 'AOTC' | 'LLC' | 'NONE'; // Selected education credit type

  // ── Payments ──────────────────────────────────────────────────────────────
  federalWithheld: number;              // Federal tax withheld (W-2 + 1099s)
  estimatedPayments: number;            // Quarterly estimated tax payments made

  // ── Filing Info ───────────────────────────────────────────────────────────
  filingStatus: 'MFJ' | 'Single' | 'HOH';
  dependents: number;
}
