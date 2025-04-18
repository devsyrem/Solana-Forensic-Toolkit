import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isValidSolanaAddress } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useWallet } from "@/hooks/useWallet";
import { useSolanaData } from "@/hooks/useSolanaData";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Wallet, BarChart2, Activity, TrendingUp } from "lucide-react";

// Import wallet analysis components
import FundingSourcesView from "@/components/wallet-analysis/FundingSourcesView";
import ActivityPatternsView from "@/components/wallet-analysis/ActivityPatternsView";
import EntityConnectionsView from "@/components/wallet-analysis/EntityConnectionsView";
import FundOriginsView from "@/components/wallet-analysis/FundOriginsView";

// Import transaction clustering components
import TransactionClusteringPanel from "@/components/transaction-clustering/TransactionClusteringPanel";

// Import entity labeling components
import EntityLabelingPanel from "@/components/entity-labeling/EntityLabelingPanel";

const DEFAULT_ADDRESS = "";

export default function Analytics() {
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState("");

  // Get wallet data
  const { wallet, transactions, isLoading, error: walletError, isValidAddress: isValid } = useWallet({ address });

  // Get analytics data
  const { timelineData, isLoading: isDataLoading } = useSolanaData({ address });

  // Sample data for charts when no wallet is selected
  const sampleData = [
    { name: 'May 1', value: 10 },
    { name: 'May 2', value: 15 },
    { name: 'May 3', value: 8 },
    { name: 'May 4', value: 12 },
    { name: 'May 5', value: 20 },
    { name: 'May 6', value: 14 },
    { name: 'May 7', value: 18 }
  ];

  const handleSearch = () => {
    if (!searchInput) {
      setError("Please enter a wallet address");
      return;
    }

    if (!isValidSolanaAddress(searchInput)) {
      setError("Please enter a valid Solana wallet address");
      return;
    }

    setError("");
    setAddress(searchInput);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Analytics Dashboard</h2>
        <p className="text-gray-400 mb-6">
          Analyze transaction patterns, volumes, and relationships on the Solana blockchain
        </p>

        <div className="max-w-lg mx-auto mb-8">
          <div className="relative">
            <Input
              type="text"
              placeholder="Enter a Solana wallet address"
              className="bg-solana-dark border border-solana-dark-lighter rounded-md py-3 pl-10 pr-4 text-white placeholder-gray-500 w-full"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Wallet className="h-5 w-5 text-gray-400" />
            </div>
            <Button 
              className="absolute inset-y-0 right-0 px-4 bg-solana-primary hover:bg-opacity-90"
              onClick={handleSearch}
            >
              Analyze
            </Button>
          </div>
          {error && <p className="text-solana-error text-sm mt-2">{error}</p>}
        </div>
      </div>

      {address ? (
        isLoading || isDataLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-[300px] w-full bg-solana-dark-light" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-[250px] w-full bg-solana-dark-light" />
              <Skeleton className="h-[250px] w-full bg-solana-dark-light" />
            </div>
          </div>
        ) : walletError ? (
          <Card className="bg-solana-dark-light border-solana-dark-lighter">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-solana-error mb-2">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-medium">Error Loading Wallet</h3>
              </div>
              <p className="text-gray-300">{walletError.message || "Failed to load wallet data. Please check the address and try again."}</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-solana-dark-light">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity Analysis</TabsTrigger>
              <TabsTrigger value="volume">Volume Analysis</TabsTrigger>
              <TabsTrigger value="relationships">Relationship Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Wallet Overview */}
              <Card className="bg-solana-dark-light border-solana-dark-lighter">
                <CardHeader>
                  <CardTitle className="text-white">Wallet Overview</CardTitle>
                  <CardDescription className="text-gray-400">Summary of wallet activity and statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-solana-dark rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Balance</div>
                      <div className="text-xl text-white font-medium">{wallet?.balance?.toFixed(4) || "0"} SOL</div>
                    </div>
                    <div className="bg-solana-dark rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Transactions</div>
                      <div className="text-xl text-white font-medium">{transactions?.length || "0"}</div>
                    </div>
                    <div className="bg-solana-dark rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">First Active</div>
                      <div className="text-xl text-white font-medium">
                        {transactions && transactions.length > 0 && transactions[transactions.length - 1].blockTime 
                          ? new Date(transactions[transactions.length - 1].blockTime * 1000).toLocaleDateString()
                          : "Unknown"}
                      </div>
                    </div>
                    <div className="bg-solana-dark rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Last Active</div>
                      <div className="text-xl text-white font-medium">
                        {transactions && transactions.length > 0 && transactions[0].blockTime 
                          ? new Date(transactions[0].blockTime * 1000).toLocaleDateString()
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Activity Chart */}
              <Card className="bg-solana-dark-light border-solana-dark-lighter">
                <CardHeader>
                  <CardTitle className="text-white">Transaction Activity</CardTitle>
                  <CardDescription className="text-gray-400">Number of transactions over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={timelineData || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#383A59" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#808080" 
                          tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        />
                        <YAxis stroke="#808080" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1E1E2E', borderColor: '#383A59' }}
                          labelStyle={{ color: '#FFFFFF' }}
                          itemStyle={{ color: '#FFFFFF' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="totalTransactions" stroke="#9945FF" activeDot={{ r: 8 }} name="Transactions" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {/* Activity Analysis */}
              <Card className="bg-solana-dark-light border-solana-dark-lighter">
                <CardHeader>
                  <CardTitle className="text-white">Activity by Transaction Type</CardTitle>
                  <CardDescription className="text-gray-400">Breakdown of transaction types over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={timelineData || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#383A59" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#808080" 
                          tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        />
                        <YAxis stroke="#808080" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1E1E2E', borderColor: '#383A59' }}
                          labelStyle={{ color: '#FFFFFF' }}
                          itemStyle={{ color: '#FFFFFF' }}
                        />
                        <Legend />
                        <Bar dataKey="transactionsByType.transfer" stackId="a" fill="#14F195" name="Transfers" />
                        <Bar dataKey="transactionsByType.swap" stackId="a" fill="#FFB800" name="Swaps" />
                        <Bar dataKey="transactionsByType.nft" stackId="a" fill="#FF5353" name="NFTs" />
                        <Bar dataKey="transactionsByType.defi" stackId="a" fill="#00C2FF" name="DeFi" />
                        <Bar dataKey="transactionsByType.other" stackId="a" fill="#383A59" name="Other" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="volume" className="space-y-6">
              {/* Transaction Volume Analysis */}
              <Card className="bg-solana-dark-light border-solana-dark-lighter">
                <CardHeader>
                  <CardTitle className="text-white">Wallet Activity Pattern</CardTitle>
                  <CardDescription className="text-gray-400">Transaction frequency by day of week and hour</CardDescription>
                </CardHeader>
                <CardContent className="text-center text-gray-300">
                  <Activity className="h-32 w-32 mx-auto mb-4 text-solana-primary opacity-50" />
                  <p>Advanced activity pattern analysis will be available in a future update.</p>
                  <p className="text-sm text-gray-400 mt-2">This feature is currently in development.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="relationships" className="space-y-6">
              {/* Wallet Analysis */}
              <Card className="bg-solana-dark-light border-solana-dark-lighter">
                <CardHeader>
                  <CardTitle className="text-white">Wallet Analysis</CardTitle>
                  <CardDescription className="text-gray-400">Advanced analysis of funding sources, activity patterns, and entity connections</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                  <div className="p-4 bg-solana-dark border-b border-solana-dark-lighter">
                    <Tabs defaultValue="funding-sources">
                      <TabsList className="bg-solana-dark-lighter">
                        <TabsTrigger value="funding-sources">Funding Sources</TabsTrigger>
                        <TabsTrigger value="activity-patterns">Activity Patterns</TabsTrigger>
                        <TabsTrigger value="entity-connections">Entity Connections</TabsTrigger>
                        <TabsTrigger value="fund-origins">Fund Origins</TabsTrigger>
                      </TabsList>
                      
                      <div className="mt-4">
                        <TabsContent value="funding-sources">
                          <div className="py-1">
                            {address && <FundingSourcesView address={address} />}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="activity-patterns">
                          <div className="py-1">
                            {address && <ActivityPatternsView address={address} />}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="entity-connections">
                          <div className="py-1">
                            {address && <EntityConnectionsView address={address} />}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="fund-origins">
                          <div className="py-1">
                            {address && <FundOriginsView address={address} />}
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
              {/* Transaction Clustering component */}
              {address && <TransactionClusteringPanel address={address} />}
              
              {/* Entity Labeling component */}
              {address && <EntityLabelingPanel address={address} />}
              
              {/* Network Analysis - Original content kept as a third card */}
              <Card className="bg-solana-dark-light border-solana-dark-lighter">
                <CardHeader>
                  <CardTitle className="text-white">Network Analysis</CardTitle>
                  <CardDescription className="text-gray-400">Wallet relationship and connection strength</CardDescription>
                </CardHeader>
                <CardContent className="text-center text-gray-300">
                  <TrendingUp className="h-32 w-32 mx-auto mb-4 text-solana-primary opacity-50" />
                  <p>Advanced network analysis will be available in a future update.</p>
                  <p className="text-sm text-gray-400 mt-2">This feature is currently in development.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )
      ) : (
        <div className="space-y-8">
          <Card className="bg-solana-dark-light border-solana-dark-lighter">
            <CardHeader>
              <CardTitle className="text-white">Search for a Wallet</CardTitle>
              <CardDescription className="text-gray-400">Enter a Solana wallet address above to view detailed analytics</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center p-8">
              <BarChart2 className="h-20 w-20 text-solana-primary opacity-40 mb-4" />
              <p className="text-gray-300 max-w-md">
                Discover transaction patterns, analyze activity over time, and gain insights into wallet behavior
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-solana-dark-light border-solana-dark-lighter">
              <CardHeader>
                <CardTitle className="text-white">Activity Analysis</CardTitle>
                <CardDescription className="text-gray-400">Understand transaction frequency over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={sampleData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#383A59" />
                      <XAxis dataKey="name" stroke="#808080" />
                      <YAxis stroke="#808080" />
                      <Tooltip contentStyle={{ backgroundColor: '#1E1E2E', borderColor: '#383A59', color: '#FFFFFF' }} />
                      <Line type="monotone" dataKey="value" stroke="#9945FF" dot={{ fill: '#9945FF' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-solana-dark-light border-solana-dark-lighter">
              <CardHeader>
                <CardTitle className="text-white">Volume Analysis</CardTitle>
                <CardDescription className="text-gray-400">Track transaction value over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sampleData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#383A59" />
                      <XAxis dataKey="name" stroke="#808080" />
                      <YAxis stroke="#808080" />
                      <Tooltip contentStyle={{ backgroundColor: '#1E1E2E', borderColor: '#383A59', color: '#FFFFFF' }} />
                      <Bar dataKey="value" fill="#14F195" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-solana-dark-light border-solana-dark-lighter">
              <CardHeader>
                <CardTitle className="text-white">Entity Analysis</CardTitle>
                <CardDescription className="text-gray-400">Identify related wallets and entities</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-300">
                <div className="h-[200px] flex flex-col items-center justify-center">
                  <svg className="w-16 h-16 text-solana-primary opacity-40 mb-4" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32 96H96C96 104.837 88.837 112 80 112H32C23.163 112 16 104.837 16 96C16 87.163 23.163 80 32 80H80C88.837 80 96 72.837 96 64C96 55.163 88.837 48 80 48H32C23.163 48 16 40.837 16 32C16 23.163 23.163 16 32 16H80C88.837 16 96 23.163 96 32H32C23.163 32 16 39.163 16 48C16 56.837 23.163 64 32 64H80C88.837 64 96 71.163 96 80C96 88.837 88.837 96 80 96H32Z" fill="currentColor"/>
                  </svg>
                  <p className="text-sm">Analyze entity relationships</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
