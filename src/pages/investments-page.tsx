import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  ArrowLeft, 
  Plus,
  Loader2,
  TrendingUp,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Investment = Database["public"]["Tables"]["investments"]["Row"];

const investmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["stocks", "crypto", "bonds", "real_estate", "other"]),
  amount_invested: z.number().positive("Amount must be a positive number"),
  current_value: z.number().positive("Value must be a positive number"),
  purchase_date: z.date({
    required_error: "Purchase date is required",
  }),
  risk_level: z.enum(["low", "medium", "high"]),
  notes: z.string().optional(),
});

type InvestmentFormValues = z.infer<typeof investmentSchema>;

export function InvestmentsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentInvestment, setCurrentInvestment] = useState<Investment | null>(null);
  const [stats, setStats] = useState({
    totalInvested: 0,
    totalValue: 0,
    totalReturn: 0,
    returnPercentage: 0,
  });

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      name: "",
      type: "stocks",
      amount_invested: undefined,
      current_value: undefined,
      purchase_date: new Date(),
      risk_level: "medium",
      notes: "",
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  // Fetch investments from Supabase
  useEffect(() => {
    if (!user) return;

    async function fetchInvestments() {
      try {
        const { data, error } = await supabase
          .from("investments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setInvestments(data || []);

        // Calculate investment stats
        const totalInvested = data?.reduce((sum, inv) => sum + inv.amount_invested, 0) || 0;
        const totalValue = data?.reduce((sum, inv) => sum + inv.current_value, 0) || 0;
        const totalReturn = totalValue - totalInvested;
        const returnPercentage = totalInvested > 0 
          ? ((totalReturn / totalInvested) * 100)
          : 0;

        setStats({
          totalInvested,
          totalValue,
          totalReturn,
          returnPercentage,
        });
      } catch (error: any) {
        toast({
          title: "Error fetching investments",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    fetchInvestments();
  }, [user, toast]);

  // Reset form when modal opens
  useEffect(() => {
    if (isAddInvestmentOpen) {
      if (currentInvestment) {
        form.reset({
          name: currentInvestment.name,
          type: currentInvestment.type,
          amount_invested: currentInvestment.amount_invested,
          current_value: currentInvestment.current_value,
          purchase_date: new Date(currentInvestment.purchase_date),
          risk_level: currentInvestment.risk_level,
          notes: currentInvestment.notes || "",
        });
      } else {
        form.reset({
          name: "",
          type: "stocks",
          amount_invested: undefined,
          current_value: undefined,
          purchase_date: new Date(),
          risk_level: "medium",
          notes: "",
        });
      }
    }
  }, [isAddInvestmentOpen, currentInvestment, form]);

  const handleAddInvestment = async (values: InvestmentFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      if (currentInvestment) {
        // Update existing investment
        const { error } = await supabase
          .from("investments")
          .update({
            name: values.name,
            type: values.type,
            amount_invested: values.amount_invested,
            current_value: values.current_value,
            purchase_date: values.purchase_date.toISOString(),
            risk_level: values.risk_level,
            notes: values.notes || null,
          })
          .eq("id", currentInvestment.id);

        if (error) throw error;

        setInvestments(prev => 
          prev.map(investment => 
            investment.id === currentInvestment.id 
              ? { 
                  ...investment,
                  name: values.name,
                  type: values.type,
                  amount_invested: values.amount_invested,
                  current_value: values.current_value,
                  purchase_date: values.purchase_date.toISOString(),
                  risk_level: values.risk_level,
                  notes: values.notes || null,
                } 
              : investment
          )
        );
        
        toast({
          title: "Investment updated",
          description: "Your investment has been updated successfully.",
        });
      } else {
        // Create new investment
        const { data, error } = await supabase
          .from("investments")
          .insert({
            name: values.name,
            type: values.type,
            amount_invested: values.amount_invested,
            current_value: values.current_value,
            purchase_date: values.purchase_date.toISOString(),
            user_id: user.id,
            created_at: new Date().toISOString(),
            risk_level: values.risk_level,
            notes: values.notes || null,
          })
          .select();

        if (error) throw error;

        setInvestments(prev => [data[0], ...prev]);
        
        toast({
          title: "Investment added",
          description: "Your investment has been added successfully.",
        });
      }
      
      setIsAddInvestmentOpen(false);
      setCurrentInvestment(null);
    } catch (error: any) {
      toast({
        title: "Error saving investment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to delete this investment?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("investments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setInvestments(prev => prev.filter(investment => investment.id !== id));
      
      toast({
        title: "Investment deleted",
        description: "Your investment has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting investment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditInvestment = (investment: Investment) => {
    setCurrentInvestment(investment);
    setIsAddInvestmentOpen(true);
  };

  const getInvestmentTypeIcon = (type: Investment["type"]) => {
    switch (type) {
      case "stocks":
        return TrendingUp;
      case "crypto":
        return LineChart;
      case "bonds":
        return ArrowUpRight;
      case "real_estate":
        return "Home";
      default:
        return "DollarSign";
    }
  };

  const getRiskLevelColor = (level: Investment["risk_level"]) => {
    switch (level) {
      case "low":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "high":
        return "text-red-500";
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
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Investment Portfolio</h1>
            <p className="text-muted-foreground">
              Track and manage your investments
            </p>
          </div>
        </div>
        <Button 
          onClick={() => {
            setCurrentInvestment(null);
            setIsAddInvestmentOpen(true);
          }}
          className="mt-4 md:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Investment
        </Button>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalInvested, profile?.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Current Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalValue, profile?.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Return
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats.totalReturn >= 0 ? "text-green-500" : "text-red-500"
            }`}>
              {stats.totalReturn >= 0 ? "+" : ""}
              {formatCurrency(stats.totalReturn, profile?.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Return Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center ${
              stats.returnPercentage >= 0 ? "text-green-500" : "text-red-500"
            }`}>
              {stats.returnPercentage >= 0 ? (
                <ArrowUpRight className="h-6 w-6 mr-1" />
              ) : (
                <ArrowDownRight className="h-6 w-6 mr-1" />
              )}
              {Math.abs(stats.returnPercentage).toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investments List */}
      {investments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investments.map((investment) => {
            const IconComponent = require("lucide-react")[getInvestmentTypeIcon(investment.type)];
            const returnAmount = investment.current_value - investment.amount_invested;
            const returnPercentage = (returnAmount / investment.amount_invested) * 100;

            return (
              <Card key={investment.id} className="hover-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {IconComponent && (
                          <IconComponent className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{investment.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground capitalize">
                            {investment.type.replace("_", " ")}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {investment.risk_level}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditInvestment(investment)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteInvestment(investment.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Invested:</span>
                      <span>{formatCurrency(investment.amount_invested, profile?.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Value:</span>
                      <span>{formatCurrency(investment.current_value, profile?.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Return:</span>
                      <div className={returnAmount >= 0 ? "text-green-500" : "text-red-500"}>
                        <span>
                          {returnAmount >= 0 ? "+" : ""}
                          {formatCurrency(returnAmount, profile?.currency)}
                        </span>
                        <span className="ml-1">
                          ({returnAmount >= 0 ? "+" : ""}
                          {returnPercentage.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                    {investment.notes && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {investment.notes}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <TrendingUp className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Investments Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start building your investment portfolio by adding your first investment
            </p>
            <Button onClick={() => setIsAddInvestmentOpen(true)}>
              Add Investment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Investment Dialog */}
      <Dialog open={isAddInvestmentOpen} onOpenChange={setIsAddInvestmentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {currentInvestment ? "Edit Investment" : "Add Investment"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddInvestment)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Apple Stock, Bitcoin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="stocks">Stocks</SelectItem>
                          <SelectItem value="crypto">Cryptocurrency</SelectItem>
                          <SelectItem value="bonds">Bonds</SelectItem>
                          <SelectItem value="real_estate">Real Estate</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="risk_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select risk level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low Risk</SelectItem>
                          <SelectItem value="medium">Medium Risk</SelectItem>
                          <SelectItem value="high">High Risk</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount_invested"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Invested</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="current_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Purchase Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional notes about this investment"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : currentInvestment ? (
                  "Update Investment"
                ) : (
                  "Add Investment"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}