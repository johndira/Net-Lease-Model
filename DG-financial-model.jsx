import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calculator, Download, Building2 } from 'lucide-react';

export default function NetLeasePropertyModel() {
  // Input state
  const [inputs, setInputs] = useState({
    purchasePrice: 2500000,
    capRate: 6.75,
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
    capRateExpansionPerYear: 0.15
  });

  const [results, setResults] = useState(null);

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

  const calculateModel = () => {
    const {
      purchasePrice,
      capRate,
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
      capRateExpansionPerYear
    } = inputs;

    // Initial calculations
    const yearOneNOI = purchasePrice * (capRate / 100);
    const loanAmount = purchasePrice * (ltvRatio / 100);
    const equity = purchasePrice - loanAmount;
    const totalClosingCosts = purchasePrice * (closingCosts / 100);
    const totalInitialInvestment = equity + totalClosingCosts;

    // Monthly debt service
    const monthlyRate = (interestRate / 100) / 12;
    const numPayments = loanTerm * 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    const annualDebtService = monthlyPayment * 12;

    // Year 1 metrics
    const yearOneCashFlow = yearOneNOI - annualDebtService;
    const cashOnCashReturn = (yearOneCashFlow / totalInitialInvestment) * 100;
    const debtServiceCoverageRatio = yearOneNOI / annualDebtService;

    // Annual projections
    const projections = [];
    let loanBalance = loanAmount;

    for (let year = 1; year <= holdPeriod; year++) {
      // Rent growth applies every 5 years (years 1-5 same, year 6 bump, years 6-10 same, etc.)
      const rentBumps = Math.floor((year - 1) / 5);
      const noi = yearOneNOI * Math.pow(1 + (annualRentGrowth / 100), rentBumps);
      
      // Calculate principal and interest for the year
      let annualPrincipal = 0;
      let annualInterest = 0;
      
      for (let month = 1; month <= 12; month++) {
        const interestPayment = loanBalance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        annualPrincipal += principalPayment;
        annualInterest += interestPayment;
        loanBalance -= principalPayment;
      }

      const cashFlow = noi - annualDebtService;
      const dscr = noi / annualDebtService;

      projections.push({
        year,
        noi,
        debtService: annualDebtService,
        principalPayment: annualPrincipal,
        interestPayment: annualInterest,
        cashFlow,
        loanBalance: loanBalance + annualPrincipal, // Balance at start of year
        dscr
      });
    }

    // Exit analysis - Cap rate expands as lease term diminishes
    const exitRentBumps = Math.floor((holdPeriod - 1) / 5);
    const exitNOI = yearOneNOI * Math.pow(1 + (annualRentGrowth / 100), exitRentBumps);
    
    // Calculate exit cap rate based on remaining lease term
    const remainingLeaseAtExit = leaseTermRemaining - holdPeriod;
    const yearsOfLeaseTermUsed = holdPeriod;
    
    // Cap rate expands as lease term diminishes (less term = higher cap rate = lower value)
    const calculatedExitCapRate = capRate + (yearsOfLeaseTermUsed * capRateExpansionPerYear);
    const finalExitCapRate = Math.max(calculatedExitCapRate, exitCapRate); // Use whichever is higher
    
    const exitPropertyValue = exitNOI / (finalExitCapRate / 100);
    const sellingCostAmount = exitPropertyValue * (sellingCosts / 100);
    const netSaleProceeds = exitPropertyValue - sellingCostAmount;
    const finalLoanBalance = projections[holdPeriod - 1].loanBalance - projections[holdPeriod - 1].principalPayment;
    const equityReversion = netSaleProceeds - finalLoanBalance;

    // Total cash flows
    const totalCashFlows = projections.reduce((sum, p) => sum + p.cashFlow, 0);
    const totalReturn = totalCashFlows + equityReversion;
    const totalProfit = totalReturn - totalInitialInvestment;
    const totalROI = (totalProfit / totalInitialInvestment) * 100;

    // IRR calculation (simplified approximation)
    const averageAnnualReturn = totalProfit / holdPeriod;
    const approximateIRR = (averageAnnualReturn / totalInitialInvestment) * 100;

    // Equity multiple
    const equityMultiple = totalReturn / totalInitialInvestment;

    // Levered vs Unlevered returns
    const unleveredTotalReturn = projections.reduce((sum, p) => sum + p.noi, 0) + netSaleProceeds;
    const unleveredProfit = unleveredTotalReturn - purchasePrice - totalClosingCosts - sellingCostAmount;
    const unleveredROI = (unleveredProfit / (purchasePrice + totalClosingCosts)) * 100;

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
      
      // Debt service
      monthlyPayment,
      annualDebtService,
      interestRate,
      loanTerm,
      
      // Year 1 returns
      yearOneCashFlow,
      cashOnCashReturn,
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
      approximateIRR,
      equityMultiple,
      unleveredROI,
      
      // Inputs for reference
      holdPeriod,
      annualRentGrowth
    });
  };

  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
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
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Year 1 Cash-on-Cash</span>
            </div>
            <div className="text-3xl font-bold">{formatPercent(results.cashOnCashReturn)}</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Total ROI</span>
            </div>
            <div className="text-3xl font-bold">{formatPercent(results.totalROI)}</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Equity Multiple</span>
            </div>
            <div className="text-3xl font-bold">{results.equityMultiple.toFixed(2)}x</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Approx. IRR</span>
            </div>
            <div className="text-3xl font-bold">{formatPercent(results.approximateIRR)}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Inputs Panel */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Acquisition Inputs</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                  <input
                    type="number"
                    value={inputs.purchasePrice}
                    onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cap Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.capRate}
                    onChange={(e) => handleInputChange('capRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Costs (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.closingCosts}
                    onChange={(e) => handleInputChange('closingCosts', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Financing Inputs</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LTV Ratio (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={inputs.ltvRatio}
                    onChange={(e) => handleInputChange('ltvRatio', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.interestRate}
                    onChange={(e) => handleInputChange('interestRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                  <input
                    type="number"
                    step="0.05"
                    value={inputs.capRateExpansionPerYear}
                    onChange={(e) => handleInputChange('capRateExpansionPerYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.annualRentGrowth}
                    onChange={(e) => handleInputChange('annualRentGrowth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exit Cap Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.exitCapRate}
                    onChange={(e) => handleInputChange('exitCapRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Costs (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.sellingCosts}
                    onChange={(e) => handleInputChange('sellingCosts', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Loan Amount</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(results.loanAmount)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Equity Required</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(results.equity)}</div>
                </div>
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

            {/* Annual Projections */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Annual Cash Flow Projections</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Year</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">NOI</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Debt Service</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Cash Flow</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">DSCR</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Loan Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.projections.map((proj) => (
                      <tr key={proj.year} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{proj.year}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(proj.noi)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(proj.debtService)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatCurrency(proj.cashFlow)}</td>
                        <td className="px-4 py-3 text-right">{proj.dscr.toFixed(2)}x</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(proj.loanBalance)}</td>
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
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Remaining Loan Balance</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(results.finalLoanBalance)}</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200 col-span-2">
                  <div className="text-sm text-green-600 font-medium">Equity Reversion</div>
                  <div className="text-lg font-bold text-green-800">{formatCurrency(results.equityReversion)}</div>
                </div>
              </div>
            </div>

            {/* Return Summary */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-xl font-bold mb-4">Investment Return Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="text-sm opacity-90">Total Cash Flow</div>
                  <div className="text-xl font-bold">{formatCurrency(results.totalCashFlows)}</div>
                </div>
                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="text-sm opacity-90">Equity Reversion</div>
                  <div className="text-xl font-bold">{formatCurrency(results.equityReversion)}</div>
                </div>
                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="text-sm opacity-90">Total Return</div>
                  <div className="text-xl font-bold">{formatCurrency(results.totalReturn)}</div>
                </div>
                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="text-sm opacity-90">Total Profit</div>
                  <div className="text-xl font-bold">{formatCurrency(results.totalProfit)}</div>
                </div>
                <div className="p-4 bg-white bg-opacity-20 rounded-lg backdrop-blur border-2 border-white border-opacity-30">
                  <div className="text-sm opacity-90">Levered ROI</div>
                  <div className="text-2xl font-bold">{formatPercent(results.totalROI)}</div>
                </div>
                <div className="p-4 bg-white bg-opacity-10 rounded-lg backdrop-blur">
                  <div className="text-sm opacity-90">Unlevered ROI</div>
                  <div className="text-xl font-bold">{formatPercent(results.unleveredROI)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
