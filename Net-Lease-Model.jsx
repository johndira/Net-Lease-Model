const { useState, useEffect } = React;

const DEFAULT_INPUTS = {
  purchasePrice: 2500000,
  capRate: 6.75,
  purchaseType: 'financed',
  ltvRatio: 65,
  interestRate: 6.0,
  loanTerm: 25,
  holdPeriod: 10,
  annualRentGrowth: 10.0,
  exitCapRate: 7.0,
  closingCosts: 2.5,
  sellingCosts: 2.0,
  appreciationRate: 2.0,
  leaseTermRemaining: 15,
  capRateExpansionPerYear: 0.15,
  enableRefinance: false,
  refinanceYear: 5,
  refinanceRate: 5.0,
  refinanceLTV: 65,
  refinanceClosingCosts: 1.5
};

const calculateDeal = (inputs) => {
  const {
    purchasePrice, capRate, purchaseType, ltvRatio, interestRate, loanTerm,
    holdPeriod, annualRentGrowth, exitCapRate, closingCosts, sellingCosts,
    leaseTermRemaining, capRateExpansionPerYear, enableRefinance,
    refinanceYear, refinanceRate, refinanceLTV, refinanceClosingCosts
  } = inputs;

  const isAllCash = purchaseType === 'all-cash';
  const yearOneNOI = purchasePrice * (capRate / 100);
  const loanAmount = isAllCash ? 0 : purchasePrice * (ltvRatio / 100);
  const equity = purchasePrice - loanAmount;
  const totalClosingCosts = purchasePrice * (closingCosts / 100);
  const totalInitialInvestment = equity + totalClosingCosts;

  let monthlyPayment = 0;
  let annualDebtService = 0;
  if (!isAllCash) {
    const monthlyRate = (interestRate / 100) / 12;
    const numPayments = loanTerm * 12;
    monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                     (Math.pow(1 + monthlyRate, numPayments) - 1);
    annualDebtService = monthlyPayment * 12;
  }

  const yearOneCashFlow = yearOneNOI - annualDebtService;
  const cashOnCashReturn = (yearOneCashFlow / totalInitialInvestment) * 100;
  const debtServiceCoverageRatio = isAllCash ? null : yearOneNOI / annualDebtService;

  const projections = [];
  let loanBalance = loanAmount;
  let currentMonthlyPayment = monthlyPayment;
  let currentAnnualDebtService = annualDebtService;
  let refinanceCostsIncurred = 0;

  for (let year = 1; year <= holdPeriod; year++) {
    if (!isAllCash && enableRefinance && year === refinanceYear) {
      const newLoanAmount = purchasePrice * (refinanceLTV / 100);
      const refinanceCosts = purchasePrice * (refinanceClosingCosts / 100);
      const newMonthlyRate = (refinanceRate / 100) / 12;
      const remainingYears = loanTerm - (year - 1);
      const newNumPayments = remainingYears * 12;
      currentMonthlyPayment = newLoanAmount * (newMonthlyRate * Math.pow(1 + newMonthlyRate, newNumPayments)) /
                              (Math.pow(1 + newMonthlyRate, newNumPayments) - 1);
      currentAnnualDebtService = currentMonthlyPayment * 12;
      loanBalance = newLoanAmount;
      refinanceCostsIncurred = refinanceCosts;
    }

    const rentBumps = Math.floor((year - 1) / 5);
    const noi = yearOneNOI * Math.pow(1 + (annualRentGrowth / 100), rentBumps);

    let annualPrincipal = 0;
    let annualInterest = 0;
    if (!isAllCash) {
      const currentMonthlyRate = year < refinanceYear ? (interestRate / 100) / 12 : (refinanceRate / 100) / 12;
      for (let month = 1; month <= 12; month++) {
        const interestPayment = loanBalance * currentMonthlyRate;
        const principalPayment = currentMonthlyPayment - interestPayment;
        annualPrincipal += principalPayment;
        annualInterest += interestPayment;
        loanBalance -= principalPayment;
      }
    }

    const cashFlow = noi - currentAnnualDebtService;
    const dscr = isAllCash ? null : noi / currentAnnualDebtService;
    projections.push({
      year, noi, debtService: currentAnnualDebtService, principalPayment: annualPrincipal,
      interestPayment: annualInterest, cashFlow,
      loanBalance: loanBalance + annualPrincipal, dscr,
      isRefinanceYear: !isAllCash && enableRefinance && year === refinanceYear
    });
  }

  const totalCashFlowsBeforeExit = projections.reduce((sum, p) => sum + p.cashFlow, 0);
  const avgAnnualCashFlow = totalCashFlowsBeforeExit / holdPeriod;
  const avgCashOnCashReturn = (avgAnnualCashFlow / totalInitialInvestment) * 100;

  const exitRentBumps = Math.floor((holdPeriod - 1) / 5);
  const exitNOI = yearOneNOI * Math.pow(1 + (annualRentGrowth / 100), exitRentBumps);
  const yearsOfLeaseTermUsed = holdPeriod;
  const calculatedExitCapRate = capRate + (yearsOfLeaseTermUsed * capRateExpansionPerYear);
  const finalExitCapRate = Math.max(calculatedExitCapRate, exitCapRate);
  const exitPropertyValue = exitNOI / (finalExitCapRate / 100);
  const sellingCostAmount = exitPropertyValue * (sellingCosts / 100);
  const netSaleProceeds = exitPropertyValue - sellingCostAmount;
  const finalLoanBalance = isAllCash ? 0 : (projections[holdPeriod - 1].loanBalance - projections[holdPeriod - 1].principalPayment);
  const equityReversion = netSaleProceeds - finalLoanBalance;

  const totalCashFlows = projections.reduce((sum, p) => sum + p.cashFlow, 0);
  const totalReturn = totalCashFlows + equityReversion;
  const totalProfit = totalReturn - totalInitialInvestment;
  const totalROI = (totalProfit / totalInitialInvestment) * 100;

  const calculateIRR = (cashFlows) => {
    let irr = 0.1;
    for (let i = 0; i < 100; i++) {
      let npv = 0, dnpv = 0;
      cashFlows.forEach((cf, t) => {
        npv += cf / Math.pow(1 + irr, t);
        dnpv += -t * cf / Math.pow(1 + irr, t + 1);
      });
      const newIrr = irr - npv / dnpv;
      if (Math.abs(newIrr - irr) < 0.0001) return newIrr * 100;
      irr = newIrr;
    }
    return irr * 100;
  };

  const irrCashFlows = [-totalInitialInvestment];
  projections.forEach((p, idx) => {
    irrCashFlows.push(idx === projections.length - 1 ? p.cashFlow + equityReversion : p.cashFlow);
  });
  const leveredIRR = calculateIRR(irrCashFlows);

  const unleveredCashFlows = projections.map(p => p.noi);
  const unleveredInitialInvestment = purchasePrice + totalClosingCosts;
  const unleveredIRRCashFlows = [-unleveredInitialInvestment, ...unleveredCashFlows.slice(0, -1),
    unleveredCashFlows[unleveredCashFlows.length - 1] + netSaleProceeds];
  const unleveredIRR = calculateIRR(unleveredIRRCashFlows);
  const equityMultiple = totalReturn / totalInitialInvestment;

  return {
    purchasePrice, yearOneNOI, capRate, loanAmount, equity, totalClosingCosts,
    totalInitialInvestment, ltvRatio, isAllCash, monthlyPayment, annualDebtService,
    interestRate, loanTerm, yearOneCashFlow, cashOnCashReturn, avgCashOnCashReturn,
    debtServiceCoverageRatio, projections, exitNOI, exitPropertyValue,
    exitCapRate: finalExitCapRate, sellingCostAmount, netSaleProceeds, finalLoanBalance,
    equityReversion, remainingLeaseAtExit: leaseTermRemaining - holdPeriod,
    capRateExpansion: finalExitCapRate - capRate, totalCashFlows, totalReturn,
    totalProfit, totalROI, leveredIRR, unleveredIRR, equityMultiple,
    holdPeriod, annualRentGrowth, refinanceCostsIncurred
  };
};

