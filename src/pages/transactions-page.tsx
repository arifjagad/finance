import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Plus, Trash2, Edit, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";
import { TransactionForm } from "@/components/transactions/transaction-form";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export function TransactionsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setCategories(categoryData || []);

        // Fetch transactions
        const { data: transactionData, error: transactionError } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });

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

  const handleAddTransaction = async (values: any) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      if (isEditMode && currentTransaction) {
        // Update existing transaction
        const { error } = await supabase
          .from("transactions")
          .update({
            amount: values.amount,
            description: values.description,
            date: values.date.toISOString(),
            category_id: values.category_id,
            type: values.type,
          })
          .eq("id", currentTransaction.id);

        if (error) throw error;

        // Update local state
        setTransactions(prev => 
          prev.map(transaction => 
            transaction.id === currentTransaction.id 
              ? { 
                  ...transaction, 
                  amount: values.amount,
                  description: values.description,
                  date: values.date.toISOString(),
                  category_id: values.category_id,
                  type: values.type,
                } 
              : transaction
          )
        );
        
        toast({
          title: "Transaction updated",
          description: "Your transaction has been updated successfully.",
        });
      } else {
        // Create new transaction
        const { data, error } = await supabase
          .from("transactions")
          .insert({
            amount: values.amount,
            description: values.description,
            date: values.date.toISOString(),
            category_id: values.category_id,
            user_id: user.id,
            created_at: new Date().toISOString(),
            type: values.type,
          })
          .select();

        if (error) throw error;

        // Update local state
        setTransactions(prev => [data[0], ...prev]);
        
        toast({
          title: "Transaction added",
          description: "Your transaction has been recorded successfully.",
        });
      }
      
      setIsAddTransactionOpen(false);
      setCurrentTransaction(null);
      setIsEditMode(false);
    } catch (error: any) {
      toast({
        title: `Error ${isEditMode ? "updating" : "adding"} transaction`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setTransactions(prev => prev.filter(transaction => transaction.id !== id));
      
      toast({
        title: "Transaction deleted",
        description: "Your transaction has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting transaction",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
    setIsEditMode(true);
    setIsAddTransactionOpen(true);
  };

  const exportTransactions = () => {
    if (transactions.length === 0) {
      toast({
        title: "No transactions to export",
        description: "Add some transactions first before exporting.",
      });
      return;
    }
    
    // Format transactions for CSV
    const headers = [
      "Date",
      "Type",
      "Category",
      "Description",
      "Amount",
    ];
    
    const rows = transactions.map((transaction) => {
      const category = categories.find((c) => c.id === transaction.category_id);
      return [
        new Date(transaction.date).toLocaleDateString(),
        transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
        category?.name || "Uncategorized",
        transaction.description,
        transaction.amount.toFixed(2),
      ];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Define columns for the data table
  const columns = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }: any) => (
        <div>{new Date(row.original.date).toLocaleDateString()}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: any) => (
        <div className="capitalize">
          <span 
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              row.original.type === "income" 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {row.original.type}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }: any) => {
        const category = categories.find(
          (c) => c.id === row.original.category_id
        );
        return <div>{category?.name || "Uncategorized"}</div>;
      },
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => (
        <div className={`font-medium ${
          row.original.type === "income" ? "text-green-500" : "text-red-500"
        }`}>
          {row.original.type === "income" ? "+" : "-"}
          {formatCurrency(row.original.amount, profile?.currency)}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="lucide lucide-more-horizontal"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditTransaction(row.original)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDeleteTransaction(row.original.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
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
            <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">
              Manage your income and expenses
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={exportTransactions}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => {
            setIsEditMode(false);
            setCurrentTransaction(null);
            setIsAddTransactionOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {transactions.length > 0 ? (
        <div className="bg-card rounded-lg border p-4">
          <DataTable
            columns={columns}
            data={transactions}
            searchColumn="description"
            searchPlaceholder="Search transactions..."
          />
        </div>
      ) : (
        <div className="bg-card rounded-lg border p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-primary/10 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
              <Filter className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Transactions Found</h3>
            <p className="text-muted-foreground mb-4">
              You haven't recorded any transactions yet. Add your first transaction to start tracking.
            </p>
            <Button onClick={() => setIsAddTransactionOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Transaction
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            onSubmit={handleAddTransaction}
            categories={categories}
            defaultValues={
              isEditMode && currentTransaction
                ? {
                    amount: currentTransaction.amount,
                    description: currentTransaction.description,
                    date: new Date(currentTransaction.date),
                    category_id: currentTransaction.category_id,
                    type: currentTransaction.type,
                  }
                : undefined
            }
            submitLabel={isEditMode ? "Update Transaction" : "Add Transaction"}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}