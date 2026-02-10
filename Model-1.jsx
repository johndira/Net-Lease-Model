import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calculator, Download, Building2, Info, HelpCircle } from 'lucide-react';

const NetLeasePropertyModel = () => {
  // Input state
  const [inputs, setInputs] = useState({
    purchasePrice: 2500000,
    capRate: 6.75,
    purchaseType: 'financed', // 'financed' or 'all-cash'
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
    // Refinance options
    enableRefinance: false,
    refinanceYear: 5,
    refinanceRate: 5.0,
    refinanceLTV: 65,
    refinanceClosingCosts: 1.5
  });

  const [results, setResults] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    calculateModel();
  }, [inputs]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };

  // Tooltip component
  const Tooltip = ({ id, title, description }) => (
    <div className="relative inline-block ml-2">
      <button
        onMouseEnter={() => setTooltipVisible(id)}
        onMouseLeave={() => setTooltipVisible(null)}
        className="text-blue-500 hover:text-blue-700"
      >
        <Info className="w-4 h-4" />
      </button>
      {tooltipVisible === id && (
        <div className="absolute z-10 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="font-semibold mb-1">{title}</div>
          <div className="text-gray-300">{description}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-8 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );

  // Modal component for metric descriptions
  const MetricModal = ({ isOpen, onClose, title, description, calculation, liveFormula }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <div className="text-gray-700 mb-4">
            {description}
          </div>
          {calculation && (
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r mb-4">
              <div className="font-semibold text-blue-900 mb-2">How it's calculated:</div>
              <div className="text-blue-800 text-sm">{calculation}</div>
            </div>
          )}
          {liveFormula && (
            <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded-r">
              <div className="font-semibold text-green-900 mb-2">Your Calculation:</div>
              <div className="text-green-800 text-sm font-mono whitespace-pre-wrap">{liveFormula}</div>
            </div>
          )}
          <button
            onClick={onClose}
            className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    );
  };

  const calculateModel = () => {
    const {
      purchasePrice,
      capRate,
      purchaseType,
      ltvRatio,
      interestRate,
      loanTerm,
      holdPeriod,
      annualRentGrowth,
      exitCapRate,
      closingCosts,
      sellingCosts,
      appreciationRate,
      leaseTermRemaining,
      capRateExpansionPerYear,
      enableRefinance,
      refinanceYear,
      refinanceRate,
      refinanceLTV,
      refinanceClosingCosts
    } = inputs;

    const isAllCash = purchaseType === 'all-cash';

    // Initial calculations
    const yearOneNOI = purchasePrice * (capRate / 100);
    const loanAmount = isAllCash ? 0 : purchasePrice * (ltvRatio / 100);
    const equity = purchasePrice - loanAmount;
    const totalClosingCosts = purchasePrice * (closingCosts / 100);
    const totalInitialInvestment = equity + totalClosingCosts;

    // Monthly debt service
    let monthlyPayment = 0;
    let annualDebtService = 0;
    
    if (!isAllCash) {
      const monthlyRate = (interestRate / 100) / 12;
      const numPayments = loanTerm * 12;
      monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                            (Math.pow(1 + monthlyRate, numPayments) - 1);
      annualDebtService = monthlyPayment * 12;
    }

    // Year 1 metrics
    const yearOneCashFlow = yearOneNOI - annualDebtService;
    const cashOnCashReturn = (yearOneCashFlow / totalInitialInvestment) * 100;
    const debtServiceCoverageRatio = isAllCash ? null : yearOneNOI / annualDebtService;

    // Annual projections
    const projections = [];
    let loanBalance = loanAmount;
    let currentMonthlyPayment = monthlyPayment;
    let currentAnnualDebtService = annualDebtService;
    let refinanceCostsIncurred = 0;

    for (let year = 1; year <= holdPeriod; year++) {
      // Check for refinance
      if (!isAllCash && enableRefinance && year === refinanceYear) {
        const propertyValue = purchasePrice; // Could use appreciated value
        const newLoanAmount = propertyValue * (refinanceLTV / 100);
        const refinanceCosts = propertyValue * (refinanceClosingCosts / 100);
        const cashOutAtRefinance = newLoanAmount - loanBalance - refinanceCosts;
        
        // New loan terms
        const newMonthlyRate = (refinanceRate / 100) / 12;
        const remainingYears = loanTerm - (year - 1);
        const newNumPayments = remainingYears * 12;
        currentMonthlyPayment = newLoanAmount * (newMonthlyRate * Math.pow(1 + newMonthlyRate, newNumPayments)) / 
                               (Math.pow(1 + newMonthlyRate, newNumPayments) - 1);
        currentAnnualDebtService = currentMonthlyPayment * 12;
        loanBalance = newLoanAmount;
        refinanceCostsIncurred = refinanceCosts;
      }

      // Rent growth applies every 5 years
      const rentBumps = Math.floor((year - 1) / 5);
      const noi = yearOneNOI * Math.pow(1 + (annualRentGrowth / 100), rentBumps);
      
      // Calculate principal and interest for the year
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
        year,
        noi,
        debtService: currentAnnualDebtService,
        principalPayment: annualPrincipal,
        interestPayment: annualInterest,
        cashFlow,
        loanBalance: loanBalance + annualPrincipal, // Balance at start of year
        dscr,
        isRefinanceYear: !isAllCash && enableRefinance && year === refinanceYear
      });
    }

    // Average cash on cash
    const totalCashFlowsBeforeExit = projections.reduce((sum, p) => sum + p.cashFlow, 0);
    const avgAnnualCashFlow = totalCashFlowsBeforeExit / holdPeriod;
    const avgCashOnCashReturn = (avgAnnualCashFlow / totalInitialInvestment) * 100;

    // Exit analysis
    const exitRentBumps = Math.floor((holdPeriod - 1) / 5);
    const exitNOI = yearOneNOI * Math.pow(1 + (annualRentGrowth / 100), exitRentBumps);
    
    const remainingLeaseAtExit = leaseTermRemaining - holdPeriod;
    const yearsOfLeaseTermUsed = holdPeriod;
    
    const calculatedExitCapRate = capRate + (yearsOfLeaseTermUsed * capRateExpansionPerYear);
    const finalExitCapRate = Math.max(calculatedExitCapRate, exitCapRate);
    
    const exitPropertyValue = exitNOI / (finalExitCapRate / 100);
    const sellingCostAmount = exitPropertyValue * (sellingCosts / 100);
    const netSaleProceeds = exitPropertyValue - sellingCostAmount;
    const finalLoanBalance = isAllCash ? 0 : (projections[holdPeriod - 1].loanBalance - projections[holdPeriod - 1].principalPayment);
    const equityReversion = netSaleProceeds - finalLoanBalance;

    // Total returns
    const totalCashFlows = projections.reduce((sum, p) => sum + p.cashFlow, 0);
    const totalReturn = totalCashFlows + equityReversion;
    const totalProfit = totalReturn - totalInitialInvestment;
    const totalROI = (totalProfit / totalInitialInvestment) * 100;

    // TRUE IRR calculation using Newton-Raphson method
    const calculateIRR = (cashFlows) => {
      let irr = 0.1; // Initial guess of 10%
      const maxIterations = 100;
      const tolerance = 0.0001;
      
      for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let dnpv = 0;
        
        cashFlows.forEach((cf, t) => {
          npv += cf / Math.pow(1 + irr, t);
          dnpv += -t * cf / Math.pow(1 + irr, t + 1);
        });
        
        const newIrr = irr - npv / dnpv;
        
        if (Math.abs(newIrr - irr) < tolerance) {
          return newIrr * 100; // Convert to percentage
        }
        
        irr = newIrr;
      }
      
      return irr * 100;
    };

    // Build cash flow array for IRR: [initial investment, year 1, year 2, ..., year N + sale proceeds]
    const irrCashFlows = [-totalInitialInvestment];
    projections.forEach((p, idx) => {
      if (idx === projections.length - 1) {
        // Last year includes equity reversion
        irrCashFlows.push(p.cashFlow + equityReversion);
      } else {
        irrCashFlows.push(p.cashFlow);
      }
    });

    const leveredIRR = calculateIRR(irrCashFlows);

    // Unlevered returns
    const unleveredCashFlows = projections.map(p => p.noi);
    const unleveredTotalCashFlow = unleveredCashFlows.reduce((sum, cf) => sum + cf, 0);
    const unleveredTotalReturn = unleveredTotalCashFlow + netSaleProceeds;
    const unleveredInitialInvestment = purchasePrice + totalClosingCosts;
    const unleveredProfit = unleveredTotalReturn - unleveredInitialInvestment - sellingCostAmount;
    const unleveredROI = (unleveredProfit / unleveredInitialInvestment) * 100;

    // Unlevered IRR
    const unleveredIRRCashFlows = [-unleveredInitialInvestment, ...unleveredCashFlows.slice(0, -1), unleveredCashFlows[unleveredCashFlows.length - 1] + netSaleProceeds];
    const unleveredIRR = calculateIRR(unleveredIRRCashFlows);

    // Equity multiple
    const equityMultiple = totalReturn / totalInitialInvestment;

    setResults({
      // Acquisition
      purchasePrice,
      yearOneNOI,
      capRate,
      loanAmount,
      equity,
      totalClosingCosts,
      totalInitialInvestment,
      ltvRatio,
      isAllCash,
      
      // Debt service
      monthlyPayment,
      annualDebtService,
      interestRate,
      loanTerm,
      
      // Year 1 returns
      yearOneCashFlow,
      cashOnCashReturn,
      avgCashOnCashReturn,
      debtServiceCoverageRatio,
      
      // Projections
      projections,
      
      // Exit
      exitNOI,
      exitPropertyValue,
      exitCapRate: finalExitCapRate,
      sellingCostAmount,
      netSaleProceeds,
      finalLoanBalance,
      equityReversion,
      remainingLeaseAtExit,
      capRateExpansion: finalExitCapRate - capRate,
      
      // Overall returns
      totalCashFlows,
      totalReturn,
      totalProfit,
      totalROI,
      leveredIRR,
      unleveredIRR,
      equityMultiple,
      unleveredROI,
      
      // Inputs for reference
      holdPeriod,
      annualRentGrowth,
      refinanceCostsIncurred
    });
  };

  const handleInputChange = (field, value) => {
    // Remove commas for numeric parsing
    const numericValue = typeof value === 'string' ? value.replace(/,/g, '') : value;
    setInputs(prev => ({
      ...prev,
      [field]: parseFloat(numericValue) || 0
    }));
  };

  const formatNumberWithCommas = (value) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleSelectChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const downloadModel = () => {
    const modelCode = `// Net Lease Property Financial Model
// Generated on ${new Date().toLocaleDateString()}

const propertyModel = {
  inputs: ${JSON.stringify(inputs, null, 2)},
  
  calculate: function() {
    // Copy the calculation logic from the React component
    // This is your complete financial model
    ${calculateModel.toString()}
  }
};

// To use this model:
// 1. Modify the inputs object above
// 2. Call propertyModel.calculate()
// 3. Results will be calculated based on your inputs

export default propertyModel;
`;

    const blob = new Blob([modelCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'net-lease-property-model.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!results) return <div className="p-8">Calculating...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-10 h-10 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Net Lease Property Model</h1>
                <p className="text-gray-600">Triple Net Lease Investment Analysis</p>
              </div>
            </div>
            <button
              onClick={downloadModel}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Code
            </button>
          </div>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div 
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow relative"
            onClick={() => setActiveModal('coc')}
          >
            <button className="absolute top-4 right-4 opacity-75 hover:opacity-100">
              <Info className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Year 1 Cash-on-Cash</span>
            </div>
            <div className="text-3xl font-bold">{formatPercent(results.cashOnCashReturn)}</div>
            <div className="text-sm opacity-75 mt-1">Avg: {formatPercent(results.avgCashOnCashReturn)}</div>
          </div>
          
          <div 
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow relative"
            onClick={() => setActiveModal('irr')}
          >
            <button className="absolute top-4 right-4 opacity-75 hover:opacity-100">
              <Info className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Levered IRR</span>
            </div>
            <div className="text-3xl font-bold">{formatPercent(results.leveredIRR)}</div>
            <div className="text-sm opacity-75 mt-1">Total ROI: {formatPercent(results.totalROI)}</div>
          </div>
          
          <div 
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow relative"
            onClick={() => setActiveModal('multiple')}
          >
            <button className="absolute top-4 right-4 opacity-75 hover:opacity-100">
              <Info className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Equity Multiple</span>
            </div>
            <div className="text-3xl font-bold">{results.equityMultiple.toFixed(2)}x</div>
          </div>
          
          <div 
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow relative"
            onClick={() => setActiveModal('unlevered-irr')}
          >
            <button className="absolute top-4 right-4 opacity-75 hover:opacity-100">
              <Info className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Unlevered IRR</span>
            </div>
            <div className="text-3xl font-bold">{formatPercent(results.unleveredIRR)}</div>
          </div>
        </div>

        {/* Modals for metric descriptions */}
        <MetricModal
          isOpen={activeModal === 'coc'}
          onClose={() => setActiveModal(null)}
          title="Cash-on-Cash Return"
          description="Cash-on-Cash (CoC) return measures the annual cash flow you receive relative to the actual cash you invested. Year 1 shows your first year's return, while the average shows your typical annual return over the entire hold period. This metric is particularly useful for comparing the operating performance of different properties."
          calculation="Year 1 CoC = (Year 1 Cash Flow ÷ Total Initial Investment) × 100. Average CoC = (Average Annual Cash Flow ÷ Total Initial Investment) × 100. Initial Investment includes your equity down payment plus closing costs."
          liveFormula={`Year 1 Cash-on-Cash:
= (Year 1 Cash Flow ÷ Total Initial Investment) × 100
= (${formatCurrency(results.yearOneCashFlow)} ÷ ${formatCurrency(results.totalInitialInvestment)}) × 100
= (${(results.yearOneCashFlow / results.totalInitialInvestment).toFixed(4)}) × 100
= ${formatPercent(results.cashOnCashReturn)}

Average Cash-on-Cash:
= (Average Annual Cash Flow ÷ Total Initial Investment) × 100
= (${formatCurrency(results.totalCashFlows / results.holdPeriod)} ÷ ${formatCurrency(results.totalInitialInvestment)}) × 100
= (${((results.totalCashFlows / results.holdPeriod) / results.totalInitialInvestment).toFixed(4)}) × 100
= ${formatPercent(results.avgCashOnCashReturn)}`}
        />

        <MetricModal
          isOpen={activeModal === 'irr'}
          onClose={() => setActiveModal(null)}
          title="Internal Rate of Return (IRR)"
          description="The Internal Rate of Return (IRR) is the discount rate that makes the Net Present Value (NPV) of all cash flows equal to zero. In simpler terms, it's the annualized rate of return you're earning on your investment, accounting for the timing of all cash flows. This model calculates IRR using the Newton-Raphson method for precision. Levered IRR includes the impact of debt financing, which can amplify returns through leverage."
          calculation="IRR is found by solving: NPV = 0 = -Initial Investment + CF₁/(1+IRR)¹ + CF₂/(1+IRR)² + ... + (CFₙ + Sale Proceeds)/(1+IRR)ⁿ. This calculation iterates until it finds the rate that makes all discounted cash flows sum to zero. IRR is time-weighted, making it more accurate than simple ROI for comparing investments with different hold periods."
          liveFormula={`Levered IRR Calculation:
Year 0: -${formatCurrency(results.totalInitialInvestment)} (Initial Investment)
${results.projections.map((p, idx) => 
  idx === results.projections.length - 1 
    ? `Year ${p.year}: ${formatCurrency(p.cashFlow)} + ${formatCurrency(results.equityReversion)} = ${formatCurrency(p.cashFlow + results.equityReversion)} (Cash Flow + Sale Proceeds)`
    : `Year ${p.year}: ${formatCurrency(p.cashFlow)}`
).join('\n')}

Using Newton-Raphson method to solve for IRR where NPV = 0:
NPV = -${formatCurrency(results.totalInitialInvestment)} + ${results.projections.map((p, idx) => {
  const cf = idx === results.projections.length - 1 ? p.cashFlow + results.equityReversion : p.cashFlow;
  return `${formatCurrency(cf)}/(1+IRR)^${idx + 1}`;
}).join(' + ')}

Result: IRR = ${formatPercent(results.leveredIRR)}`}
        />

        <MetricModal
          isOpen={activeModal === 'multiple'}
          onClose={() => setActiveModal(null)}
          title="Equity Multiple"
          description="Equity Multiple shows how many times you've multiplied your initial investment. A 2.0x multiple means you doubled your money, 3.0x means you tripled it, and so on. Unlike IRR, the equity multiple doesn't account for the time value of money—it simply shows total cash returned divided by cash invested. This metric is useful for quickly understanding the total return magnitude."
          calculation="Equity Multiple = Total Return ÷ Initial Investment. Total Return = Sum of all annual cash flows + Equity Reversion at sale. For example, if you invest $1M and receive $2.5M total, your equity multiple is 2.5x."
          liveFormula={`Equity Multiple Calculation:
= Total Return ÷ Initial Investment
= (Total Cash Flows + Equity Reversion) ÷ Initial Investment
= (${formatCurrency(results.totalCashFlows)} + ${formatCurrency(results.equityReversion)}) ÷ ${formatCurrency(results.totalInitialInvestment)}
= ${formatCurrency(results.totalReturn)} ÷ ${formatCurrency(results.totalInitialInvestment)}
= ${results.equityMultiple.toFixed(4)}
= ${results.equityMultiple.toFixed(2)}x`}
        />

        <MetricModal
          isOpen={activeModal === 'unlevered-irr'}
          onClose={() => setActiveModal(null)}
          title="Unlevered IRR"
          description="Unlevered IRR calculates your return as if you purchased the property with all cash (no debt). This metric isolates the property's performance from the financing structure, making it useful for comparing different properties on an apples-to-apples basis. If your Levered IRR is higher than your Unlevered IRR, you're benefiting from positive leverage (the debt is working in your favor)."
          calculation="Calculated the same way as Levered IRR, but using only the property's NOI (Net Operating Income) as annual cash flows and assuming you paid all cash upfront. This shows the property's inherent return independent of how you financed it."
          liveFormula={`Unlevered IRR Calculation (All-Cash Scenario):
Year 0: -${formatCurrency(results.purchasePrice + results.totalClosingCosts)} (Purchase + Closing Costs)
${results.projections.map((p, idx) => 
  idx === results.projections.length - 1 
    ? `Year ${p.year}: ${formatCurrency(p.noi)} + ${formatCurrency(results.netSaleProceeds)} = ${formatCurrency(p.noi + results.netSaleProceeds)} (NOI + Sale Proceeds)`
    : `Year ${p.year}: ${formatCurrency(p.noi)} (NOI)`
).join('\n')}

Using Newton-Raphson method to solve for IRR where NPV = 0

Result: Unlevered IRR = ${formatPercent(results.unleveredIRR)}`}
        />

        <div className="grid md:grid-cols-3 gap-6">
          {/* Inputs Panel */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Acquisition Inputs</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="text"
                      value={formatNumberWithCommas(inputs.purchasePrice)}
                      onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cap Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.capRate}
                      onChange={(e) => handleInputChange('capRate', e.target.value)}
                      className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Costs (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.closingCosts}
                      onChange={(e) => handleInputChange('closingCosts', e.target.value)}
                      className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Type</label>
                  <select
                    value={inputs.purchaseType}
                    onChange={(e) => handleSelectChange('purchaseType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="financed">Financed</option>
                    <option value="all-cash">All Cash</option>
                  </select>
                </div>
              </div>
            </div>

            {inputs.purchaseType === 'financed' && (
              <>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Financing Inputs</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LTV Ratio (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          value={inputs.ltvRatio}
                          onChange={(e) => handleInputChange('ltvRatio', e.target.value)}
                          className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={inputs.interestRate}
                          onChange={(e) => handleInputChange('interestRate', e.target.value)}
                          className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term (years)</label>
                      <input
                        type="number"
                        value={inputs.loanTerm}
                        onChange={(e) => handleInputChange('loanTerm', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Refinance Option</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enableRefinance"
                        checked={inputs.enableRefinance}
                        onChange={(e) => handleSelectChange('enableRefinance', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <label htmlFor="enableRefinance" className="text-sm font-medium text-gray-700">
                        Enable Refinance
                      </label>
                    </div>

                    {inputs.enableRefinance && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Refinance Year</label>
                          <input
                            type="number"
                            value={inputs.refinanceYear}
                            onChange={(e) => handleInputChange('refinanceYear', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">New Interest Rate (%)</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              value={inputs.refinanceRate}
                              onChange={(e) => handleInputChange('refinanceRate', e.target.value)}
                              className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">New LTV (%)</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              value={inputs.refinanceLTV}
                              onChange={(e) => handleInputChange('refinanceLTV', e.target.value)}
                              className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Refi Closing Costs (%)</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              value={inputs.refinanceClosingCosts}
                              onChange={(e) => handleInputChange('refinanceClosingCosts', e.target.value)}
                              className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Lease Term Analysis</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Lease Term (years)</label>
                  <input
                    type="number"
                    value={inputs.leaseTermRemaining}
                    onChange={(e) => handleInputChange('leaseTermRemaining', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cap Rate Expansion Per Year (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      value={inputs.capRateExpansionPerYear}
                      onChange={(e) => handleInputChange('capRateExpansionPerYear', e.target.value)}
                      className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">As lease term burns off, cap rate increases (value decreases)</p>
                </div>
                
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-xs text-amber-800 font-medium">Lease Remaining at Exit</div>
                  <div className="text-lg font-bold text-amber-900">{inputs.leaseTermRemaining - inputs.holdPeriod} years</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Operating Assumptions</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hold Period (years)</label>
                  <input
                    type="number"
                    value={inputs.holdPeriod}
                    onChange={(e) => handleInputChange('holdPeriod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rent Growth Every 5 Years (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.annualRentGrowth}
                      onChange={(e) => handleInputChange('annualRentGrowth', e.target.value)}
                      className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exit Cap Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.exitCapRate}
                      onChange={(e) => handleInputChange('exitCapRate', e.target.value)}
                      className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Costs (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.sellingCosts}
                      onChange={(e) => handleInputChange('sellingCosts', e.target.value)}
                      className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="md:col-span-2 space-y-6">
            {/* Acquisition Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Acquisition Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Purchase Price</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(results.purchasePrice)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Year 1 NOI</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(results.yearOneNOI)}</div>
                </div>
                {!results.isAllCash && (
                  <>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Loan Amount</div>
                      <div className="text-lg font-bold text-gray-800">{formatCurrency(results.loanAmount)}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Equity Required</div>
                      <div className="text-lg font-bold text-gray-800">{formatCurrency(results.equity)}</div>
                    </div>
                  </>
                )}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Closing Costs</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(results.totalClosingCosts)}</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Total Investment</div>
                  <div className="text-lg font-bold text-blue-800">{formatCurrency(results.totalInitialInvestment)}</div>
                </div>
              </div>
            </div>

            {/* Debt Service */}
            {!results.isAllCash && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Debt Service Analysis</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Monthly Payment</div>
                    <div className="text-lg font-bold text-gray-800">{formatCurrency(results.monthlyPayment)}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Annual Debt Service</div>
                    <div className="text-lg font-bold text-gray-800">{formatCurrency(results.annualDebtService)}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Year 1 Cash Flow</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(results.yearOneCashFlow)}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">DSCR</div>
                    <div className="text-lg font-bold text-gray-800">{results.debtServiceCoverageRatio.toFixed(2)}x</div>
                  </div>
                </div>
              </div>
            )}

            {/* Annual Projections */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Annual Cash Flow Projections</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Year</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">NOI</th>
                      {!results.isAllCash && (
                        <>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Debt Service</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">DSCR</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Cash Flow</th>
                      {!results.isAllCash && (
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Loan Balance</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.projections.map((proj) => (
                      <tr key={proj.year} className={`hover:bg-gray-50 ${proj.isRefinanceYear ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3 font-medium">
                          {proj.year}
                          {proj.isRefinanceYear && <span className="ml-2 text-xs text-yellow-600 font-semibold">REFI</span>}
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(proj.noi)}</td>
                        {!results.isAllCash && (
                          <>
                            <td className="px-4 py-3 text-right">{formatCurrency(proj.debtService)}</td>
                            <td className="px-4 py-3 text-right">{proj.dscr.toFixed(2)}x</td>
                          </>
                        )}
                        <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatCurrency(proj.cashFlow)}</td>
                        {!results.isAllCash && (
                          <td className="px-4 py-3 text-right">{formatCurrency(proj.loanBalance)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Exit Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Exit Analysis (Year {results.holdPeriod})</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Exit NOI</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(results.exitNOI)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Remaining Lease Term</div>
                  <div className="text-lg font-bold text-gray-800">{results.remainingLeaseAtExit} years</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm text-amber-600">Entry Cap Rate</div>
                  <div className="text-lg font-bold text-amber-800">{formatPercent(inputs.capRate)}</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm text-amber-600">Exit Cap Rate</div>
                  <div className="text-lg font-bold text-amber-800">{formatPercent(results.exitCapRate)}</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-sm text-red-600">Cap Rate Expansion</div>
                  <div className="text-lg font-bold text-red-800">+{formatPercent(results.capRateExpansion)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Sale Price</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(results.exitPropertyValue)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Selling Costs</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(results.sellingCostAmount)}</div>
                </div>
                {!results.isAllCash && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Remaining Loan Balance</div>
                    <div className="text-lg font-bold text-gray-800">{formatCurrency(results.finalLoanBalance)}</div>
                  </div>
                )}
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200 col-span-2">
                  <div className="text-sm text-green-600 font-medium">Equity Reversion</div>
                  <div className="text-lg font-bold text-green-800">{formatCurrency(results.equityReversion)}</div>
                </div>
              </div>
            </div>

            {/* Return Summary with Live Formulas */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-xl font-bold mb-4">Investment Return Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="flex items-center text-sm opacity-90 mb-1">
                    Total Cash Flow
                  </div>
                  <div className="text-xl font-bold mb-2">{formatCurrency(results.totalCashFlows)}</div>
                  <div className="text-xs opacity-75 font-mono">
                    = Sum of all annual cash flows
                    <br />= {results.projections.map(p => formatCurrency(p.cashFlow)).join(' + ')}
                  </div>
                </div>
                
                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="flex items-center text-sm opacity-90 mb-1">
                    Equity Reversion
                  </div>
                  <div className="text-xl font-bold mb-2">{formatCurrency(results.equityReversion)}</div>
                  <div className="text-xs opacity-75 font-mono">
                    = Sale Price - Selling Costs - Loan Balance
                    <br />= {formatCurrency(results.exitPropertyValue)} - {formatCurrency(results.sellingCostAmount)} - {formatCurrency(results.finalLoanBalance)}
                  </div>
                </div>
                
                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="flex items-center text-sm opacity-90 mb-1">
                    Total Return
                  </div>
                  <div className="text-xl font-bold mb-2">{formatCurrency(results.totalReturn)}</div>
                  <div className="text-xs opacity-75 font-mono">
                    = Total Cash Flow + Equity Reversion
                    <br />= {formatCurrency(results.totalCashFlows)} + {formatCurrency(results.equityReversion)}
                  </div>
                </div>
                
                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="flex items-center text-sm opacity-90 mb-1">
                    Total Profit
                  </div>
                  <div className="text-xl font-bold mb-2">{formatCurrency(results.totalProfit)}</div>
                  <div className="text-xs opacity-75 font-mono">
                    = Total Return - Initial Investment
                    <br />= {formatCurrency(results.totalReturn)} - {formatCurrency(results.totalInitialInvestment)}
                  </div>
                </div>
                
                <div className="p-4 bg-white bg-opacity-20 rounded-lg backdrop-blur border-2 border-white border-opacity-30">
                  <div className="flex items-center text-sm opacity-90 mb-1">
                    Levered IRR
                  </div>
                  <div className="text-2xl font-bold mb-2">{formatPercent(results.leveredIRR)}</div>
                  <div className="text-xs opacity-75 font-mono whitespace-pre-wrap">
                    NPV = 0 (Newton-Raphson method)
                    {'\n'}Year 0: -{formatCurrency(results.totalInitialInvestment)}
                    {results.projections.map((p, idx) => {
                      const cf = idx === results.projections.length - 1 ? p.cashFlow + results.equityReversion : p.cashFlow;
                      return `\nYear ${p.year}: ${formatCurrency(cf)}${idx === results.projections.length - 1 ? ' (incl. sale)' : ''}`;
                    }).join('')}
                  </div>
                </div>
                
                <div className="p-4 bg-white bg-opacity-20 rounded-lg backdrop-blur border-2 border-white border-opacity-30">
                  <div className="flex items-center text-sm opacity-90 mb-1">
                    Unlevered IRR
                  </div>
                  <div className="text-2xl font-bold mb-2">{formatPercent(results.unleveredIRR)}</div>
                  <div className="text-xs opacity-75 font-mono whitespace-pre-wrap">
                    NPV = 0 (all-cash scenario)
                    {'\n'}Year 0: -{formatCurrency(results.purchasePrice + results.totalClosingCosts)}
                    {results.projections.map((p, idx) => {
                      const cf = idx === results.projections.length - 1 ? p.noi + results.netSaleProceeds : p.noi;
                      return `\nYear ${p.year}: ${formatCurrency(cf)}${idx === results.projections.length - 1 ? ' (incl. sale)' : ''}`;
                    }).join('')}
                  </div>
                </div>

                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="flex items-center text-sm opacity-90 mb-1">
                    Equity Multiple
                  </div>
                  <div className="text-xl font-bold mb-2">{results.equityMultiple.toFixed(2)}x</div>
                  <div className="text-xs opacity-75 font-mono">
                    = Total Return ÷ Initial Investment
                    <br />= {formatCurrency(results.totalReturn)} ÷ {formatCurrency(results.totalInitialInvestment)}
                  </div>
                </div>

                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="flex items-center text-sm opacity-90 mb-1">
                    Average Cash-on-Cash
                  </div>
                  <div className="text-xl font-bold mb-2">{formatPercent(results.avgCashOnCashReturn)}</div>
                  <div className="text-xs opacity-75 font-mono">
                    = Avg Annual Cash Flow ÷ Investment
                    <br />= ({formatCurrency(results.totalCashFlows)} ÷ {results.holdPeriod}) ÷ {formatCurrency(results.totalInitialInvestment)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetLeasePropertyModel;