// ─── Input Panel ────────────────────────────────────────────────────────────

const InputPanel = ({ label, color, inputs, onChange, onSelectChange }) => {
  const formatNumberWithCommas = (v) => v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const border = color === 'blue' ? 'border-blue-500' : 'border-emerald-500';
  const badge = color === 'blue'
    ? 'bg-blue-600 text-white'
    : 'bg-emerald-600 text-white';
  const ring = color === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-emerald-500';

  const inputClass = `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${ring} focus:border-transparent text-sm`;
  const inputRightClass = `w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${ring} focus:border-transparent text-sm`;
  const inputLeftClass = `w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${ring} focus:border-transparent text-sm`;

  return (
    <div className={`bg-white rounded-xl shadow-lg border-t-4 ${border} overflow-hidden`}>
      <div className={`px-4 py-3 ${badge} flex items-center gap-2`}>
        <span className="text-lg font-bold">{label}</span>
      </div>

      <div className="p-4 space-y-5">
        {/* Acquisition */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Acquisition</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input type="text" value={formatNumberWithCommas(inputs.purchasePrice)}
                  onChange={(e) => onChange('purchasePrice', e.target.value)} className={inputLeftClass} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cap Rate (%)</label>
              <div className="relative">
                <input type="number" step="0.1" value={inputs.capRate}
                  onChange={(e) => onChange('capRate', e.target.value)} className={inputRightClass} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Closing Costs (%)</label>
              <div className="relative">
                <input type="number" step="0.1" value={inputs.closingCosts}
                  onChange={(e) => onChange('closingCosts', e.target.value)} className={inputRightClass} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Type</label>
              <select value={inputs.purchaseType}
                onChange={(e) => onSelectChange('purchaseType', e.target.value)}
                className={inputClass}>
                <option value="financed">Financed</option>
                <option value="all-cash">All Cash</option>
              </select>
            </div>
          </div>
        </div>

        {/* Financing */}
        {inputs.purchaseType === 'financed' && (
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Financing</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">LTV Ratio (%)</label>
                <div className="relative">
                  <input type="number" step="1" value={inputs.ltvRatio}
                    onChange={(e) => onChange('ltvRatio', e.target.value)} className={inputRightClass} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                <div className="relative">
                  <input type="number" step="0.1" value={inputs.interestRate}
                    onChange={(e) => onChange('interestRate', e.target.value)} className={inputRightClass} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Loan Term (years)</label>
                <input type="number" value={inputs.loanTerm}
                  onChange={(e) => onChange('loanTerm', e.target.value)} className={inputClass} />
              </div>

              {/* Refinance */}
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id={`refi-${label}`} checked={inputs.enableRefinance}
                    onChange={(e) => onSelectChange('enableRefinance', e.target.checked)}
                    className="w-4 h-4 rounded" />
                  <label htmlFor={`refi-${label}`} className="text-xs font-medium text-gray-700">Enable Refinance</label>
                </div>
                {inputs.enableRefinance && (
                  <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Refinance Year</label>
                      <input type="number" value={inputs.refinanceYear}
                        onChange={(e) => onChange('refinanceYear', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">New Rate (%)</label>
                      <div className="relative">
                        <input type="number" step="0.1" value={inputs.refinanceRate}
                          onChange={(e) => onChange('refinanceRate', e.target.value)} className={inputRightClass} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">New LTV (%)</label>
                      <div className="relative">
                        <input type="number" step="1" value={inputs.refinanceLTV}
                          onChange={(e) => onChange('refinanceLTV', e.target.value)} className={inputRightClass} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Refi Closing Costs (%)</label>
                      <div className="relative">
                        <input type="number" step="0.1" value={inputs.refinanceClosingCosts}
                          onChange={(e) => onChange('refinanceClosingCosts', e.target.value)} className={inputRightClass} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lease */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Lease</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Remaining Lease Term (yrs)</label>
              <input type="number" value={inputs.leaseTermRemaining}
                onChange={(e) => onChange('leaseTermRemaining', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cap Rate Expansion / Year (%)</label>
              <div className="relative">
                <input type="number" step="0.05" value={inputs.capRateExpansionPerYear}
                  onChange={(e) => onChange('capRateExpansionPerYear', e.target.value)} className={inputRightClass} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-xs text-amber-700 font-medium">Lease Remaining at Exit</div>
              <div className="text-base font-bold text-amber-900">{inputs.leaseTermRemaining - inputs.holdPeriod} years</div>
            </div>
          </div>
        </div>

        {/* Operating */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Operating Assumptions</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hold Period (years)</label>
              <input type="number" value={inputs.holdPeriod}
                onChange={(e) => onChange('holdPeriod', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rent Growth Every 5 Yrs (%)</label>
              <div className="relative">
                <input type="number" step="0.1" value={inputs.annualRentGrowth}
                  onChange={(e) => onChange('annualRentGrowth', e.target.value)} className={inputRightClass} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Exit Cap Rate (%)</label>
              <div className="relative">
                <input type="number" step="0.1" value={inputs.exitCapRate}
                  onChange={(e) => onChange('exitCapRate', e.target.value)} className={inputRightClass} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Selling Costs (%)</label>
              <div className="relative">
                <input type="number" step="0.1" value={inputs.sellingCosts}
                  onChange={(e) => onChange('sellingCosts', e.target.value)} className={inputRightClass} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Comparison metric row ───────────────────────────────────────────────────

const CompareRow = ({ label, aVal, bVal, higherIsBetter = true, format = 'text' }) => {
  let aNum = typeof aVal === 'number' ? aVal : null;
  let bNum = typeof bVal === 'number' ? bVal : null;

  let aWins = false, bWins = false;
  if (aNum !== null && bNum !== null && aNum !== bNum) {
    aWins = higherIsBetter ? aNum > bNum : aNum < bNum;
    bWins = !aWins;
  }

  const highlight = (wins) => wins ? 'bg-green-50 font-bold text-green-800' : 'text-gray-700';

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-2 px-3 text-sm text-gray-600 font-medium">{label}</td>
      <td className={`py-2 px-3 text-sm text-right ${highlight(aWins)}`}>{aVal}</td>
      <td className={`py-2 px-3 text-sm text-right ${highlight(bWins)}`}>{bVal}</td>
    </tr>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const NetLeasePropertyModel = () => {
  const [inputsA, setInputsA] = useState({ ...DEFAULT_INPUTS });
  const [inputsB, setInputsB] = useState({ ...DEFAULT_INPUTS, purchasePrice: 3000000, capRate: 6.5 });

  const [resultsA, setResultsA] = useState(null);
  const [resultsB, setResultsB] = useState(null);

  useEffect(() => { setResultsA(calculateDeal(inputsA)); }, [inputsA]);
  useEffect(() => { setResultsB(calculateDeal(inputsB)); }, [inputsB]);

  const formatCurrency = (v) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(v);
  const formatPercent = (v) => `${v.toFixed(2)}%`;
  const fmtx = (v) => `${v.toFixed(2)}x`;

  const makeHandler = (setter) => (field, value) => {
    const numericValue = typeof value === 'string' ? value.replace(/,/g, '') : value;
    setter(prev => ({ ...prev, [field]: parseFloat(numericValue) || 0 }));
  };
  const makeSelectHandler = (setter) => (field, value) => {
    setter(prev => ({ ...prev, [field]: value }));
  };

  if (!resultsA || !resultsB) return <div className="p-8">Calculating...</div>;

  const maxHold = Math.max(resultsA.holdPeriod, resultsB.holdPeriod);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-screen-2xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-5 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏢</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Net Lease Deal Comparison</h1>
              <p className="text-gray-500 text-sm">Compare two Triple Net Lease investments side by side</p>
            </div>
          </div>
        </div>

        {/* Input columns */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <InputPanel
            label="Deal A"
            color="blue"
            inputs={inputsA}
            onChange={makeHandler(setInputsA)}
            onSelectChange={makeSelectHandler(setInputsA)}
          />
          <InputPanel
            label="Deal B"
            color="emerald"
            inputs={inputsB}
            onChange={makeHandler(setInputsB)}
            onSelectChange={makeSelectHandler(setInputsB)}
          />
        </div>

        {/* Key metrics comparison cards */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Year 1 Cash-on-Cash', a: formatPercent(resultsA.cashOnCashReturn), b: formatPercent(resultsB.cashOnCashReturn), aNum: resultsA.cashOnCashReturn, bNum: resultsB.cashOnCashReturn, icon: '📈', color: 'green' },
            { label: 'Levered IRR', a: formatPercent(resultsA.leveredIRR), b: formatPercent(resultsB.leveredIRR), aNum: resultsA.leveredIRR, bNum: resultsB.leveredIRR, icon: '🧮', color: 'blue' },
            { label: 'Equity Multiple', a: fmtx(resultsA.equityMultiple), b: fmtx(resultsB.equityMultiple), aNum: resultsA.equityMultiple, bNum: resultsB.equityMultiple, icon: '💲', color: 'purple' },
            { label: 'Unlevered IRR', a: formatPercent(resultsA.unleveredIRR), b: formatPercent(resultsB.unleveredIRR), aNum: resultsA.unleveredIRR, bNum: resultsB.unleveredIRR, icon: '📊', color: 'orange' },
          ].map(({ label, a, b, aNum, bNum, icon, color }) => {
            const aWins = aNum > bNum;
            const colorMap = { green: 'from-green-500 to-green-600', blue: 'from-blue-500 to-blue-600', purple: 'from-purple-500 to-purple-600', orange: 'from-orange-500 to-orange-600' };
            return (
              <div key={label} className={`bg-gradient-to-br ${colorMap[color]} rounded-xl shadow-lg p-5 text-white`}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{icon}</span>
                  <span className="text-sm font-medium opacity-90">{label}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className={`rounded-lg p-2 text-center ${aWins ? 'bg-white bg-opacity-30 ring-2 ring-white ring-opacity-60' : 'bg-white bg-opacity-10'}`}>
                    <div className="text-xs opacity-75 mb-0.5">Deal A</div>
                    <div className="text-lg font-bold">{a}</div>
                    {aWins && <div className="text-xs mt-0.5">★ Better</div>}
                  </div>
                  <div className={`rounded-lg p-2 text-center ${!aWins ? 'bg-white bg-opacity-30 ring-2 ring-white ring-opacity-60' : 'bg-white bg-opacity-10'}`}>
                    <div className="text-xs opacity-75 mb-0.5">Deal B</div>
                    <div className="text-lg font-bold">{b}</div>
                    {!aWins && <div className="text-xs mt-0.5">★ Better</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed comparison table */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-5">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Full Metrics Comparison</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-2 px-3 text-left text-sm font-semibold text-gray-600">Metric</th>
                <th className="py-2 px-3 text-right text-sm font-semibold text-blue-600">Deal A</th>
                <th className="py-2 px-3 text-right text-sm font-semibold text-emerald-600">Deal B</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50">
                <td colSpan="3" className="py-1 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Acquisition</td>
              </tr>
              <CompareRow label="Purchase Price" aVal={formatCurrency(resultsA.purchasePrice)} bVal={formatCurrency(resultsB.purchasePrice)} higherIsBetter={false} />
              <CompareRow label="Year 1 NOI" aVal={formatCurrency(resultsA.yearOneNOI)} bVal={formatCurrency(resultsB.yearOneNOI)} aNum={resultsA.yearOneNOI} bNum={resultsB.yearOneNOI} higherIsBetter={true} />
              <CompareRow label="Entry Cap Rate" aVal={formatPercent(resultsA.capRate)} bVal={formatPercent(resultsB.capRate)} />
              <CompareRow label="Total Investment" aVal={formatCurrency(resultsA.totalInitialInvestment)} bVal={formatCurrency(resultsB.totalInitialInvestment)} higherIsBetter={false} />
              {(!resultsA.isAllCash || !resultsB.isAllCash) && (
                <>
                  <tr className="bg-gray-50">
                    <td colSpan="3" className="py-1 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Debt Service</td>
                  </tr>
                  <CompareRow label="Loan Amount" aVal={resultsA.isAllCash ? 'N/A' : formatCurrency(resultsA.loanAmount)} bVal={resultsB.isAllCash ? 'N/A' : formatCurrency(resultsB.loanAmount)} />
                  <CompareRow label="Annual Debt Service" aVal={resultsA.isAllCash ? 'N/A' : formatCurrency(resultsA.annualDebtService)} bVal={resultsB.isAllCash ? 'N/A' : formatCurrency(resultsB.annualDebtService)} higherIsBetter={false} />
                  <CompareRow label="DSCR (Year 1)" aVal={resultsA.isAllCash ? 'N/A' : fmtx(resultsA.debtServiceCoverageRatio)} bVal={resultsB.isAllCash ? 'N/A' : fmtx(resultsB.debtServiceCoverageRatio)} aNum={resultsA.debtServiceCoverageRatio} bNum={resultsB.debtServiceCoverageRatio} higherIsBetter={true} />
                </>
              )}
              <tr className="bg-gray-50">
                <td colSpan="3" className="py-1 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Returns</td>
              </tr>
              <CompareRow label="Year 1 Cash-on-Cash" aVal={formatPercent(resultsA.cashOnCashReturn)} bVal={formatPercent(resultsB.cashOnCashReturn)} aNum={resultsA.cashOnCashReturn} bNum={resultsB.cashOnCashReturn} higherIsBetter={true} />
              <CompareRow label="Avg Cash-on-Cash" aVal={formatPercent(resultsA.avgCashOnCashReturn)} bVal={formatPercent(resultsB.avgCashOnCashReturn)} aNum={resultsA.avgCashOnCashReturn} bNum={resultsB.avgCashOnCashReturn} higherIsBetter={true} />
              <CompareRow label="Levered IRR" aVal={formatPercent(resultsA.leveredIRR)} bVal={formatPercent(resultsB.leveredIRR)} aNum={resultsA.leveredIRR} bNum={resultsB.leveredIRR} higherIsBetter={true} />
              <CompareRow label="Unlevered IRR" aVal={formatPercent(resultsA.unleveredIRR)} bVal={formatPercent(resultsB.unleveredIRR)} aNum={resultsA.unleveredIRR} bNum={resultsB.unleveredIRR} higherIsBetter={true} />
              <CompareRow label="Equity Multiple" aVal={fmtx(resultsA.equityMultiple)} bVal={fmtx(resultsB.equityMultiple)} aNum={resultsA.equityMultiple} bNum={resultsB.equityMultiple} higherIsBetter={true} />
              <CompareRow label="Total Cash Flow" aVal={formatCurrency(resultsA.totalCashFlows)} bVal={formatCurrency(resultsB.totalCashFlows)} aNum={resultsA.totalCashFlows} bNum={resultsB.totalCashFlows} higherIsBetter={true} />
              <CompareRow label="Equity Reversion" aVal={formatCurrency(resultsA.equityReversion)} bVal={formatCurrency(resultsB.equityReversion)} aNum={resultsA.equityReversion} bNum={resultsB.equityReversion} higherIsBetter={true} />
              <CompareRow label="Total Profit" aVal={formatCurrency(resultsA.totalProfit)} bVal={formatCurrency(resultsB.totalProfit)} aNum={resultsA.totalProfit} bNum={resultsB.totalProfit} higherIsBetter={true} />
              <tr className="bg-gray-50">
                <td colSpan="3" className="py-1 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Exit</td>
              </tr>
              <CompareRow label="Exit NOI" aVal={formatCurrency(resultsA.exitNOI)} bVal={formatCurrency(resultsB.exitNOI)} aNum={resultsA.exitNOI} bNum={resultsB.exitNOI} higherIsBetter={true} />
              <CompareRow label="Exit Cap Rate" aVal={formatPercent(resultsA.exitCapRate)} bVal={formatPercent(resultsB.exitCapRate)} aNum={resultsA.exitCapRate} bNum={resultsB.exitCapRate} higherIsBetter={false} />
              <CompareRow label="Sale Price" aVal={formatCurrency(resultsA.exitPropertyValue)} bVal={formatCurrency(resultsB.exitPropertyValue)} aNum={resultsA.exitPropertyValue} bNum={resultsB.exitPropertyValue} higherIsBetter={true} />
              <CompareRow label="Remaining Lease at Exit" aVal={`${resultsA.remainingLeaseAtExit} yrs`} bVal={`${resultsB.remainingLeaseAtExit} yrs`} aNum={resultsA.remainingLeaseAtExit} bNum={resultsB.remainingLeaseAtExit} higherIsBetter={true} />
            </tbody>
          </table>
        </div>

        {/* Side-by-side annual projections */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {[
            { label: 'Deal A', results: resultsA, color: 'blue' },
            { label: 'Deal B', results: resultsB, color: 'emerald' },
          ].map(({ label, results, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-lg p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3">
                <span className={`inline-block px-2 py-0.5 rounded text-white text-xs mr-2 ${color === 'blue' ? 'bg-blue-600' : 'bg-emerald-600'}`}>{label}</span>
                Annual Cash Flow Projections
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-gray-700">Yr</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-700">NOI</th>
                      {!results.isAllCash && <th className="px-2 py-2 text-right font-semibold text-gray-700">Debt Svc</th>}
                      <th className="px-2 py-2 text-right font-semibold text-gray-700">Cash Flow</th>
                      {!results.isAllCash && <th className="px-2 py-2 text-right font-semibold text-gray-700">Loan Bal</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.projections.map((proj) => (
                      <tr key={proj.year} className={`hover:bg-gray-50 ${proj.isRefinanceYear ? 'bg-yellow-50' : ''}`}>
                        <td className="px-2 py-2 font-medium">
                          {proj.year}
                          {proj.isRefinanceYear && <span className="ml-1 text-yellow-600 font-semibold">R</span>}
                        </td>
                        <td className="px-2 py-2 text-right">{formatCurrency(proj.noi)}</td>
                        {!results.isAllCash && <td className="px-2 py-2 text-right">{formatCurrency(proj.debtService)}</td>}
                        <td className="px-2 py-2 text-right text-green-600 font-semibold">{formatCurrency(proj.cashFlow)}</td>
                        {!results.isAllCash && <td className="px-2 py-2 text-right">{formatCurrency(proj.loanBalance)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

window.NetLeasePropertyModel = NetLeasePropertyModel;
