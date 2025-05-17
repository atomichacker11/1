import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import SidebarLayout from "@/layouts/sidebar-layout";
import { useToast } from "@/hooks/use-toast";

export default function WalletPage() {
  const { toast } = useToast();
  const [depositAmount, setDepositAmount] = useState(500);
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [upiId, setUpiId] = useState('');
  
  // Get wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery({
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
  
  // Get transaction history
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
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
  
  // Handle deposit
  const handleDeposit = (amount: number) => {
    toast({
      title: "Deposit initiated",
      description: `Added ₹${amount.toLocaleString('en-IN')} to your wallet!`,
    });
  };
  
  // Handle withdrawal
  const handleWithdraw = () => {
    if (!upiId) {
      toast({
        title: "Missing UPI ID",
        description: "Please enter your UPI ID for withdrawal",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Withdrawal request submitted",
      description: `₹${withdrawAmount.toLocaleString('en-IN')} will be sent to ${upiId} within 24 hours.`,
    });
  };
  
  // Format transaction details
  const getTransactionDetails = (transaction: any) => {
    switch (transaction.type) {
      case 'deposit':
        return {
          title: 'Deposit',
          description: 'Added funds to wallet',
          amount: `+₹${transaction.amount.toLocaleString('en-IN')}`,
          color: 'text-green-500'
        };
      case 'withdrawal':
        return {
          title: 'Withdrawal',
          description: `To ${transaction.reference || 'bank account'}`,
          amount: `-₹${transaction.amount.toLocaleString('en-IN')}`,
          color: 'text-red-500'
        };
      case 'bet':
        return {
          title: 'Game Bet',
          description: `Bet on ${transaction.reference || 'game'}`,
          amount: `-₹${transaction.amount.toLocaleString('en-IN')}`,
          color: 'text-red-500'
        };
      case 'win':
        return {
          title: 'Game Win',
          description: `Win from ${transaction.reference || 'game'}`,
          amount: `+₹${transaction.amount.toLocaleString('en-IN')}`,
          color: 'text-green-500'
        };
      default:
        return {
          title: 'Transaction',
          description: transaction.reference || '',
          amount: `₹${transaction.amount.toLocaleString('en-IN')}`,
          color: 'text-white'
        };
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
          <p className="text-gray-400">Manage your funds</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Balance Card */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {walletLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-4xl font-bold text-white">
                    ₹ {walletData?.balance.toLocaleString('en-IN') || '0'}
                  </div>
                  
                  {/* Deposit Section */}
                  <div className="p-4 border border-gray-800 rounded-lg bg-gray-800/50 space-y-4">
                    <h3 className="text-lg font-medium text-white">Add Money</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => handleDeposit(100)}>₹100</Button>
                      <Button variant="outline" onClick={() => handleDeposit(500)}>₹500</Button>
                      <Button variant="outline" onClick={() => handleDeposit(1000)}>₹1,000</Button>
                      <Button variant="outline" onClick={() => handleDeposit(5000)}>₹5,000</Button>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                        className="bg-gray-900 border-gray-700"
                        min={100}
                      />
                      <Button onClick={() => handleDeposit(depositAmount)}>
                        Deposit
                      </Button>
                    </div>
                    
                    <p className="text-xs text-gray-400">*Use UPI, Net Banking, or Cards</p>
                  </div>
                  
                  {/* Withdraw Section */}
                  <div className="p-4 border border-gray-800 rounded-lg bg-gray-800/50 space-y-4">
                    <h3 className="text-lg font-medium text-white">Withdraw Money</h3>
                    
                    <div className="space-y-3">
                      <Input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                        placeholder="Enter amount"
                        className="bg-gray-900 border-gray-700"
                        min={100}
                        max={walletData?.balance || 0}
                      />
                      
                      <Input
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="Enter UPI ID"
                        className="bg-gray-900 border-gray-700"
                      />
                      
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={handleWithdraw}
                        disabled={!walletData || withdrawAmount > walletData.balance}
                      >
                        Withdraw to UPI
                      </Button>
                    </div>
                    
                    <p className="text-xs text-gray-400">*Min: ₹100, Max: ₹10,000 per day</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Transaction History Card */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : transactions && transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.slice(0, 10).map((transaction: any, index: number) => {
                    const details = getTransactionDetails(transaction);
                    
                    return (
                      <div key={index} className="flex justify-between items-center pb-3 border-b border-gray-800">
                        <div>
                          <p className="font-medium text-white">{details.title}</p>
                          <p className="text-xs text-gray-400">{details.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className={`font-medium ${details.color}`}>
                          {details.amount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  No transaction history yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}