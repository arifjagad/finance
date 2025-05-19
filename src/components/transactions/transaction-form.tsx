import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

type Category = Database["public"]["Tables"]["categories"]["Row"];

const transactionSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  description: z.string().min(1, "Description is required"),
  date: z.date({
    required_error: "Date is required",
  }),
  category_id: z.string().min(1, "Category is required"),
  type: z.enum(["income", "expense"]),
});

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["income", "expense"]),
  color: z.string().min(1, "Color is required"),
  icon: z.string().min(1, "Icon is required"),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

interface TransactionFormProps {
  onSubmit: (values: TransactionFormValues) => void;
  categories: Category[];
  defaultValues?: Partial<TransactionFormValues>;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function TransactionForm({
  onSubmit,
  categories,
  defaultValues = {
    amount: undefined,
    description: "",
    date: new Date(),
    category_id: "",
    type: "expense",
  },
  submitLabel = "Add Transaction",
  isSubmitting = false,
}: TransactionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: form.watch("type"),
      color: "#14b8a6",
      icon: "Tag",
    },
  });

  const transactionType = form.watch("type");

  useEffect(() => {
    // Filter categories based on transaction type
    setFilteredCategories(
      categories.filter((cat) => cat.type === transactionType)
    );
    
    // Reset category if type changed
    if (form.getValues("category_id")) {
      const currentCategory = categories.find(
        (cat) => cat.id === form.getValues("category_id")
      );
      
      if (currentCategory?.type !== transactionType) {
        form.setValue("category_id", "");
      }
    }
  }, [categories, transactionType, form]);

  const handleAddCategory = async (values: CategoryFormValues) => {
    if (!user) return;
    
    setIsCategorySubmitting(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: values.name,
          type: values.type,
          color: values.color,
          icon: values.icon,
          user_id: user.id,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      toast({
        title: "Category created",
        description: "Your new category has been created successfully.",
      });

      // Close dialog and reset form
      setIsAddCategoryOpen(false);
      categoryForm.reset();

      // Update categories list
      if (data[0]) {
        setFilteredCategories(prev => [...prev, data[0]]);
        form.setValue("category_id", data[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error creating category",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const iconOptions = [
    { value: "Tag", label: "Tag" },
    { value: "ShoppingBag", label: "Shopping" },
    { value: "Utensils", label: "Food" },
    { value: "Home", label: "Home" },
    { value: "Car", label: "Transport" },
    { value: "Heart", label: "Health" },
    { value: "Gamepad2", label: "Entertainment" },
    { value: "GraduationCap", label: "Education" },
    { value: "Briefcase", label: "Work" },
    { value: "Gift", label: "Gift" },
  ];

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

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Transaction Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="expense" id="expense" />
                      <label
                        htmlFor="expense"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Expense
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="income" id="income" />
                      <label
                        htmlFor="income"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Income
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
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
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
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
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <div className="flex gap-2">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.length === 0 ? (
                        <SelectItem value="no-categories" disabled>
                          No categories found
                        </SelectItem>
                      ) : (
                        filteredCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      categoryForm.setValue("type", transactionType);
                      setIsAddCategoryOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </form>
      </Form>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(handleAddCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Groceries, Rent, Salary" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={categoryForm.control}
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
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={categoryForm.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select icon" />
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
                  control={categoryForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select color" />
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

              <Button type="submit" className="w-full" disabled={isCategorySubmitting}>
                {isCategorySubmitting ? "Creating..." : "Create Category"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}