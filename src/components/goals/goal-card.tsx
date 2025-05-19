import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Database } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];

interface GoalCardProps {
  goal: SavingsGoal;
  currency: string;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (id: string) => void;
  onContribute: (goal: SavingsGoal) => void;
}

export function GoalCard({ 
  goal, 
  currency, 
  onEdit, 
  onDelete, 
  onContribute 
}: GoalCardProps) {
  const percentage = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
  const IconComponent = goal.icon ? require("lucide-react")[goal.icon] : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {IconComponent && (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: goal.color + "20" }} 
              >
                <IconComponent 
                  className="h-5 w-5" 
                  style={{ color: goal.color }}
                />
              </div>
            )}
            <div>
              <h3 className="font-semibold">{goal.name}</h3>
              {goal.target_date && (
                <p className="text-xs text-muted-foreground">
                  Target: {new Date(goal.target_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onEdit(goal)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDelete(goal.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 pt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">
            {formatCurrency(goal.current_amount, currency)}
          </span>
          <span className="text-sm font-medium">
            {formatCurrency(goal.target_amount, currency)}
          </span>
        </div>
        <Progress value={percentage} className="h-2" />
        <p className="mt-2 text-xs text-center text-muted-foreground">
          {percentage}% complete
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          size="sm"
          onClick={() => onContribute(goal)}
        >
          Add funds
        </Button>
      </CardFooter>
    </Card>
  );
}