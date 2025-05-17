import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RefreshCw, TrendingUp, Wallet, History } from "lucide-react";

export interface GameRound {
  id: number;
  roundNumber: number;
  startTime: string;
  endTime: string;
  result: 'red' | 'green' | 'violet' | '';
  multiplier: number;
  createdAt: string;
}

export interface Bet {
  id: number;
  userId: number;
  roundId: number;
  color: 'red' | 'green' | 'violet';
  amount: number;
  potential: number;
  status: 'pending' | 'won' | 'lost';
  profit: number | null;
  createdAt: string;
}

export interface Transaction {
  id: number;
  userId: number;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'win' | 'bet';
  reference: string | null;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export interface WalletData {
  balance: number;
}

export interface DashboardProps {
  activeTab?: "game" | "history" | "wallet";
}

export default function Dashboard({ activeTab = "game" }: DashboardProps) {
  const [selectedColor, setSelectedColor] = useState<"red" | "green" | "violet" | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  
  // Fetch active game round
  const { 
    data: activeRound,
    isLoading: isLoadingRound,
    refetch: refetchRound
  } = useQuery({
    queryKey: ['/api/game/active'],
    refetchInterval: 5000
  });
  
  // Fetch game history
  const { 
    data: gameHistory,
    isLoading: isLoadingHistory 
  } = useQuery({
    queryKey: ['/api/game/history'],
    refetchInterval: 10000
  });
  
  // Fetch user balance
  const { 
    data: walletData,
    isLoading: isLoadingWallet,
    refetch: refetchWallet
  } = useQuery({
    queryKey: ['/api/wallet/balance']
  });
  
  // Fetch user transactions
  const { 
    data: transactions,
    isLoading: isLoadingTransactions 
  } = useQuery({
    queryKey: ['/api/wallet/transactions']
  });
  
  // Fetch user bets
  const { 
    data: userBets,
    isLoading: isLoadingBets,
    refetch: refetchBets
  } = useQuery({
    queryKey: ['/api/bets/user']
  });
  
  // Update countdown timer
  useEffect(() => {
    if (!activeRound) return;
    
    const endTime = new Date(activeRound.endTime).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime - now;
      
      if (distance <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
        
        // Refetch after round ends
        setTimeout(() => {
          refetchRound();
          refetchBets();
          refetchWallet();
        }, 2000);
      } else {
        setTimeLeft(Math.floor(distance / 1000));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeRound, refetchRound, refetchBets, refetchWallet]);
  
  // Handle placing a bet
  const placeBet = async () => {
    if (!selectedColor || !activeRound || !walletData) return;
    
    // Validate bet amount
    if (betAmount <= 0 || betAmount > walletData.balance) {
      alert("Invalid bet amount");
      return;
    }
    
    try {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roundId: activeRound.id,
          color: selectedColor,
          amount: betAmount
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to place bet");
      }
      
      // Refresh data
      refetchBets();
      refetchWallet();
      
      // Reset selected color
      setSelectedColor(null);
      
    } catch (error) {
      console.error("Error placing bet:", error);
      alert(error instanceof Error ? error.message : "Failed to place bet");
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Color Trading Platform</h1>
      
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="game" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Game
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="wallet" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Wallet
          </TabsTrigger>
        </TabsList>
        
        {/* Game Tab */}
        <TabsContent value="game" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Game Round Info */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Current Round</span>
                  {activeRound && (
                    <Badge variant="outline">#{activeRound.roundNumber}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Place your bets before the timer ends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRound ? (
                  <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : !activeRound ? (
                  <div className="text-center p-8">
                    <p>No active round. Please try again later.</p>
                    <Button 
                      onClick={() => refetchRound()} 
                      variant="outline" 
                      className="mt-4"
                    >
                      Refresh
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Timer */}
                    <div className="flex flex-col items-center mb-8">
                      <div className="text-6xl font-bold mb-2">{timeLeft}</div>
                      <p className="text-sm text-muted-foreground">seconds remaining</p>
                    </div>
                    
                    {/* Color Selection */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <Button 
                        className="bg-red-600 hover:bg-red-700 h-20"
                        variant={selectedColor === "red" ? "default" : "outline"}
                        onClick={() => setSelectedColor("red")}
                        disabled={timeLeft === 0}
                      >
                        Red (2x)
                      </Button>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 h-20"
                        variant={selectedColor === "green" ? "default" : "outline"}
                        onClick={() => setSelectedColor("green")}
                        disabled={timeLeft === 0}
                      >
                        Green (2x)
                      </Button>
                      <Button 
                        className="bg-violet-600 hover:bg-violet-700 h-20"
                        variant={selectedColor === "violet" ? "default" : "outline"}
                        onClick={() => setSelectedColor("violet")}
                        disabled={timeLeft === 0}
                      >
                        Violet (4x)
                      </Button>
                    </div>
                    
                    {/* Bet Amount */}
                    <div className="flex flex-col space-y-4 mb-8">
                      <label className="text-sm font-medium">Bet Amount</label>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline"
                          onClick={() => setBetAmount(Math.max(1, betAmount - 10))}
                          disabled={betAmount <= 1}
                        >
                          -
                        </Button>
                        <input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(Number(e.target.value))}
                          min="1"
                          max={walletData?.balance || 1000}
                          className="flex-1 p-2 text-center border rounded-md"
                        />
                        <Button 
                          variant="outline"
                          onClick={() => setBetAmount(betAmount + 10)}
                          disabled={!walletData || betAmount >= walletData.balance}
                        >
                          +
                        </Button>
                      </div>
                      {walletData && (
                        <div className="text-sm text-muted-foreground text-right">
                          Balance: ₹ {walletData.balance.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                    
                    {/* Place Bet Button */}
                    <Button 
                      className="w-full"
                      disabled={!selectedColor || timeLeft === 0 || !walletData || betAmount > walletData.balance}
                      onClick={placeBet}
                    >
                      Place Bet
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Recent Bets */}
            <Card>
              <CardHeader>
                <CardTitle>Your Recent Bets</CardTitle>
                <CardDescription>Latest betting activity</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                {isLoadingBets ? (
                  <div className="flex justify-center p-4">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : !userBets || userBets.length === 0 ? (
                  <div className="text-center p-4">
                    <p>No bets placed yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userBets.map((bet: any) => (
                      <div 
                        key={bet.id} 
                        className="flex justify-between items-center border-b pb-2"
                      >
                        <div>
                          <div className="flex items-center">
                            <div 
                              className={`w-3 h-3 rounded-full mr-2 ${
                                bet.color === 'red' ? 'bg-red-600' : 
                                bet.color === 'green' ? 'bg-green-600' : 
                                'bg-violet-600'
                              }`}
                            />
                            <span className="capitalize">{bet.color}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Amount: {bet.amount.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <Badge 
                            variant={
                              bet.status === 'won' ? 'success' : 
                              bet.status === 'lost' ? 'destructive' : 
                              'outline'
                            }
                          >
                            {bet.status}
                          </Badge>
                          {bet.status === 'won' && bet.profit && (
                            <div className="text-sm text-green-500 text-right">
                              +{bet.profit.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Game History Display */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Results</CardTitle>
              <CardDescription>Last 10 rounds</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex justify-center p-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : !gameHistory || gameHistory.length === 0 ? (
                <div className="text-center p-4">
                  <p>No game history yet.</p>
                </div>
              ) : (
                <div className="flex overflow-x-auto py-2 gap-2">
                  {gameHistory.map((round: any) => (
                    <div 
                      key={round.id}
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        round.result === 'red' ? 'bg-red-600' : 
                        round.result === 'green' ? 'bg-green-600' : 
                        'bg-violet-600'
                      }`}
                      title={`Round #${round.roundNumber}: ${round.result.toUpperCase()}`}
                    >
                      {round.roundNumber}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Game History</CardTitle>
              <CardDescription>Recent game results</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : !gameHistory || gameHistory.length === 0 ? (
                <div className="text-center p-8">
                  <p>No game history yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gameHistory.map((round: any) => (
                    <div 
                      key={round.id} 
                      className="flex justify-between items-center border-b pb-4"
                    >
                      <div>
                        <div className="font-medium">Round #{round.roundNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(round.endTime).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div 
                          className={`w-6 h-6 rounded-full mr-2 ${
                            round.result === 'red' ? 'bg-red-600' : 
                            round.result === 'green' ? 'bg-green-600' : 
                            'bg-violet-600'
                          }`}
                        />
                        <span className="capitalize">{round.result}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Your Betting History</CardTitle>
              <CardDescription>All your placed bets</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBets ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : !userBets || userBets.length === 0 ? (
                <div className="text-center p-8">
                  <p>No bets placed yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBets.map((bet: any) => (
                    <div 
                      key={bet.id} 
                      className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b pb-4"
                    >
                      <div>
                        <div className="font-medium">Round #{bet.roundId}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(bet.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div 
                          className={`w-4 h-4 rounded-full mr-2 ${
                            bet.color === 'red' ? 'bg-red-600' : 
                            bet.color === 'green' ? 'bg-green-600' : 
                            'bg-violet-600'
                          }`}
                        />
                        <span className="capitalize">{bet.color}</span>
                      </div>
                      <div>
                        <div>Amount: {bet.amount.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          Potential: {bet.potential.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={
                            bet.status === 'won' ? 'success' : 
                            bet.status === 'lost' ? 'destructive' : 
                            'outline'
                          }
                        >
                          {bet.status}
                        </Badge>
                        {bet.status === 'won' && bet.profit && (
                          <div className="text-sm text-green-500">
                            +{bet.profit.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Wallet Tab */}
        <TabsContent value="wallet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Wallet</CardTitle>
              <CardDescription>Current balance and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWallet ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : !walletData ? (
                <div className="text-center p-8">
                  <p>Error loading wallet data.</p>
                  <Button 
                    onClick={() => refetchWallet()} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Refresh
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <div className="text-4xl font-bold mb-2">₹ {walletData.balance.toLocaleString('en-IN')}</div>
                  <p className="text-muted-foreground mb-6">Current Balance</p>
                  
                  {/* Deposit Options */}
                  <div className="w-full space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => window.alert('Added ₹100 to your wallet')}>+ ₹100</Button>
                      <Button variant="outline" onClick={() => window.alert('Added ₹500 to your wallet')}>+ ₹500</Button>
                      <Button variant="outline" onClick={() => window.alert('Added ₹1,000 to your wallet')}>+ ₹1,000</Button>
                      <Button variant="outline" onClick={() => window.alert('Added ₹5,000 to your wallet')}>+ ₹5,000</Button>
                    </div>
                    
                    {/* Withdraw Option */}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.alert('Withdrawal request submitted! It will be processed within 24 hours.')}
                    >
                      Withdraw Funds
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Your wallet activity</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : !transactions || transactions.length === 0 ? (
                <div className="text-center p-8">
                  <p>No transactions yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx: any) => (
                    <div 
                      key={tx.id} 
                      className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b pb-4"
                    >
                      <div>
                        <div className="font-medium capitalize">{tx.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {tx.reference || "-"}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div>{new Date(tx.createdAt).toLocaleString()}</div>
                      </div>
                      <div className={`text-right font-medium ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}