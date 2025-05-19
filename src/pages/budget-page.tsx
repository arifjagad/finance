import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  ArrowLeft, 
  Plus,
  Loader2,
  Wallet,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

const budgetSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  budget: z.number().positive("Budget must be a positive number"),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

export function BudgetPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category_id: "",
      budget: undefined,
    },
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
          .eq("user_id", user.id)
          .eq("type", "expense");

        if (categoryError) throw categoryError;
        setCategories(categoryData || []);

        // Fetch transactions for the current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: transactionData, error: transactionError } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("type", "expense")
          .gte("date", startOfMonth.toISOString());

        if (transactionError) throw transactionError;
        setTransactions(transactionData || []);
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

  const handleSetBudget = async (values: BudgetFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("categories")
        .update({
          budget: values.budget,
        })
        .eq("id", values.category_id);

      if (error) throw error;

      setCategories(prev => 
        prev.map(category => 
          category.id === values.category_id 
            ? { ...category, budget: values.budget } 
            : category
        )
      );
      
      setIsAddBudgetOpen(false);
      setCurrentCategory(null);
      
      toast({
        title: "Budget updated",
        description: "Category budget has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating budget",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBudgetStatus = (category: Category) => {
    if (!category.budget) return null;

    const spent = transactions
      .filter(t => t.category_id === category.id)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const percentage = Math.round((spent / category.budget) * 100);
    
    return {
      spent,
      remaining: category.budget - spent,
      percentage,
      status: percentage >= 90 ? "danger" : percentage >= 75 ? "warning" : "normal",
    };
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
            <h1 className="text-2xl md:text-3xl font-bold">Budget Planning</h1>
            <p className="text-muted-foreground">
              Set and track your spending limits
            </p>
          </div>
        </div>
        <Button 
          onClick={() => {
            setCurrentCategory(null);
            setIsAddBudgetOpen(true);
          }}
          className="mt-4 md:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Set Budget
        </Button>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const budgetStatus = getBudgetStatus(category);
            const IconComponent = require("lucide-react")[category.icon];

            return (
              <Card key={category.id} className="hover-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: category.color + "20" }}
                      >
                        {IconComponent && (
                          <IconComponent
                            className="h-4 w-4"
                            style={{ color: category.color }}
                          />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{category.name}</CardTitle>
                        {category.budget ? (
                          <p className="text-xs text-muted-foreground">
                            Budget: {formatCurrency(category.budget, profile?.currency)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No budget set
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCurrentCategory(category);
                        form.setValue("category_id", category.id);
                        form.setValue("budget", category.budget || undefined);
                        setIsAddBudgetOpen(true);
                      }}
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
                  </div>
                </CardHeader>
                <CardContent>
                  {budgetStatus ? (
                    <div className="space-y-2">
                      <Progress 
                        value={budgetStatus.percentage} 
                        className={`h-2 ${
                          budgetStatus.status === "danger" 
                            ? "bg-red-200 dark:bg-red-900" 
                            : budgetStatus.status === "warning"
                            ? "bg-yellow-200 dark:bg-yellow-900"
                            : ""
                        }`}
                      />
                      <div className="flex justify-between text-sm">
                        <span>Spent: {formatCurrency(budgetStatus.spent, profile?.currency)}</span>
                        <span className={
                          budgetStatus.status === "danger" 
                            ? "text-red-500" 
                            : budgetStatus.status === "warning"
                            ? "text-yellow-500"
                            : ""
                        }>
                          Remaining: {formatCurrency(budgetStatus.remaining, profile?.currency)}
                        </span>
                      </div>
                      {budgetStatus.status !== "normal" && (
                        <div className={`flex items-center gap-2 text-sm ${
                          budgetStatus.status === "danger" 
                            ? "text-red-500" 
                            : "text-yellow-500"
                        }`}>
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            {budgetStatus.status === "danger" 
                              ? "Over budget!" 
                              : "Approaching budget limit"}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setCurrentCategory(category);
                          form.setValue("category_id", category.id);
                          setIsAddBudgetOpen(true);
                        }}
                      >
                        Set Budget
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Categories Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create expense categories first to set budgets
            </p>
            <Button onClick={() => navigate("/categories")}>
              Manage Categories
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Set Budget Dialog */}
      <Dialog open={isAddBudgetOpen} onOpenChange={setIsAddBudgetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {currentCategory 
                ? `Set Budget for ${currentCategory.name}`
                : "Set Category Budget"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSetBudget)} className="space-y-4">
              {!currentCategory && (
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="">Select a category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Budget</FormLabel>
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Budget"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}