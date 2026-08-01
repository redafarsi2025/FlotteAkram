import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { KPIBadge } from '../common/KPIBadge';
import { TenantConfig as TenantConfigType } from '../../types';
import {
  Building2,
  DollarSign,
  PieChart,
  Save,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Download,
  CreditCard,
  Building,
  RefreshCw,
  Globe,
  FileText,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const TenantConfig: React.FC = () => {
  const {
    tenantConfigs,
    activeTenantId,
    activeTenant,
    updateTenantConfig,
    setActiveTenantId,
    addTenantConfig,
    costRecords,
  } = useFleet();

  // Local form state initialized with activeTenant values
  const [formData, setFormData] = useState<TenantConfigType>(activeTenant);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'society' | 'financials' | 'contact'>('society');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // New Tenant Form State
  const [newTenantData, setNewTenantData] = useState<Omit<TenantConfigType, 'id' | 'lastUpdated'>>({
    societyName: '',
    currency: 'USD ($)',
    currencySymbol: '$',
    allocatedBudget: 500000,
    moneyUsed: 0,
    fiscalYear: 'FY2026',
    operatingRegion: 'North America',
    taxRegistrationId: 'TAX-NEW-001',
    costCenterCode: 'CC-FLEET-100',
    defaultLaborRate: 85,
    emergencyApprovalThreshold: 5000,
    contactEmail: 'contact@fleet.org',
    contactPhone: '+1 (555) 000-1122',
    billingAddress: '100 Business Parkway, Suite 100',
    autoSyncMoneyUsed: true,
  });

  // Keep form data synchronized when activeTenant changes
  useEffect(() => {
    setFormData(activeTenant);
  }, [activeTenant]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleInputChange = (field: keyof TenantConfigType, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Update currency symbol automatically based on selected currency string
      if (field === 'currency') {
        if (value.includes('DZD') || value.includes('DA')) updated.currencySymbol = 'DA';
        else if (value.includes('€')) updated.currencySymbol = '€';
        else if (value.includes('£')) updated.currencySymbol = '£';
        else if (value.includes('CAD')) updated.currencySymbol = 'C$';
        else if (value.includes('AED')) updated.currencySymbol = 'AED';
        else updated.currencySymbol = '$';
      }
      return updated;
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantConfig(activeTenant.id, formData);
    showToast(`Configuration for "${formData.societyName}" saved successfully!`);
  };

  const handleReset = () => {
    setFormData(activeTenant);
    showToast('Changes discarded; form restored to last saved state.');
  };

  const handleSyncMoneyUsed = () => {
    const totalCost = costRecords.reduce((sum, c) => sum + c.amount, 0);
    setFormData((prev) => ({
      ...prev,
      moneyUsed: totalCost,
      autoSyncMoneyUsed: true,
    }));
    updateTenantConfig(activeTenant.id, {
      moneyUsed: totalCost,
      autoSyncMoneyUsed: true,
    });
    showToast(`Money used recalculated and updated to ${activeTenant.currencySymbol}${totalCost.toLocaleString()} from ${costRecords.length} cost records.`);
  };

  const handleCreateNewTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantData.societyName.trim()) return;

    const createdId = addTenantConfig(newTenantData);
    setIsCreatingNew(false);
    // Reset modal form defaults
    setNewTenantData({
      societyName: '',
      currency: 'USD ($)',
      currencySymbol: '$',
      allocatedBudget: 500000,
      moneyUsed: 0,
      fiscalYear: 'FY2026',
      operatingRegion: 'North America',
      taxRegistrationId: 'TAX-NEW-001',
      costCenterCode: 'CC-FLEET-100',
      defaultLaborRate: 85,
      emergencyApprovalThreshold: 5000,
      contactEmail: 'contact@fleet.org',
      contactPhone: '+1 (555) 000-1122',
      billingAddress: '100 Business Parkway, Suite 100',
      autoSyncMoneyUsed: true,
    });
    showToast(`New Tenant Society registered and activated (ID: ${createdId})!`);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tenant_config_${formData.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Tenant configuration exported as tenant_config_${formData.id}.json`);
  };

  // Financial metrics calculations
  const totalBudget = formData.allocatedBudget || 1;
  const moneyUsed = formData.moneyUsed || 0;
  const remainingBudget = totalBudget - moneyUsed;
  const utilizationPercentage = Math.min(100, Math.round((moneyUsed / totalBudget) * 100));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto relative">
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-lg bg-emerald-900 text-emerald-100 px-4 py-3 shadow-xl border border-emerald-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <KPIBadge label="Configured" type="Configured" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              Tenant & Society Management Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tenant & Society Configuration
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure multi-tenant parameters, society details, allocated financial budgets, currency rules, and labor rates.
          </p>
        </div>

        {/* Tenant Profile Switcher & New Society Trigger */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500 mb-1">Active Tenant Profile</label>
            <div className="relative">
              <select
                value={activeTenantId}
                onChange={(e) => setActiveTenantId(e.target.value)}
                className="appearance-none rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-8 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {tenantConfigs.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.societyName} ({tenant.id})
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={() => setIsCreatingNew(true)}
            className="mt-5 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Society
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Society Name & Identity */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Society</span>
              <Building className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 truncate" title={formData.societyName}>
              {formData.societyName || 'Unconfigured Society'}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>ID: <strong className="text-slate-700">{formData.id}</strong></span>
            <span>Tax: <strong className="text-slate-700">{formData.taxRegistrationId}</strong></span>
          </div>
        </div>

        {/* Card 2: Money Used / Expenditure */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Money Used (Expenditure)</span>
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formData.currencySymbol}{formData.moneyUsed.toLocaleString()}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Source:</span>
            {formData.autoSyncMoneyUsed ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                <RefreshCw className="w-3 h-3 animate-spin" /> Cost Records Auto-Sync
              </span>
            ) : (
              <span className="text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded">
                Manual Override
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Allocated Budget & Remaining */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Allocated Budget</span>
              <PieChart className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formData.currencySymbol}{formData.allocatedBudget.toLocaleString()}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Used: {utilizationPercentage}%</span>
              <span>Remaining: <strong className={remainingBudget < 0 ? 'text-red-600' : 'text-emerald-700'}>
                {formData.currencySymbol}{remainingBudget.toLocaleString()}
              </strong></span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${utilizationPercentage > 90 ? 'bg-red-500' : utilizationPercentage > 75 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                style={{ width: `${utilizationPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Operating Parameters */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Operating Controls</span>
              <Briefcase className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-sm font-semibold text-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-normal">Labor Rate:</span>
                <span>{formData.currencySymbol}{formData.defaultLaborRate} / hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-normal">Emergency Cap:</span>
                <span>{formData.currencySymbol}{formData.emergencyApprovalThreshold.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Fiscal Year: <strong className="text-slate-700">{formData.fiscalYear}</strong></span>
            <span>Region: <strong className="text-slate-700 truncate max-w-[90px]">{formData.operatingRegion}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 bg-slate-50/50 px-6 pt-4 flex gap-6">
          <button
            onClick={() => setActiveTab('society')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'society'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building className="w-4 h-4" />
            1. Society Identity & Registration
          </button>

          <button
            onClick={() => setActiveTab('financials')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'financials'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            2. Financial Budgets & Money Used
          </button>

          <button
            onClick={() => setActiveTab('contact')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'contact'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Globe className="w-4 h-4" />
            3. Contact & Billing Address
          </button>
        </div>

        {/* Tab Form Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {activeTab === 'society' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Society / Organization Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.societyName}
                    onChange={(e) => handleInputChange('societyName', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. NextTransit Metro Fleet Society S.A."
                  />
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-1">Official registered corporate or transit authority entity name.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Tax Registration / Tax ID *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.taxRegistrationId}
                    onChange={(e) => handleInputChange('taxRegistrationId', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. TAX-8839201-NX"
                  />
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-1">Corporate tax identification or municipal registration number.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Cost Center Code *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.costCenterCode}
                    onChange={(e) => handleInputChange('costCenterCode', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. CC-FLEET-902"
                  />
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-1">Internal general ledger accounting cost center reference.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Operating Region *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.operatingRegion}
                    onChange={(e) => handleInputChange('operatingRegion', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. North America - Midwest Sector"
                  />
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-1">Primary geographic transit zone or corridor jurisdiction.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Fiscal Year *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fiscalYear}
                  onChange={(e) => handleInputChange('fiscalYear', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. FY2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Tenant Unique ID
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.id}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-mono text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1">System-assigned immutable tenant identifier.</p>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Operating Currency *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="USD ($)">USD ($) - US Dollar</option>
                    <option value="DZD (DA)">DZD (DA) - Algerian Dinar</option>
                    <option value="EUR (€)">EUR (€) - Euro</option>
                    <option value="GBP (£)">GBP (£) - British Pound</option>
                    <option value="CAD ($)">CAD (C$) - Canadian Dollar</option>
                    <option value="AED (AED)">AED (AED) - UAE Dirham</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">All financial charts, cost calculations, and work order line items will display in this currency.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Allocated Quarterly Budget ({formData.currencySymbol}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={formData.allocatedBudget}
                      onChange={(e) => handleInputChange('allocatedBudget', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">
                      {formData.currencySymbol}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Total authorized maintenance and fleet operation expenditure limit.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Money Used / Actual Expenditure ({formData.currencySymbol}) *
                    </label>
                    <button
                      type="button"
                      onClick={handleSyncMoneyUsed}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Sync with Cost Records
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step={100}
                      value={formData.moneyUsed}
                      onChange={(e) => handleInputChange('moneyUsed', Number(e.target.value))}
                      disabled={formData.autoSyncMoneyUsed}
                      className={`w-full rounded-lg border pl-8 pr-3 py-2 text-sm font-semibold text-slate-900 ${
                        formData.autoSyncMoneyUsed
                          ? 'bg-slate-50 border-slate-200 text-slate-600'
                          : 'border-slate-300 focus:border-indigo-500'
                      }`}
                    />
                    <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">
                      {formData.currencySymbol}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoSyncCheck"
                      checked={formData.autoSyncMoneyUsed}
                      onChange={(e) => handleInputChange('autoSyncMoneyUsed', e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <label htmlFor="autoSyncCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
                      Automatically calculate money used from live fleet cost records ({formData.currencySymbol}{costRecords.reduce((s, c) => s + c.amount, 0).toLocaleString()})
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Default Workshop Labor Rate ({formData.currencySymbol} / hour) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step={5}
                      value={formData.defaultLaborRate}
                      onChange={(e) => handleInputChange('defaultLaborRate', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">
                      {formData.currencySymbol}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Standard hourly rate used for Rule R4 work order repair cost estimates.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Emergency Maintenance Approval Cap ({formData.currencySymbol}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step={500}
                      value={formData.emergencyApprovalThreshold}
                      onChange={(e) => handleInputChange('emergencyApprovalThreshold', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm text-slate-900 font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">
                      {formData.currencySymbol}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Rule R1 emergency dispatches exceeding this limit require Technical Controller sign-off.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Official Operations Contact Email *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="operations@nexttransit.com"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-1">Receives automated low-stock alerts (Rule R3) and emergency dispatches.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Contact Phone Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="+1 (555) 234-8900"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Registered Billing Address *
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    required
                    value={formData.billingAddress}
                    onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="100 Logistics Blvd, Suite 400, Chicago, IL 60607"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons Bar */}
          <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Tenant Configuration
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                Discard Changes
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export Profile (JSON)
            </button>
          </div>
        </form>
      </div>

      {/* Modal: Add New Society / Tenant Profile */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Register New Tenant / Society</h3>
              </div>
              <button
                onClick={() => setIsCreatingNew(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateNewTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Society / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTenantData.societyName}
                  onChange={(e) => setNewTenantData({ ...newTenantData, societyName: e.target.value })}
                  placeholder="e.g. TransNational Logistics Corp"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Currency *
                  </label>
                  <select
                    value={newTenantData.currency}
                    onChange={(e) => {
                      const curr = e.target.value;
                      let sym = '$';
                      if (curr.includes('DZD') || curr.includes('DA')) sym = 'DA';
                      else if (curr.includes('€')) sym = '€';
                      else if (curr.includes('£')) sym = '£';
                      else if (curr.includes('CAD')) sym = 'C$';
                      else if (curr.includes('AED')) sym = 'AED';
                      setNewTenantData({ ...newTenantData, currency: curr, currencySymbol: sym });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="USD ($)">USD ($)</option>
                    <option value="DZD (DA)">DZD (DA)</option>
                    <option value="EUR (€)">EUR (€)</option>
                    <option value="GBP (£)">GBP (£)</option>
                    <option value="CAD ($)">CAD (C$)</option>
                    <option value="AED (AED)">AED (AED)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Allocated Budget ({newTenantData.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newTenantData.allocatedBudget}
                    onChange={(e) => setNewTenantData({ ...newTenantData, allocatedBudget: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Tax Registration ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenantData.taxRegistrationId}
                    onChange={(e) => setNewTenantData({ ...newTenantData, taxRegistrationId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Cost Center Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenantData.costCenterCode}
                    onChange={(e) => setNewTenantData({ ...newTenantData, costCenterCode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Operating Region *
                </label>
                <input
                  type="text"
                  required
                  value={newTenantData.operatingRegion}
                  onChange={(e) => setNewTenantData({ ...newTenantData, operatingRegion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow hover:bg-indigo-700"
                >
                  Create & Activate Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
