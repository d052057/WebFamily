import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, CurrencyPipe, PercentPipe, DecimalPipe } from '@angular/common';
import { TaxCalculatorService, TaxInputs, TaxResult } from './services/tax-calculator.service';

@Component({
  selector: 'app-tax-estimate',
  imports: [CurrencyPipe, DecimalPipe, FormsModule],
  templateUrl: './tax-estimate.html',
  styleUrl: './tax-estimate.scss',
})
export class TaxEstimate implements OnInit {
  inputs: TaxInputs = {
    wages: 80000,
    socialSecurity: 24000,
    ordinaryDividends: 5000,
    interest: 3000,
    shortTermGains: 0,
    longTermGains: 200000,
    iraWithdrawal: 0,
    dependentsUnder17: 0,
    collegeStudents: 1,
    educationExpenses: 4000,
    isFirstFourYears: true,
  };

  result = signal<TaxResult | null>(null);

  constructor(private taxService: TaxCalculatorService) { }

  ngOnInit() { this.recalc(); }

  recalc() {
    this.result.set(this.taxService.calculate(this.inputs));
  }

  bracketRows() {
    if (!this.result()) return [];
    const r = this.result()!;
    const BRACKETS = [
      { rate: 0.10, min: 0, max: 23850, label: '10%' },
      { rate: 0.12, min: 23850, max: 96950, label: '12%' },
      { rate: 0.22, min: 96950, max: 206700, label: '22%' },
      { rate: 0.24, min: 206700, max: 394600, label: '24%' },
      { rate: 0.32, min: 394600, max: 501050, label: '32%' },
      { rate: 0.35, min: 501050, max: 751600, label: '35%' },
      { rate: 0.37, min: 751600, max: 2000000, label: '37%' },
    ];
    const income = r.taxableOrdinaryIncome;
    return BRACKETS.map(b => {
      const taxable = Math.max(0, Math.min(income, b.max) - b.min);
      const tax = taxable * b.rate;
      const bracketSize = b.max - b.min;
      const fillPct = bracketSize > 0 ? Math.min(100, (taxable / bracketSize) * 100) : 0;
      return {
        label: b.label,
        rateClass: b.label.replace('%', ''),
        taxable,
        tax,
        fillPct,
      };
    }).filter(b => b.taxable > 0 || b.fillPct === 0);
  }

  creditFillPct() {
    const r = this.result();
    if (!r || r.ordinaryTax === 0) return 0;
    return Math.min(100, (r.totalCredits / r.ordinaryTax) * 100);
  }
}
