import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import SidebarLayout from "@/layouts/sidebar-layout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Percent, TrendingUp, Award, Gamepad2, ChevronsUp } from "lucide-react";

export default function DashboardPage() {
  const [accountHistory, setAccountHistory] = useState<any[]>([]);
  
  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/user');
        return await response.json();
      } catch (error) {
        return null;
      }
    },
  });

  // Fetch bets history
  const { data: bets } = useQuery({
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

  // Fetch transaction history
  const { data: transactions } = useQuery({
    queryKey: ['/api/wallet/transactions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/wallet/transactions');
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  // Calculate statistics
  const totalBets = bets?.length || 0;
  const wonBets = bets?.filter((bet: any) => bet.status === 'won')?.length || 0;
  const winningPercentage = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;
  
  // Calculate winning streak
  const calculateWinningStreak = () => {
    if (!bets || !bets.length) return 0;
    
    // Sort bets by createdAt in descending order
    const sortedBets = [...bets].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    let streak = 0;
    for (const bet of sortedBets) {
      if (bet.status === 'won') {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };
  
  const currentStreak = calculateWinningStreak();
  
  // Generate account growth data for the chart
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      // Sort transactions by date
      const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // Generate daily balance data
      const balanceHistory: any[] = [];
      let currentBalance = 1000; // Initial balance
      
      // Group by day and calculate end-of-day balance
      const dailyData = sortedTransactions.reduce((acc: any, transaction: any) => {
        const date = new Date(transaction.createdAt).toLocaleDateString();
        
        if (!acc[date]) {
          acc[date] = { date, balance: currentBalance };
        }
        
        // Update balance based on transaction type
        if (transaction.type === 'deposit' || transaction.type === 'win') {
          currentBalance += transaction.amount;
        } else if (transaction.type === 'withdrawal' || transaction.type === 'bet') {
          currentBalance -= transaction.amount;
        }
        
        acc[date].balance = currentBalance;
        return acc;
      }, {});
      
      // Convert to array for chart
      const chartData = Object.values(dailyData);
      
      // Add today if not already included
      const today = new Date().toLocaleDateString();
      if (!dailyData[today]) {
        chartData.push({ date: today, balance: user?.balance || 0 });
      }
      
      setAccountHistory(chartData);
    } else {
      // Demo data if no transactions
      const demoData = [
        { date: "1 day ago", balance: 1000 },
        { date: "Today", balance: user?.balance || 0 }
      ];
      setAccountHistory(demoData);
    }
  }, [transactions, user]);

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Welcome back, {user?.name || user?.username}</p>
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Bets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Gamepad2 className="h-5 w-5 text-blue-500 mr-2" />
                <div className="text-2xl font-bold text-white">{totalBets}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Percent className="h-5 w-5 text-green-500 mr-2" />
                <div className="text-2xl font-bold text-white">{winningPercentage.toFixed(1)}%</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Current Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <ChevronsUp className="h-5 w-5 text-purple-500 mr-2" />
                <div className="text-2xl font-bold text-white">{currentStreak}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-yellow-500 mr-2" />
                <div className="text-2xl font-bold text-white">₹ {user?.balance?.toLocaleString('en-IN') || 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Account Growth Chart */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Account Balance History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={accountHistory}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F9FAFB' }}
                    formatter={(value) => [`₹${value}`, 'Balance']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Activity */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bets && bets.length > 0 ? (
                bets.slice(0, 5).map((bet: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-800">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        bet.status === 'won' ? 'bg-green-500' : bet.status === 'lost' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-white">
                          Bet on <span className={`font-bold ${
                            bet.color === 'red' ? 'text-red-500' : 
                            bet.color === 'green' ? 'text-green-500' : 'text-purple-500'
                          }`}>{bet.color}</span>
                        </p>
                        <p className="text-xs text-gray-400">{new Date(bet.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${
                      bet.status === 'won' ? 'text-green-500' : bet.status === 'lost' ? 'text-red-500' : 'text-yellow-500'
                    }`}>
                      {bet.status === 'won' ? `+₹${bet.profit}` : bet.status === 'lost' ? `-₹${bet.amount}` : 'Pending'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">No recent activity</div>
              )}
              
              {bets && bets.length > 5 && (
                <div className="text-center">
                  <a href="/history" className="text-sm text-blue-500 hover:text-blue-400">View all activity</a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}