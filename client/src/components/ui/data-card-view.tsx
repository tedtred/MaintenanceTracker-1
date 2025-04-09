import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export interface DataField {
  label: string;
  value: string | number | ReactNode;
  type?: "text" | "badge" | "date" | "component";
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

interface DataCardViewProps<T> {
  data: T[];
  fields: DataField[];
  onRowClick?: (item: T) => void;
  actions?: (item: T) => ReactNode;
  keyField: keyof T;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function DataCardView<T>({
  data,
  fields,
  onRowClick,
  actions,
  keyField,
  className,
  emptyMessage = "No data available",
  isLoading,
}: DataCardViewProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-4">
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex justify-between items-center">
                    <div className="w-1/3 h-4 bg-muted rounded"></div>
                    <div className="w-1/2 h-4 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn("text-center py-8", className)}>
        <div className="text-muted-foreground">{emptyMessage}</div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((item) => (
        <Card
          key={String(item[keyField])}
          className={cn(
            "transition-colors",
            onRowClick && "cursor-pointer hover:bg-muted/30"
          )}
          onClick={() => onRowClick && onRowClick(item)}
        >
          <CardContent className="py-4">
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex justify-between items-center text-sm",
                    field.className
                  )}
                >
                  <span className="font-medium text-muted-foreground">
                    {field.label}
                  </span>
                  {renderFieldValue(field)}
                </div>
              ))}
            </div>
          </CardContent>
          {actions && (
            <CardFooter className="flex justify-end gap-2 pt-0 pb-3">
              {actions(item)}
            </CardFooter>
          )}
          {onRowClick && !actions && (
            <CardFooter className="flex justify-end pt-0 pb-3">
              <Button variant="ghost" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );

  function renderFieldValue(field: DataField) {
    switch (field.type) {
      case "badge":
        return (
          <Badge variant={field.badgeVariant || "default"}>
            {field.value}
          </Badge>
        );
      case "date":
        // Format date if it's a date string or date object
        if (typeof field.value === "string" || field.value instanceof Date) {
          try {
            const date = new Date(field.value);
            return <span>{date.toLocaleDateString()}</span>;
          } catch (e) {
            return <span>{field.value}</span>;
          }
        }
        return <span>{field.value}</span>;
      case "component":
        return <>{field.value}</>;
      default:
        return <span className="font-medium">{field.value}</span>;
    }
  }
}