import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Wallet, BarChart2, Activity, RefreshCcw, ArrowRight, BookOpen, Play, Search, Filter, Share2 } from "lucide-react";

export default function Help() {
  return (
    <div className="space-y-10">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-4">Help Center</h2>
        <p className="text-lg text-gray-300 mb-8">
          Learn how to use SolFlow to visualize and analyze Solana blockchain transactions
        </p>
      </div>

      <Tabs defaultValue="tutorials" className="space-y-8">
        <TabsList className="mx-auto flex justify-center bg-solana-dark-light">
          <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
          <TabsTrigger value="faq">Frequently Asked Questions</TabsTrigger>
          <TabsTrigger value="glossary">Blockchain Glossary</TabsTrigger>
        </TabsList>

        <TabsContent value="tutorials" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-solana-dark-light border-solana-dark-lighter">
              <CardHeader>
                <div className="w-12 h-12 bg-solana-primary bg-opacity-20 rounded-full flex items-center justify-center mb-2">
                  <Search className="h-6 w-6 text-solana-primary" />
                </div>
                <CardTitle className="text-white">Getting Started</CardTitle>
                <CardDescription className="text-gray-400">Learn the basics of SolFlow visualization</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-solana-secondary" />
                    <span>Introduction to SolFlow</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-solana-secondary" />
                    <span>Searching for a wallet</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-solana-secondary" />
                    <span>Understanding the visualization</span>
                  </li>
                </ul>
                <Button variant="outline" className="mt-4 w-full border-solana-primary text-solana-primary hover:bg-solana-primary hover:bg-opacity-10">
                  <Play className="h-4 w-4 mr-2" /> Watch Tutorial
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-solana-dark-light border-solana-dark-lighter">
              <CardHeader>
                <div className="w-12 h-12 bg-solana-secondary bg-opacity-20 rounded-full flex items-center justify-center mb-2">
                  <Filter className="h-6 w-6 text-solana-secondary" />
                </div>
                <CardTitle className="text-white">Using Filters</CardTitle>
                <CardDescription className="text-gray-400">Master advanced filtering options</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-solana-secondary" />
                    <span>Filtering by date range</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-solana-secondary" />
                    <span>Filtering by transaction type</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-solana-secondary" />
                    <span>Filtering by amount</span>
                  </li>
                </ul>
                <Button variant="outline" className="mt-4 w-full border-solana-primary text-solana-primary hover:bg-solana-primary hover:bg-opacity-10">
                  <Play className="h-4 w-4 mr-2" /> Watch Tutorial
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-solana-dark-light border-solana-dark-lighter">
              <CardHeader>
                <div className="w-12 h-12 bg-solana-info bg-opacity-20 rounded-full flex items-center justify-center mb-2">
                  <Share2 className="h-6 w-6 text-solana-info" />
                </div>
                <CardTitle className="text-white">Sharing & Analysis</CardTitle>
                <CardDescription className="text-gray-400">Advanced features and sharing options</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-solana-secondary" />
                    <span>Understanding entity clustering</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-solana-secondary" />
                    <span>Reading timeline data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-solana-secondary" />
                    <span>Saving and sharing visualizations</span>
                  </li>
                </ul>
                <Button variant="outline" className="mt-4 w-full border-solana-primary text-solana-primary hover:bg-solana-primary hover:bg-opacity-10">
                  <Play className="h-4 w-4 mr-2" /> Watch Tutorial
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-solana-dark-light border-solana-dark-lighter p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">Interactive Onboarding</h3>
                <p className="text-gray-300 mb-4">
                  New to blockchain analysis? Our interactive tutorial walks you through SolFlow step by step, explaining key concepts and features.
                </p>
                <Button className="bg-solana-secondary text-solana-dark hover:bg-opacity-90">
                  Start Interactive Tutorial
                </Button>
              </div>
              <div className="flex justify-center">
                <svg className="w-64 h-64 text-solana-primary opacity-20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 96H96C96 104.837 88.837 112 80 112H32C23.163 112 16 104.837 16 96C16 87.163 23.163 80 32 80H80C88.837 80 96 72.837 96 64C96 55.163 88.837 48 80 48H32C23.163 48 16 40.837 16 32C16 23.163 23.163 16 32 16H80C88.837 16 96 23.163 96 32H32C23.163 32 16 39.163 16 48C16 56.837 23.163 64 32 64H80C88.837 64 96 71.163 96 80C96 88.837 88.837 96 80 96H32Z" fill="currentColor"/>
                </svg>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <Card className="bg-solana-dark-light border-solana-dark-lighter">
            <CardHeader>
              <CardTitle className="text-white">Frequently Asked Questions</CardTitle>
              <CardDescription className="text-gray-400">
                Common questions about SolFlow and blockchain transaction analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-solana-dark-lighter">
                  <AccordionTrigger className="text-white">What is SolFlow and how does it work?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    SolFlow is a tool that visualizes transaction flows on the Solana blockchain. It fetches data from 
                    the Solana blockchain and presents it in an interactive, visual format. This helps you understand 
                    how funds move between wallets, identify patterns, and analyze transaction history without needing 
                    technical blockchain knowledge.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-solana-dark-lighter">
                  <AccordionTrigger className="text-white">What information can I see about a wallet?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    When you enter a wallet address, SolFlow shows you:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Transaction flow visualization showing connections to other wallets</li>
                      <li>Transaction history and patterns over time</li>
                      <li>Wallet balance and activity summary</li>
                      <li>Related wallets and entity clustering information</li>
                      <li>Transaction types breakdown (transfers, swaps, NFTs, etc.)</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-solana-dark-lighter">
                  <AccordionTrigger className="text-white">How can I filter transactions in the visualization?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    SolFlow provides several filtering options:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Date range filters to focus on specific time periods</li>
                      <li>Transaction amount filters to focus on transactions of certain sizes</li>
                      <li>Transaction type filters (transfers, swaps, NFTs, DeFi)</li>
                      <li>Program filters to focus on specific Solana programs/protocols</li>
                    </ul>
                    Use these filters in the sidebar to refine your visualization and focus on the data that matters most to you.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-solana-dark-lighter">
                  <AccordionTrigger className="text-white">What is entity clustering and how does it work?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Entity clustering is a feature that identifies groups of wallets that likely belong to the same entity. 
                    It works by analyzing transaction patterns, frequency, and relationships between wallets. 
                    
                    For example, if several wallets frequently transact with each other in specific patterns, 
                    they might be identified as belonging to an exchange, a DeFi protocol, or a single user with multiple wallets. 
                    This helps provide context to the transaction flows you're seeing.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-solana-dark-lighter">
                  <AccordionTrigger className="text-white">Is my data private when using SolFlow?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    SolFlow only accesses on-chain data that is already public on the Solana blockchain. 
                    We don't collect or store any personal information beyond what's needed for basic functionality.
                    
                    If you create an account to save visualizations, we store only the minimal data needed for that feature. 
                    Your search history and saved visualizations are visible only to you unless you explicitly choose to share them.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6" className="border-solana-dark-lighter">
                  <AccordionTrigger className="text-white">How up-to-date is the data in SolFlow?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    SolFlow fetches data directly from the Solana blockchain in real-time when you search for a wallet. 
                    The visualization shows the latest available data, typically with only a few seconds of delay from 
                    the actual blockchain state.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="glossary" className="space-y-6">
          <Card className="bg-solana-dark-light border-solana-dark-lighter">
            <CardHeader>
              <CardTitle className="text-white">Blockchain Glossary</CardTitle>
              <CardDescription className="text-gray-400">
                Key blockchain terms explained in plain language
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">Blockchain</h4>
                  <p className="text-gray-300 text-sm">
                    A digital ledger that records transactions across many computers so that the record cannot be altered retroactively. In Solana's case, it's a fast, secure network for applications and digital assets.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">Wallet</h4>
                  <p className="text-gray-300 text-sm">
                    A digital tool that allows users to interact with a blockchain. It stores your private keys, which are needed to access and manage your cryptocurrency and execute transactions.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">SOL</h4>
                  <p className="text-gray-300 text-sm">
                    The native cryptocurrency of the Solana blockchain. It's used to pay for transaction fees, as a form of value transfer, and for network security through staking.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">Transaction</h4>
                  <p className="text-gray-300 text-sm">
                    An action recorded on the blockchain, such as sending SOL or tokens between wallets, interacting with a smart contract, or creating a new account.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">Smart Contract</h4>
                  <p className="text-gray-300 text-sm">
                    Self-executing code on the blockchain with the terms of an agreement directly written into the code. On Solana, these are called "programs" and enable everything from NFTs to decentralized finance.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">Token</h4>
                  <p className="text-gray-300 text-sm">
                    A digital asset created on a blockchain. On Solana, tokens follow the SPL (Solana Program Library) Token standard and can represent anything from currencies to digital collectibles.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">NFT (Non-Fungible Token)</h4>
                  <p className="text-gray-300 text-sm">
                    A unique digital asset that represents ownership of a specific item or piece of content. Unlike cryptocurrencies, each NFT has distinct information that makes it irreplaceable.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">DeFi (Decentralized Finance)</h4>
                  <p className="text-gray-300 text-sm">
                    Financial services and products built on blockchain technology that operate without centralized intermediaries like banks. Includes lending, borrowing, trading, and more.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">Swap</h4>
                  <p className="text-gray-300 text-sm">
                    The exchange of one cryptocurrency or token for another, typically through a decentralized exchange protocol on the blockchain.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">Block</h4>
                  <p className="text-gray-300 text-sm">
                    A collection of transaction data added to the blockchain. On Solana, blocks are produced quickly (approximately every 400ms) making it one of the fastest blockchains.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">Program ID</h4>
                  <p className="text-gray-300 text-sm">
                    A unique identifier for a program (smart contract) on the Solana blockchain. In SolFlow, you can filter transactions by program ID to focus on specific types of activity.
                  </p>
                </div>
                <div>
                  <h4 className="text-solana-secondary font-medium mb-2">Signature</h4>
                  <p className="text-gray-300 text-sm">
                    A unique identifier for a transaction on the Solana blockchain. Every transaction has a signature that can be used to look up details about that specific transaction.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-solana-dark-light rounded-lg p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">Ready to Explore Transactions?</h3>
        <p className="text-gray-300 mb-6 max-w-xl mx-auto">
          Now that you understand how SolFlow works, start visualizing transaction flows on the Solana blockchain
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/visualization">
            <Button className="bg-solana-primary text-white hover:bg-opacity-90">
              Start Visualizing
            </Button>
          </Link>
          <Link href="/analytics">
            <Button variant="outline" className="border-solana-primary text-solana-primary hover:bg-solana-primary hover:bg-opacity-10">
              Explore Analytics
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
