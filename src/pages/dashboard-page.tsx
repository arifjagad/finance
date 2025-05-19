import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  CreditCard,
  PiggyBank,
  BarChart3,
  Calendar,
  Plus
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { formatCurrency, getLastNMonths, generateColors } from "@/lib/utils";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];

export function DashboardPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    savingsTotal: 0,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  // Fetch data from Supabase
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        // Fetch categories
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("*")
          .eq("user_id", user.id);

        if (categoryError) throw categoryError;
        
        if (categoryData.length === 0) {
          // Create default categories if none exist
          await createDefaultCategories();
          
          const { data: newCategoryData } = await supabase
            .from("categories")
            .select("*")
            .eq("user_id", user.id);
            
          setCategories(newCategoryData || []);
        } else {
          setCategories(categoryData);
        }

        // Fetch transactions
        const { data: transactionData, error: transactionError } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });

        if (transactionError) throw transactionError;
        setTransactions(transactionData || []);

        // Fetch savings goals
        const { data: goalsData, error: goalsError } = await supabase
          .from("savings_goals")
          .select("*")
          .eq("user_id", user.id);

        if (goalsError) throw goalsError;
        setSavingsGoals(goalsData || []);
      } catch (error: any) {
        toast({
          title: "Error fetching data",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    fetchData();
  }, [user, toast]);

  // Process data for charts and stats
  useEffect(() => {
    if (!transactions.length) return;

    // Calculate totals
    const income = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const savingsTotal = savingsGoals.reduce((sum, g) => sum + g.current_amount, 0);
    
    setStats({
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      savingsTotal,
    });

    // Recent transactions
    setRecentTransactions(transactions.slice(0, 5));

    // Monthly data for line chart
    const months = getLastNMonths(6);
    const monthlyStats = months.map(month => {
      const monthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() + 1 === month.month && date.getFullYear() === month.year;
      });

      const monthlyIncome = monthTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
        
      const monthlyExpenses = monthTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        name: month.name,
        income: monthlyIncome,
        expenses: monthlyExpenses,
        balance: monthlyIncome - monthlyExpenses,
      };
    });
    
    setMonthlyData(monthlyStats);

    // Category data for pie chart
    const expenseByCategory = categories
      .filter(c => c.type === "expense")
      .map(category => {
        const amount = transactions
          .filter(t => t.category_id === category.id)
          .reduce((sum, t) => sum + t.amount, 0);
          
        return {
          name: category.name,
          value: amount,
          color: category.color,
        };
      })
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
      
    setCategoryData(expenseByCategory);
  }, [transactions, categories, savingsGoals]);

  // Create default categories for new users
  const createDefaultCategories = async () => {
    if (!user) return;
    
    const defaultCategories = [
      // Expense categories
      { name: "Food & Dining", color: "#14b8a6", icon: "Utensils", type: "expense" },
      { name: "Transportation", color: "#8b5cf6", icon: "Car", type: "expense" },
      { name: "Shopping", color: "#f59e0b", icon: "ShoppingBag", type: "expense" },
      { name: "Bills & Utilities", color: "#ef4444", icon: "Receipt", type: "expense" },
      { name: "Entertainment", color: "#ec4899", icon: "Film", type: "expense" },
      { name: "Housing", color: "#64748b", icon: "Home", type: "expense" },
      // Income categories
      { name: "Salary", color: "#22c55e", icon: "Briefcase", type: "income" },
      { name: "Investments", color: "#3b82f6", icon: "TrendingUp", type: "income" },
      { name: "Gifts", color: "#a855f7", icon: "Gift", type: "income" },
      { name: "Other Income", color: "#f97316", icon: "PlusCircle", type: "income" },
    ];
    
    for (const category of defaultCategories) {
      await supabase.from("categories").insert({
        name: category.name,
        color: category.color,
        icon: category.icon,
        user_id: user.id,
        type: category.type,
        created_at: new Date().toISOString(),
      });
    }
  };

  // Handle new transaction submission
  const handleAddTransaction = async (values: any) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from("transactions").insert({
        amount: values.amount,
        description: values.description,
        date: values.date.toISOString(),
        category_id: values.category_id,
        user_id: user.id,
        created_at: new Date().toISOString(),
        type: values.type,
      }).select();

      if (error) throw error;

      // Update state with new transaction
      setTransactions(prev => [data[0], ...prev]);
      
      setIsAddTransactionOpen(false);
      toast({
        title: "Transaction added",
        description: "Your transaction has been recorded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error adding transaction",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || "User"}
          </p>
        </div>
        <Button 
          onClick={() => setIsAddTransactionOpen(true)}
          className="mt-4 md:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" /> 
          Add Transaction
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Balance"
          value={formatCurrency(stats.balance, profile?.currency)}
          icon={<DollarSign className="h-4 w-4" />}
          trend={
            transactions.length > 0
              ? {
                  value: 8.2,
                  positive: stats.balance >= 0,
                }
              : undefined
          }
        />
        <StatsCard
          title="Total Income"
          value={formatCurrency(stats.totalIncome, profile?.currency)}
          icon={<ArrowUpRight className="h-4 w-4" />}
          className="bg-success/5"
        />
        <StatsCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses, profile?.currency)}
          icon={<ArrowDownRight className="h-4 w-4" />}
          className="bg-destructive/5"
        />
        <StatsCard
          title="Total Savings"
          value={formatCurrency(stats.savingsTotal, profile?.currency)}
          icon={<PiggyBank className="h-4 w-4" />}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="charts">
        <TabsList className="mb-4">
          <TabsTrigger value="charts">
            <BarChart3 className="h-4 w-4 mr-2" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Calendar className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Monthly Overview Chart */}
            <ChartCard
              title="Monthly Overview"
              description="Income and expenses for the past 6 months"
            >
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value) => [`$${value}`, undefined]}
                      contentStyle={{ 
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No data available</p>
                </div>
              )}
            </ChartCard>

            {/* Expense by Category */}
            <ChartCard
              title="Expenses by Category"
              description="How your expenses are distributed"
            >
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => 
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color || generateColors(categoryData.length)[index]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [
                        formatCurrency(value as number, profile?.currency),
                        "Amount"
                      ]}
                      contentStyle={{ 
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No data available</p>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Income vs Expenses Bar Chart */}
          <ChartCard
            title="Income vs Expenses"
            description="Monthly comparison"
          >
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, undefined]}
                    contentStyle={{ 
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="income" 
                    name="Income" 
                    fill="hsl(var(--chart-2))" 
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                  <Bar 
                    dataKey="expenses" 
                    name="Expenses" 
                    fill="hsl(var(--chart-1))" 
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No data available</p>
              </div>
            )}
          </ChartCard>
        </TabsContent>
        
        <TabsContent value="activity">
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-medium mb-4">Recent Transactions</h3>
              {recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {recentTransactions.map((transaction) => {
                    const category = categories.find(
                      (c) => c.id === transaction.category_id
                    );
                    const IconComponent = category?.icon
                      ? require("lucide-react")[category.icon]
                      : CreditCard;

                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: category
                                ? category.color + "20"
                                : "hsl(var(--muted))",
                            }}
                          >
                            {IconComponent && (
                              <IconComponent
                                className="h-5 w-5"
                                style={{
                                  color: category ? category.color : "inherit",
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()} •{" "}
                              {category?.name || "Uncategorized"}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`font-medium ${
                            transaction.type === "income"
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(transaction.amount, profile?.currency)}
                        </p>
                      </div>
                    );
                  })}
                  <div className="pt-2">
                    <Button variant="outline" onClick={() => navigate("/transactions")}>
                      View all transactions
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">
                    No transactions recorded yet
                  </p>
                  <Button onClick={() => setIsAddTransactionOpen(true)}>
                    Add your first transaction
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Savings Goals</h3>
                <Button variant="outline" size="sm" onClick={() => navigate("/goals")}>
                  Manage goals
                </Button>
              </div>
              
              {savingsGoals.length > 0 ? (
                <div className="space-y-4">
                  {savingsGoals.slice(0, 3).map((goal) => {
                    const percentage = Math.min(
                      100,
                      Math.round((goal.current_amount / goal.target_amount) * 100)
                    );
                    const IconComponent = goal.icon
                      ? require("lucide-react")[goal.icon]
                      : PiggyBank;

                    return (
                      <div key={goal.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: goal.color + "20",
                              }}
                            >
                              <IconComponent
                                className="h-4 w-4"
                                style={{ color: goal.color }}
                              />
                            </div>
                            <div>
                              <p className="font-medium">{goal.name}</p>
                              <div className="flex text-xs text-muted-foreground">
                                <span>
                                  {formatCurrency(
                                    goal.current_amount,
                                    profile?.currency
                                  )}
                                </span>
                                <span className="mx-1">of</span>
                                <span>
                                  {formatCurrency(
                                    goal.target_amount,
                                    profile?.currency
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-medium">{percentage}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">
                    No savings goals set up yet
                  </p>
                  <Button onClick={() => navigate("/goals")}>
                    Create your first goal
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            onSubmit={handleAddTransaction}
            categories={categories}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}