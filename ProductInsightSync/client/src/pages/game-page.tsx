import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SidebarLayout from "@/layouts/sidebar-layout";
import { useToast } from "@/hooks/use-toast";
import { CandlestickChart, Timer, Check, X } from "lucide-react";

export default function GamePage() {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [gameStarted, setGameStarted] = useState(false);
  const [isRoundEnding, setIsRoundEnding] = useState(false);
  
  // Get active game round
  const { data: activeRound, isLoading: loadingRound } = useQuery({
    queryKey: ['/api/game/active'],
    refetchInterval: 1000,
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/game/active');
        return await response.json();
      } catch (error) {
        return null;
      }
    },
  });
  
  // Get wallet balance
  const { data: walletData, refetch: refetchWallet } = useQuery({
    queryKey: ['/api/wallet/balance'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/wallet/balance');
        return await response.json();
      } catch (error) {
        return null;
      }
    },
  });
  
  // Get user bets for current round
  const { data: userBets, refetch: refetchBets } = useQuery({
    queryKey: ['/api/bets/user'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/bets/user');
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  // Get recent rounds history
  const { data: roundsHistory } = useQuery({
    queryKey: ['/api/game/history'],
    refetchInterval: 10000,
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/game/history');
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });
  
  // Calculate time left in current round
  useEffect(() => {
    if (activeRound?.endTime) {
      const interval = setInterval(() => {
        const endTime = new Date(activeRound.endTime).getTime();
        const now = Date.now();
        const secondsLeft = Math.max(0, Math.floor((endTime - now) / 1000));
        
        setTimeLeft(secondsLeft);
        
        if (secondsLeft <= 5 && secondsLeft > 0) {
          setIsRoundEnding(true);
        } else if (secondsLeft === 0) {
          setSelectedColor(null);
          setIsRoundEnding(false);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [activeRound]);
  
  // Handle placing a bet
  const placeBet = async () => {
    if (!selectedColor || !activeRound?.id || betAmount <= 0) {
      toast({
        title: "Cannot Place Bet",
        description: "Please select a color and valid amount",
        variant: "destructive",
      });
      return;
    }
    
    if (timeLeft <= 5) {
      toast({
        title: "Time's Almost Up",
        description: "Cannot place bets in the last 5 seconds",
        variant: "destructive",
      });
      return;
    }
    
    if (!walletData || betAmount > walletData.balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough funds for this bet",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest('POST', '/api/bets', {
        roundId: activeRound.id,
        color: selectedColor,
        amount: betAmount,
      });
      
      toast({
        title: "Bet Placed",
        description: `Successfully bet on ${selectedColor}`,
      });
      
      // Refresh data
      refetchWallet();
      refetchBets();
      
      // Reset selection
      setSelectedColor(null);
    } catch (error) {
      toast({
        title: "Failed to Place Bet",
        description: "An error occurred while placing your bet",
        variant: "destructive",
      });
    }
  };
  
  // Handle preset bet amounts
  const handlePresetAmount = (amount: number) => {
    if (walletData && amount <= walletData.balance) {
      setBetAmount(amount);
    } else {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough funds for this amount",
        variant: "destructive",
      });
    }
  };
  
  // Check if user has already bet on a color in this round
  const hasBetOnColor = (color: string) => {
    if (!userBets || !activeRound) return false;
    
    return userBets.some((bet: any) => 
      bet.roundId === activeRound.id && bet.color === color
    );
  };
  
  // Calculate total bet amount on each color
  const getTotalBetOnColor = (color: string) => {
    if (!userBets || !activeRound) return 0;
    
    return userBets
      .filter((bet: any) => bet.roundId === activeRound.id && bet.color === color)
      .reduce((sum: number, bet: any) => sum + bet.amount, 0);
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Color Trading Game</h1>
          <p className="text-gray-400">Bet on red, green, or violet to win</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Countdown Timer */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-white">
                  Round #{activeRound?.roundNumber || '...'}
                </CardTitle>
                <Badge variant={timeLeft > 30 ? "outline" : timeLeft > 10 ? "secondary" : "destructive"}>
                  <Timer className="h-4 w-4 mr-1" />
                  {timeLeft}s
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-gray-800 rounded-full h-4 mb-4">
                  <div 
                    className={`h-4 rounded-full ${
                      timeLeft > 30 ? 'bg-green-500' : timeLeft > 10 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(timeLeft / 60) * 100}%` }}
                  />
                </div>
                
                {/* Color Selection Area */}
                <div className="grid grid-cols-3 gap-4 my-6">
                  <Button 
                    className={`py-8 ${selectedColor === 'red' ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}`}
                    variant={hasBetOnColor('red') ? "outline" : "default"}
                    disabled={timeLeft <= 5 || isRoundEnding}
                    style={{ backgroundColor: hasBetOnColor('red') ? 'rgba(239, 68, 68, 0.2)' : 'rgb(239, 68, 68)' }}
                    onClick={() => setSelectedColor('red')}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold">Red</span>
                      <span className="text-xs mt-1">x1.5</span>
                      {hasBetOnColor('red') && (
                        <Badge className="mt-2 bg-white text-red-600">
                          ₹{getTotalBetOnColor('red')}
                        </Badge>
                      )}
                    </div>
                  </Button>
                  
                  <Button 
                    className={`py-8 ${selectedColor === 'green' ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}`}
                    variant={hasBetOnColor('green') ? "outline" : "default"}
                    disabled={timeLeft <= 5 || isRoundEnding}
                    style={{ backgroundColor: hasBetOnColor('green') ? 'rgba(34, 197, 94, 0.2)' : 'rgb(34, 197, 94)' }}
                    onClick={() => setSelectedColor('green')}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold">Green</span>
                      <span className="text-xs mt-1">x1.5</span>
                      {hasBetOnColor('green') && (
                        <Badge className="mt-2 bg-white text-green-600">
                          ₹{getTotalBetOnColor('green')}
                        </Badge>
                      )}
                    </div>
                  </Button>
                  
                  <Button 
                    className={`py-8 ${selectedColor === 'violet' ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}`}
                    variant={hasBetOnColor('violet') ? "outline" : "default"}
                    disabled={timeLeft <= 5 || isRoundEnding}
                    style={{ backgroundColor: hasBetOnColor('violet') ? 'rgba(139, 92, 246, 0.2)' : 'rgb(139, 92, 246)' }}
                    onClick={() => setSelectedColor('violet')}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold">Violet</span>
                      <span className="text-xs mt-1">x2</span>
                      {hasBetOnColor('violet') && (
                        <Badge className="mt-2 bg-white text-violet-600">
                          ₹{getTotalBetOnColor('violet')}
                        </Badge>
                      )}
                    </div>
                  </Button>
                </div>
                
                {/* Bet Amount Selection */}
                {timeLeft > 5 && !isRoundEnding && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Bet Amount
                      </label>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setBetAmount(Math.max(10, betAmount - 10))}
                          className="text-white border-gray-700"
                        >
                          -
                        </Button>
                        <Input 
                          type="number" 
                          value={betAmount}
                          onChange={(e) => setBetAmount(Number(e.target.value))}
                          min="10"
                          max={walletData?.balance || 1000}
                          className="flex-1 p-2 text-center bg-gray-800 border-gray-700 text-white"
                        />
                        <Button 
                          variant="outline"
                          onClick={() => setBetAmount(betAmount + 10)}
                          disabled={!walletData || betAmount >= walletData.balance}
                          className="text-white border-gray-700"
                        >
                          +
                        </Button>
                      </div>
                      {walletData && (
                        <div className="text-sm text-gray-400 text-right mt-1">
                          Balance: ₹ {walletData.balance.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                    
                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <Button 
                        variant="outline" 
                        onClick={() => handlePresetAmount(10)}
                        className="text-white border-gray-700"
                      >
                        ₹10
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handlePresetAmount(50)}
                        className="text-white border-gray-700"
                      >
                        ₹50
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handlePresetAmount(100)}
                        className="text-white border-gray-700"
                      >
                        ₹100
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handlePresetAmount(500)}
                        className="text-white border-gray-700"
                      >
                        ₹500
                      </Button>
                    </div>
                    
                    {/* Place Bet Button */}
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={!selectedColor || timeLeft <= 5 || !walletData || betAmount > walletData.balance}
                      onClick={placeBet}
                    >
                      Place Bet
                    </Button>
                  </>
                )}
                
                {/* Ending Message */}
                {timeLeft <= 5 && (
                  <div className="text-center py-6">
                    <h3 className="text-xl font-bold text-yellow-500 mb-2">Round Ending Soon!</h3>
                    <p className="text-gray-400">Wait for next round to place bets</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Previous Results */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {roundsHistory && roundsHistory.length > 0 ? (
                    roundsHistory.slice(0, 10).map((round: any, index: number) => (
                      <div 
                        key={index} 
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border-2 ${
                          round.result === 'red' ? 'bg-red-500 border-red-400' : 
                          round.result === 'green' ? 'bg-green-500 border-green-400' : 
                          round.result === 'violet' ? 'bg-violet-500 border-violet-400' : 
                          'bg-gray-700 border-gray-600'
                        }`}
                      >
                        {round.roundNumber}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-center w-full py-4">No recent rounds</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Current Bets & Game Rules */}
          <div className="space-y-6">
            {/* Current Round Bets */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Your Current Bets</CardTitle>
              </CardHeader>
              <CardContent>
                {userBets && userBets.filter((bet: any) => 
                  activeRound && bet.roundId === activeRound.id
                ).length > 0 ? (
                  <div className="space-y-3">
                    {userBets
                      .filter((bet: any) => activeRound && bet.roundId === activeRound.id)
                      .map((bet: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded-md">
                          <div className="flex items-center">
                            <div 
                              className={`w-4 h-4 rounded-full mr-2 ${
                                bet.color === 'red' ? 'bg-red-500' : 
                                bet.color === 'green' ? 'bg-green-500' : 'bg-violet-500'
                              }`}
                            />
                            <span className="text-white font-medium capitalize">{bet.color}</span>
                          </div>
                          <div className="text-sm font-medium text-white">₹{bet.amount}</div>
                        </div>
                      ))
                    }
                    <div className="mt-2 text-right text-sm text-gray-400">
                      Total: ₹{userBets
                        .filter((bet: any) => activeRound && bet.roundId === activeRound.id)
                        .reduce((sum: number, bet: any) => sum + bet.amount, 0)
                      }
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    No bets placed for this round
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Game Rules */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Game Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="mt-1 mr-2">
                      <CandlestickChart className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">How to Play</h4>
                      <p className="text-sm text-gray-400">
                        Choose a color, enter your bet amount, and click 'Place Bet'. If your color is selected, you win!
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="mt-1 mr-2">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Winning</h4>
                      <p className="text-sm text-gray-400">
                        Red/Green: 1.5x your bet amount<br />
                        Violet: 2x your bet amount
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="mt-1 mr-2">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Restrictions</h4>
                      <p className="text-sm text-gray-400">
                        Bets cannot be placed in the last 5 seconds of a round.<br />
                        Minimum bet: ₹10
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}