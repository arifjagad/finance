import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  ArrowLeft,
  Plus,
  Loader2,
  Tags,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type Category = Database["public"]["Tables"]["categories"]["Row"];

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["income", "expense"]),
  color: z.string().min(1, "Color is required"),
  icon: z.string().min(1, "Icon is required"),
  budget: z.number().min(0, "Budget cannot be negative").optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoriesPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
      color: "#14b8a6",
      icon: "Tag",
      budget: undefined,
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("user_id", user.id)
          .order("name");

        if (error) throw error;
        setCategories(data || []);
      } catch (error: any) {
        toast({
          title: "Error fetching categories",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    fetchCategories();
  }, [user, toast]);

  useEffect(() => {
    if (isAddCategoryOpen) {
      if (currentCategory) {
        form.reset({
          name: currentCategory.name,
          type: currentCategory.type,
          color: currentCategory.color,
          icon: currentCategory.icon,
        });
      } else {
        form.reset({
          name: "",
          type: "expense",
          color: "#14b8a6",
          icon: "Tag",
        });
      }
    }
  }, [isAddCategoryOpen, currentCategory, form]);

  const handleAddCategory = async (values: CategoryFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      if (currentCategory) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: values.name,
            type: values.type,
            color: values.color,
            icon: values.icon,
          })
          .eq("id", currentCategory.id);

        if (error) throw error;

        setCategories(prev => 
          prev.map(category => 
            category.id === currentCategory.id 
              ? { ...category, ...values } 
              : category
          )
        );

        toast({
          title: "Category updated",
          description: "Your category has been updated successfully.",
        });
      } else {
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

        setCategories(prev => [...prev, data[0]]);
        
        toast({
          title: "Category created",
          description: "Your new category has been created successfully.",
        });
      }
      
      setIsAddCategoryOpen(false);
      setCurrentCategory(null);
    } catch (error: any) {
      toast({
        title: "Error saving category",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to delete this category? All associated transactions will be affected.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCategories(prev => prev.filter(category => category.id !== id));
      
      toast({
        title: "Category deleted",
        description: "Your category has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditCategory = (category: Category) => {
    setCurrentCategory(category);
    setIsAddCategoryOpen(true);
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
            <h1 className="text-2xl md:text-3xl font-bold">Categories</h1>
            <p className="text-muted-foreground">
              Manage your transaction categories
            </p>
          </div>
        </div>
        <Button 
          onClick={() => {
            setCurrentCategory(null);
            setIsAddCategoryOpen(true);
          }}
          className="mt-4 md:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length > 0 ? (
          categories.map((category) => {
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
                        <p className="text-xs text-muted-foreground capitalize">
                          {category.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditCategory(category)}
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
                        onClick={() => handleDeleteCategory(category.id)}
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
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Tags className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Categories Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create categories to better organize your transactions
              </p>
              <Button onClick={() => setIsAddCategoryOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {currentCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddCategory)} className="space-y-4">
              <FormField
                control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : currentCategory ? (
                  "Update Category"
                ) : (
                  "Create Category"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}