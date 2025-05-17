import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartComponent } from "@/components/ui/chart-component";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Users, Activity, DollarSign, TrendingUp, BarChart3, User, Shield } from "lucide-react";

// Admin dashboard statistics interface
interface AdminStats {
  totalUsers: number;
  totalRounds: number;
  totalBets: number;
  houseProfit: number;
}

// User interface
interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  name: string | null;
  balance: number;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Audit log interface
interface AuditLog {
  id: number;
  adminId: number;
  action: string;
  details: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editUserData, setEditUserData] = useState({
    balance: 0,
    isActive: true,
    role: "user"
  });
  const [forceRoundData, setForceRoundData] = useState({
    roundId: "",
    result: "red",
    multiplier: "2.0"
  });

  // Fetch admin statistics
  const { 
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: getQueryFn<AdminStats>({ on401: "throw" }),
  });

  // Fetch all users
  const { 
    data: users,
    isLoading: isLoadingUsers,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn<AdminUser[]>({ on401: "throw" }),
  });

  // Fetch audit logs
  const { 
    data: auditLogs,
    isLoading: isLoadingAuditLogs,
    refetch: refetchAuditLogs
  } = useQuery({
    queryKey: ["/api/admin/audit-logs"],
    queryFn: getQueryFn<AuditLog[]>({ on401: "throw" }),
  });

  const handleEditUser = async () => {
    if (!selectedUserId) return;
    
    try {
      await apiRequest(`/api/admin/users/${selectedUserId}`, {
        method: "PATCH",
        body: JSON.stringify(editUserData),
      });
      
      refetchUsers();
      setSelectedUserId(null);
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const handleForceRound = async () => {
    try {
      await apiRequest("/api/admin/force-round", {
        method: "POST",
        body: JSON.stringify({
          roundId: parseInt(forceRoundData.roundId),
          result: forceRoundData.result,
          multiplier: parseFloat(forceRoundData.multiplier)
        }),
      });
      
      refetchStats();
      refetchAuditLogs();
    } catch (error) {
      console.error("Failed to force round result:", error);
    }
  };

  const openEditUserDialog = (user: AdminUser) => {
    setSelectedUserId(user.id);
    setEditUserData({
      balance: user.balance,
      isActive: user.isActive,
      role: user.role
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-400">Manage users, view stats, and control game parameters</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-purple-400 border-purple-400">
          <Shield className="w-4 h-4 mr-1" /> Admin Access
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="game-control">Game Control</TabsTrigger>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="mr-2 text-purple-500" />
                  <span className="text-3xl font-bold">
                    {isLoadingStats ? "..." : stats?.totalUsers || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Rounds Played</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Activity className="mr-2 text-green-500" />
                  <span className="text-3xl font-bold">
                    {isLoadingStats ? "..." : stats?.totalRounds || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Bets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <TrendingUp className="mr-2 text-red-500" />
                  <span className="text-3xl font-bold">
                    {isLoadingStats ? "..." : stats?.totalBets || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">House Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="mr-2 text-yellow-500" />
                  <span className="text-3xl font-bold">
                    {isLoadingStats ? "..." : stats?.houseProfit.toFixed(2) || "0.00"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profit Over Time</CardTitle>
                <CardDescription>House profit trends (demo visualization)</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartComponent
                  type="line"
                  height={250}
                  data={[
                    { day: "Mon", profit: 120 },
                    { day: "Tue", profit: 180 },
                    { day: "Wed", profit: 150 },
                    { day: "Thu", profit: 250 },
                    { day: "Fri", profit: 300 },
                    { day: "Sat", profit: 280 },
                    { day: "Sun", profit: 320 },
                  ]}
                  xAxis="day"
                  yAxis="profit"
                  dataKeys={["profit"]}
                  colors={["#8b5cf6"]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bet Distribution</CardTitle>
                <CardDescription>Color choices breakdown (demo visualization)</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartComponent
                  type="pie"
                  height={250}
                  data={[
                    { color: "Red", value: 40 },
                    { color: "Green", value: 35 },
                    { color: "Violet", value: 25 },
                  ]}
                  dataKeys={["value"]}
                  colors={["#ef4444", "#10b981", "#8b5cf6"]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="text-center py-4">Loading users...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users && users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "outline" : "default"}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.balance.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "success" : "destructive"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => openEditUserDialog(user)}>
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={selectedUserId !== null} onOpenChange={(open) => !open && setSelectedUserId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user details and permissions
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="balance">Balance</Label>
                  <Input
                    id="balance"
                    type="number"
                    value={editUserData.balance}
                    onChange={(e) => setEditUserData({ ...editUserData, balance: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={editUserData.role}
                    onValueChange={(value) => setEditUserData({ ...editUserData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editUserData.isActive ? "active" : "inactive"}
                    onValueChange={(value) => setEditUserData({ ...editUserData, isActive: value === "active" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedUserId(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEditUser}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Game Control Tab */}
        <TabsContent value="game-control">
          <Card>
            <CardHeader>
              <CardTitle>Game Controls</CardTitle>
              <CardDescription>Manage game rounds and modify outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Force Round Result</h3>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="roundId">Round ID</Label>
                      <Input
                        id="roundId"
                        type="number"
                        placeholder="Enter round ID"
                        value={forceRoundData.roundId}
                        onChange={(e) => setForceRoundData({ ...forceRoundData, roundId: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="result">Result</Label>
                      <Select
                        value={forceRoundData.result}
                        onValueChange={(value) => setForceRoundData({ 
                          ...forceRoundData, 
                          result: value,
                          multiplier: value === "violet" ? "4.0" : "2.0"
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="red">Red (2x)</SelectItem>
                          <SelectItem value="green">Green (2x)</SelectItem>
                          <SelectItem value="violet">Violet (4x)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="multiplier">Multiplier</Label>
                      <Input
                        id="multiplier"
                        type="number"
                        step="0.1"
                        value={forceRoundData.multiplier}
                        onChange={(e) => setForceRoundData({ ...forceRoundData, multiplier: e.target.value })}
                      />
                    </div>
                    <Button className="w-full" onClick={handleForceRound}>
                      Force Result
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Game Statistics</h3>
                  <div className="space-y-4 bg-gray-800 p-4 rounded-md">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                      <span className="text-gray-400">Total Rounds</span>
                      <span className="font-medium">{isLoadingStats ? "..." : stats?.totalRounds || 0}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                      <span className="text-gray-400">Total Bets</span>
                      <span className="font-medium">{isLoadingStats ? "..." : stats?.totalBets || 0}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                      <span className="text-gray-400">House Profit</span>
                      <span className="font-medium">{isLoadingStats ? "..." : stats?.houseProfit.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-gray-400">Avg. Profit per Round</span>
                      <span className="font-medium">
                        {isLoadingStats ? "..." : 
                          stats && stats.totalRounds > 0 
                            ? (stats.houseProfit / stats.totalRounds).toFixed(2)
                            : "0.00"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit-logs">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Track admin activities for compliance and security</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAuditLogs ? (
                <div className="text-center py-4">Loading audit logs...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Admin ID</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs && auditLogs.length > 0 ? (
                        auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{log.id}</TableCell>
                            <TableCell>{log.adminId}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                            <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}