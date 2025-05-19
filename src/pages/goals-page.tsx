import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  PiggyBank, 
  Plus,
  Loader2,
  Target,
  ArrowLeft
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
import { GoalCard } from "@/components/goals/goal-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  target_amount: z.number().positive("Amount must be a positive number"),
  current_amount: z.number().min(0, "Current amount cannot be negative"),
  target_date: z.date().optional(),
  color: z.string().min(1, "Color is required"),
  icon: z.string().min(1, "Icon is required"),
});

type GoalFormValues = z.infer<typeof goalSchema>;

export function GoalsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<SavingsGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState<number>(0);

  // Form for adding new goals
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      target_amount: undefined,
      current_amount: 0,
      target_date: undefined,
      color: "#14b8a6",
      icon: "PiggyBank",
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

    async function fetchGoals() {
      try {
        const { data, error } = await supabase
          .from("savings_goals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSavingsGoals(data || []);
      } catch (error: any) {
        toast({
          title: "Error fetching goals",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    fetchGoals();
  }, [user, toast]);

  // Reset form when modal opens
  useEffect(() => {
    if (isAddGoalOpen) {
      if (currentGoal) {
        // Edit mode - populate form with goal data
        form.reset({
          name: currentGoal.name,
          target_amount: currentGoal.target_amount,
          current_amount: currentGoal.current_amount,
          target_date: currentGoal.target_date ? new Date(currentGoal.target_date) : undefined,
          color: currentGoal.color,
          icon: currentGoal.icon,
        });
      } else {
        // Add mode - reset to defaults
        form.reset({
          name: "",
          target_amount: undefined,
          current_amount: 0,
          target_date: undefined,
          color: "#14b8a6",
          icon: "PiggyBank",
        });
      }
    }
  }, [isAddGoalOpen, currentGoal, form]);

  const handleAddGoal = async (values: GoalFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      if (currentGoal) {
        // Update existing goal
        const { error } = await supabase
          .from("savings_goals")
          .update({
            name: values.name,
            target_amount: values.target_amount,
            current_amount: values.current_amount,
            target_date: values.target_date?.toISOString() || null,
            color: values.color,
            icon: values.icon,
          })
          .eq("id", currentGoal.id);

        if (error) throw error;

        setSavingsGoals(prev => 
          prev.map(goal => 
            goal.id === currentGoal.id 
              ? { ...goal, ...values, target_date: values.target_date?.toISOString() || null } 
              : goal
          )
        );

        toast({
          title: "Goal updated",
          description: "Your savings goal has been updated successfully.",
        });
      } else {
        // Create new goal
        const { data, error } = await supabase
          .from("savings_goals")
          .insert({
            name: values.name,
            target_amount: values.target_amount,
            current_amount: values.current_amount,
            target_date: values.target_date?.toISOString() || null,
            user_id: user.id,
            created_at: new Date().toISOString(),
            color: values.color,
            icon: values.icon,
          })
          .select();

        if (error) throw error;

        setSavingsGoals(prev => [data[0], ...prev]);
        
        toast({
          title: "Goal created",
          description: "Your new savings goal has been created successfully.",
        });
      }
      
      setIsAddGoalOpen(false);
      setCurrentGoal(null);
    } catch (error: any) {
      toast({
        title: "Error saving goal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to delete this goal?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("savings_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSavingsGoals(prev => prev.filter(goal => goal.id !== id));
      
      toast({
        title: "Goal deleted",
        description: "Your savings goal has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting goal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditGoal = (goal: SavingsGoal) => {
    setCurrentGoal(goal);
    setIsAddGoalOpen(true);
  };

  const handleContributeToGoal = (goal: SavingsGoal) => {
    setCurrentGoal(goal);
    setContributionAmount(0);
    setIsContributeOpen(true);
  };

  const handleSaveContribution = async () => {
    if (!user || !currentGoal || contributionAmount <= 0) return;
    
    setIsSubmitting(true);
    try {
      const newAmount = currentGoal.current_amount + contributionAmount;
      
      const { error } = await supabase
        .from("savings_goals")
        .update({
          current_amount: newAmount,
        })
        .eq("id", currentGoal.id);

      if (error) throw error;

      setSavingsGoals(prev => 
        prev.map(goal => 
          goal.id === currentGoal.id 
            ? { ...goal, current_amount: newAmount } 
            : goal
        )
      );
      
      setIsContributeOpen(false);
      setCurrentGoal(null);
      
      toast({
        title: "Contribution added",
        description: "Your contribution has been added to your goal.",
      });
    } catch (error: any) {
      toast({
        title: "Error adding contribution",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Available icons for goals
  const iconOptions = [
    { value: "PiggyBank", label: "Piggy Bank" },
    { value: "Home", label: "Home" },
    { value: "Car", label: "Car" },
    { value: "Plane", label: "Travel" },
    { value: "GraduationCap", label: "Education" },
    { value: "Heart", label: "Health" },
    { value: "Gift", label: "Gift" },
    { value: "DollarSign", label: "General" },
    { value: "Smartphone", label: "Electronics" },
    { value: "Palmtree", label: "Vacation" },
  ];

  // Color options for goals
  const colorOptions = [
    { value: "#14b8a6", label: "Teal" },
    { value: "#8b5cf6", label: "Purple" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#ef4444", label: "Red" },
    { value: "#3b82f6", label: "Blue" },
    { value: "#22c55e", label: "Green" },
    { value: "#ec4899", label: "Pink" },
    { value: "#f97316", label: "Orange" },
    { value: "#64748b", label: "Slate" },
    { value: "#a855f7", label: "Violet" },
  ];

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
            <h1 className="text-2xl md:text-3xl font-bold">Savings Goals</h1>
            <p className="text-muted-foreground">
              Track progress towards your financial targets
            </p>
          </div>
        </div>
        <Button 
          onClick={() => {
            setCurrentGoal(null);
            setIsAddGoalOpen(true);
          }}
          className="mt-4 md:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" /> 
          New Goal
        </Button>
      </div>

      {savingsGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savingsGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={profile?.currency || "$"}
              onEdit={handleEditGoal}
              onDelete={handleDeleteGoal}
              onContribute={handleContributeToGoal}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-background">
          <CardHeader>
            <CardTitle className="text-xl text-center">No Savings Goals Yet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Target className="h-10 w-10 text-primary" />
            </div>
            <p className="text-center text-muted-foreground mb-6 max-w-md">
              Create your first savings goal to track your progress towards important financial targets.
            </p>
            <Button onClick={() => setIsAddGoalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> 
              Create Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Goal Dialog */}
      <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {currentGoal ? "Edit Goal" : "Create New Goal"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddGoal)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Name</FormLabel>
                    <FormControl>
                      <Input placeholder="New Car, Vacation, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="target_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Amount</FormLabel>
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
                  name="current_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Savings</FormLabel>
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
                name="target_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Target Date (Optional)</FormLabel>
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
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iconOptions.map((icon) => {
                            const IconComponent = require("lucide-react")[icon.value];
                            return (
                              <SelectItem key={icon.value} value={icon.value}>
                                <div className="flex items-center">
                                  <IconComponent className="h-4 w-4 mr-2" />
                                  {icon.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center">
                                <div
                                  className="h-4 w-4 rounded-full mr-2"
                                  style={{ backgroundColor: color.value }}
                                ></div>
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : currentGoal ? (
                  "Update Goal"
                ) : (
                  "Create Goal"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Contribute to Goal Dialog */}
      <Dialog open={isContributeOpen} onOpenChange={setIsContributeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add to {currentGoal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount to Add</label>
              <CurrencyInput
                value={contributionAmount}
                onChange={(value) => setContributionAmount(value || 0)}
                placeholder="0.00"
              />
            </div>
            
            {currentGoal && (
              <div className="p-4 rounded-lg bg-muted text-sm">
                <div className="flex justify-between mb-1">
                  <span>Current savings:</span>
                  <span>{profile?.currency || "$"}{currentGoal.current_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Contribution:</span>
                  <span className="text-green-500">+{profile?.currency || "$"}{contributionAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>New total:</span>
                  <span>{profile?.currency || "$"}{(currentGoal.current_amount + contributionAmount).toFixed(2)}</span>
                </div>
              </div>
            )}
            
            <Button 
              className="w-full" 
              onClick={handleSaveContribution}
              disabled={isSubmitting || contributionAmount <= 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Contribution"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}