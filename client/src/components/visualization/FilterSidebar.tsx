import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isValidSolanaAddress } from "@/lib/utils";

interface FilterSidebarProps {
  walletAddress: string;
  onWalletChange: (address: string) => void;
  onFiltersChange: (filters: any) => void;
  onFilterApply: () => void;
  onFilterReset: () => void;
}

export default function FilterSidebar({
  walletAddress,
  onWalletChange,
  onFiltersChange,
  onFilterApply,
  onFilterReset
}: FilterSidebarProps) {
  const [address, setAddress] = useState(walletAddress);
  const [dateRange, setDateRange] = useState({
    startDate: null as Date | null,
    endDate: null as Date | null
  });
  const [amountRange, setAmountRange] = useState({
    minAmount: 0.05,
    maxAmount: 100
  });
  const [sliderValues, setSliderValues] = useState([10, 80]); // Percentage values for slider
  const [transactionTypes, setTransactionTypes] = useState({
    transfer: true,
    swap: true,
    nft: true,
    defi: false,
    other: false
  });
  const [programs, setPrograms] = useState({
    tokenProgram: true,
    serum: true,
    raydium: false,
    mango: false,
    metaplex: true
  });

  // Handle address change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
  };

  // Handle address submit
  const handleAddressSubmit = () => {
    if (isValidSolanaAddress(address)) {
      onWalletChange(address);
    }
  };

  // Handle date range change
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (!value) {
      setDateRange({
        ...dateRange,
        [type === 'start' ? 'startDate' : 'endDate']: null
      });
      return;
    }

    setDateRange({
      ...dateRange,
      [type === 'start' ? 'startDate' : 'endDate']: new Date(value)
    });
  };

  // Handle amount range slider change
  const handleSliderChange = (values: number[]) => {
    setSliderValues(values);
    
    // Convert percentage values to actual SOL amounts
    const min = 0.01;
    const max = 1000;
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    
    const minAmount = Math.exp(logMin + (values[0] / 100) * (logMax - logMin));
    const maxAmount = Math.exp(logMin + (values[1] / 100) * (logMax - logMin));
    
    setAmountRange({
      minAmount: parseFloat(minAmount.toFixed(2)),
      maxAmount: parseFloat(maxAmount.toFixed(2))
    });
  };

  // Handle transaction type change
  const handleTypeChange = (type: keyof typeof transactionTypes, checked: boolean) => {
    setTransactionTypes({
      ...transactionTypes,
      [type]: checked
    });
  };

  // Handle program change
  const handleProgramChange = (program: keyof typeof programs, checked: boolean) => {
    setPrograms({
      ...programs,
      [program]: checked
    });
  };

  // Select all programs
  const selectAllPrograms = () => {
    const newPrograms = { ...programs };
    
    Object.keys(newPrograms).forEach(key => {
      newPrograms[key as keyof typeof programs] = true;
    });
    
    setPrograms(newPrograms);
  };

  // Update filters when any filter changes
  useEffect(() => {
    onFiltersChange({
      dateRange,
      amountRange,
      transactionTypes: Object.entries(transactionTypes)
        .filter(([_, value]) => value)
        .map(([key]) => key),
      programs: Object.entries(programs)
        .filter(([_, value]) => value)
        .map(([key]) => key)
    });
  }, [dateRange, amountRange, transactionTypes, programs, onFiltersChange]);

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Wallet Input */}
      <div className="bg-solana-dark-light rounded-lg p-4">
        <h3 className="font-medium text-white mb-3">Search Wallet</h3>
        <div className="relative">
          <Input
            type="text"
            className="w-full bg-solana-dark border border-solana-dark-lighter rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-solana-primary focus:border-solana-primary"
            placeholder="Wallet address or name"
            value={address}
            onChange={handleAddressChange}
            onKeyDown={(e) => e.key === 'Enter' && handleAddressSubmit()}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button 
              type="button" 
              className="text-gray-400 hover:text-white"
              aria-label="Scan QR code"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v-4m6 0H4m12 6h-2m-6 0H4m6 6h2m-2 0h2" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-solana-secondary">
          <button className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add comparison wallet
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-solana-dark-light rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-white">Date Range</h3>
          <div className="relative">
            <select 
              className="text-gray-300 hover:text-white text-sm bg-transparent focus:outline-none"
              onChange={(e) => {
                const now = new Date();
                let startDate = null;
                
                switch (e.target.value) {
                  case "1d":
                    startDate = new Date(now.setDate(now.getDate() - 1));
                    break;
                  case "7d":
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                  case "30d":
                    startDate = new Date(now.setDate(now.getDate() - 30));
                    break;
                  case "90d":
                    startDate = new Date(now.setDate(now.getDate() - 90));
                    break;
                  case "1y":
                    startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
                  default:
                    startDate = null;
                }
                
                setDateRange({
                  startDate,
                  endDate: new Date()
                });
              }}
            >
              <option value="">Custom</option>
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="block text-xs text-gray-400 mb-1">Start Date</Label>
              <Input
                type="date"
                className="w-full bg-solana-dark border border-solana-dark-lighter rounded-md py-1.5 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-solana-primary focus:border-solana-primary"
                value={dateRange.startDate ? dateRange.startDate.toISOString().slice(0, 10) : ""}
                onChange={(e) => handleDateChange('start', e.target.value)}
              />
            </div>
            <div>
              <Label className="block text-xs text-gray-400 mb-1">End Date</Label>
              <Input
                type="date"
                className="w-full bg-solana-dark border border-solana-dark-lighter rounded-md py-1.5 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-solana-primary focus:border-solana-primary"
                value={dateRange.endDate ? dateRange.endDate.toISOString().slice(0, 10) : ""}
                onChange={(e) => handleDateChange('end', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Amount Filter */}
      <div className="bg-solana-dark-light rounded-lg p-4">
        <h3 className="font-medium text-white mb-3">Transaction Amount</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Min: {amountRange.minAmount} SOL</span>
            <span className="text-xs text-gray-400">Max: {amountRange.maxAmount} SOL</span>
          </div>
          <div className="relative pt-1">
            <Slider
              value={sliderValues}
              max={100}
              step={1}
              onValueChange={handleSliderChange}
              className="my-4"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="block text-xs text-gray-400 mb-1">Min Amount</Label>
              <div className="relative">
                <Input
                  type="text"
                  className="w-full bg-solana-dark border border-solana-dark-lighter rounded-md py-1.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-solana-primary focus:border-solana-primary"
                  placeholder="0.00"
                  value={amountRange.minAmount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      setAmountRange({ ...amountRange, minAmount: value });
                    }
                  }}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-sm">SOL</span>
                </div>
              </div>
            </div>
            <div>
              <Label className="block text-xs text-gray-400 mb-1">Max Amount</Label>
              <div className="relative">
                <Input
                  type="text"
                  className="w-full bg-solana-dark border border-solana-dark-lighter rounded-md py-1.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-solana-primary focus:border-solana-primary"
                  placeholder="0.00"
                  value={amountRange.maxAmount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value > 0) {
                      setAmountRange({ ...amountRange, maxAmount: value });
                    }
                  }}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-sm">SOL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Type Filter */}
      <div className="bg-solana-dark-light rounded-lg p-4">
        <h3 className="font-medium text-white mb-3">Transaction Types</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox
              id="tx-transfer"
              checked={transactionTypes.transfer}
              onCheckedChange={(checked) => handleTypeChange('transfer', checked as boolean)}
              className="h-4 w-4 text-solana-primary focus:ring-solana-primary border-solana-dark-lighter rounded bg-solana-dark"
            />
            <Label htmlFor="tx-transfer" className="ml-2 block text-sm text-gray-300">
              Token Transfers
            </Label>
          </div>
          <div className="flex items-center">
            <Checkbox
              id="tx-swap"
              checked={transactionTypes.swap}
              onCheckedChange={(checked) => handleTypeChange('swap', checked as boolean)}
              className="h-4 w-4 text-solana-primary focus:ring-solana-primary border-solana-dark-lighter rounded bg-solana-dark"
            />
            <Label htmlFor="tx-swap" className="ml-2 block text-sm text-gray-300">
              Swaps
            </Label>
          </div>
          <div className="flex items-center">
            <Checkbox
              id="tx-nft"
              checked={transactionTypes.nft}
              onCheckedChange={(checked) => handleTypeChange('nft', checked as boolean)}
              className="h-4 w-4 text-solana-primary focus:ring-solana-primary border-solana-dark-lighter rounded bg-solana-dark"
            />
            <Label htmlFor="tx-nft" className="ml-2 block text-sm text-gray-300">
              NFT Transactions
            </Label>
          </div>
          <div className="flex items-center">
            <Checkbox
              id="tx-defi"
              checked={transactionTypes.defi}
              onCheckedChange={(checked) => handleTypeChange('defi', checked as boolean)}
              className="h-4 w-4 text-solana-primary focus:ring-solana-primary border-solana-dark-lighter rounded bg-solana-dark"
            />
            <Label htmlFor="tx-defi" className="ml-2 block text-sm text-gray-300">
              DeFi Interactions
            </Label>
          </div>
          <div className="flex items-center">
            <Checkbox
              id="tx-other"
              checked={transactionTypes.other}
              onCheckedChange={(checked) => handleTypeChange('other', checked as boolean)}
              className="h-4 w-4 text-solana-primary focus:ring-solana-primary border-solana-dark-lighter rounded bg-solana-dark"
            />
            <Label htmlFor="tx-other" className="ml-2 block text-sm text-gray-300">
              Other
            </Label>
          </div>
        </div>
      </div>

      {/* Program Filter */}
      <div className="bg-solana-dark-light rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-white">Programs</h3>
          <button 
            className="text-xs text-solana-secondary"
            onClick={selectAllPrograms}
          >
            Select All
          </button>
        </div>
        <ScrollArea className="h-48 pr-2">
          <div className="space-y-2">
            <div className="flex items-center">
              <Checkbox
                id="prog-token"
                checked={programs.tokenProgram}
                onCheckedChange={(checked) => handleProgramChange('tokenProgram', checked as boolean)}
                className="h-4 w-4 text-solana-primary focus:ring-solana-primary border-solana-dark-lighter rounded bg-solana-dark"
              />
              <Label htmlFor="prog-token" className="ml-2 block text-sm text-gray-300">
                Token Program
              </Label>
            </div>
            <div className="flex items-center">
              <Checkbox
                id="prog-serum"
                checked={programs.serum}
                onCheckedChange={(checked) => handleProgramChange('serum', checked as boolean)}
                className="h-4 w-4 text-solana-primary focus:ring-solana-primary border-solana-dark-lighter rounded bg-solana-dark"
              />
              <Label htmlFor="prog-serum" className="ml-2 block text-sm text-gray-300">
                Serum
              </Label>
            </div>
            <div className="flex items-center">
              <Checkbox
                id="prog-raydium"
                checked={programs.raydium}
                onCheckedChange={(checked) => handleProgramChange('raydium', checked as boolean)}
                className="h-4 w-4 text-solana-primary focus:ring-solana-primary border-solana-dark-lighter rounded bg-solana-dark"
              />
              <Label htmlFor="prog-raydium" className="ml-2 block text-sm text-gray-300">
                Raydium
              </Label>
            </div>
            <div className="flex items-center">
              <Checkbox
                id="prog-mango"
                checked={programs.mango}
                onCheckedChange={(checked) => handleProgramChange('mango', checked as boolean)}
                className="h-4 w-4 text-solana-primary focus:ring-solana-primary border-solana-dark-lighter rounded bg-solana-dark"
              />
              <Label htmlFor="prog-mango" className="ml-2 block text-sm text-gray-300">
                Mango Markets
              </Label>
            </div>
            <div className="flex items-center">
              <Checkbox
                id="prog-metaplex"
                checked={programs.metaplex}
                onCheckedChange={(checked) => handleProgramChange('metaplex', checked as boolean)}
                className="h-4 w-4 text-solana-primary focus:ring-solana-primary border-solana-dark-lighter rounded bg-solana-dark"
              />
              <Label htmlFor="prog-metaplex" className="ml-2 block text-sm text-gray-300">
                Metaplex
              </Label>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          className="px-4 py-2 bg-solana-dark-lighter text-gray-300 hover:bg-solana-dark-light transition"
          onClick={onFilterReset}
        >
          Reset Filters
        </Button>
        <Button
          className="px-4 py-2 bg-solana-primary text-white rounded-md hover:bg-opacity-90 transition"
          onClick={onFilterApply}
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
