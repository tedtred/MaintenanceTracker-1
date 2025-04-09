import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SidebarNav } from "@/components/sidebar-nav";
import { ProblemButton } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HexColorPicker } from "react-colorful";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Wrench, BarChart2, AlertCircle, Trash2, Plus, ArrowUp, ArrowDown, PencilIcon, Save, X } from "lucide-react";

// Define form schema
const buttonFormSchema = z.object({
  label: z.string().min(1, "Label is required"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  icon: z.string().optional(),
  active: z.boolean().default(true),
});

type ButtonFormData = z.infer<typeof buttonFormSchema>;

// Icons available for selection
const availableIcons = [
  { value: "AlertTriangle", label: "Alert Triangle", icon: <AlertTriangle className="h-4 w-4" /> },
  { value: "Wrench", label: "Wrench", icon: <Wrench className="h-4 w-4" /> },
  { value: "BarChart2", label: "Bar Chart", icon: <BarChart2 className="h-4 w-4" /> },
  { value: "AlertCircle", label: "Alert Circle", icon: <AlertCircle className="h-4 w-4" /> },
];

export default function ProblemTrackingAdmin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedButton, setSelectedButton] = useState<ProblemButton | null>(null);
  
  // Redirect non-admin users
  if (user?.role !== "ADMIN") {
    typeof window !== "undefined" && (window.location.href = "/problem-tracking");
    return null;
  }
  
  // Query for problem buttons
  const { data: buttons = [], isLoading } = useQuery<ProblemButton[]>({
    queryKey: ["/api/problem-buttons"],
  });
  
  // Create button mutation
  const createMutation = useMutation({
    mutationFn: async (data: ButtonFormData) => {
      const response = await apiRequest("POST", "/api/problem-buttons", data);
      const button = await response.json();
      return button;
    },
    onSuccess: () => {
      toast({
        title: "Button created",
        description: "The problem button has been created successfully",
      });
      setIsCreateOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/problem-buttons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update button mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProblemButton> }) => {
      const response = await apiRequest("PATCH", `/api/problem-buttons/${id}`, data);
      const button = await response.json();
      return button;
    },
    onSuccess: () => {
      toast({
        title: "Button updated",
        description: "The problem button has been updated successfully",
      });
      setIsEditOpen(false);
      setSelectedButton(null);
      queryClient.invalidateQueries({ queryKey: ["/api/problem-buttons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete button mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/problem-buttons/${id}`);
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Button deleted",
        description: "The problem button has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/problem-buttons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Reorder button mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: "up" | "down" }) => {
      const currentButton = buttons.find(b => b.id === id);
      
      if (!currentButton) {
        throw new Error("Button not found");
      }
      
      const currentIndex = buttons.findIndex(b => b.id === id);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      
      // Make sure we're not going out of bounds
      if (targetIndex < 0 || targetIndex >= buttons.length) {
        return { success: false };
      }
      
      const targetButton = buttons[targetIndex];
      
      // Swap orders
      await updateMutation.mutateAsync({
        id: currentButton.id,
        data: { order: targetButton.order }
      });
      
      await updateMutation.mutateAsync({
        id: targetButton.id,
        data: { order: currentButton.order }
      });
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problem-buttons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form setup for create button
  const createForm = useForm<ButtonFormData>({
    resolver: zodResolver(buttonFormSchema),
    defaultValues: {
      label: "",
      color: "#6b7280",
      active: true,
    },
  });
  
  // Form setup for edit button
  const editForm = useForm<ButtonFormData>({
    resolver: zodResolver(buttonFormSchema),
    defaultValues: {
      label: "",
      color: "#6b7280",
      active: true,
    },
  });
  
  // Handle creating a new button
  const handleCreateButton = (data: ButtonFormData) => {
    createMutation.mutate(data);
  };
  
  // Handle editing a button
  const handleEditButton = (data: ButtonFormData) => {
    if (selectedButton) {
      updateMutation.mutate({
        id: selectedButton.id,
        data
      });
    }
  };
  
  // Open edit dialog
  const openEditDialog = (button: ProblemButton) => {
    setSelectedButton(button);
    editForm.reset({
      label: button.label,
      color: button.color,
      icon: button.icon || undefined,
      active: button.active,
    });
    setIsEditOpen(true);
  };
  
  // Sort buttons by order
  const sortedButtons = [...buttons].sort((a, b) => a.order - b.order);
  
  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Problem Button Configuration</h1>
              <p className="text-muted-foreground">Manage the problem reporting buttons</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.href = "/problem-tracking"}>
                Back to Problem Tracking
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Button
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Problem Buttons</CardTitle>
              <CardDescription>
                Configure buttons that users will see when reporting problems
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8">Loading buttons...</p>
              ) : sortedButtons.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No problem buttons have been created yet</p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Button
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {sortedButtons.map((button) => (
                      <Card key={button.id} className="overflow-hidden">
                        <div className="flex items-center p-4">
                          <div 
                            className="w-8 h-8 rounded-md mr-4 flex items-center justify-center" 
                            style={{ backgroundColor: button.color }}
                          >
                            {button.icon === "AlertTriangle" && <AlertTriangle className="h-4 w-4 text-white" />}
                            {button.icon === "Wrench" && <Wrench className="h-4 w-4 text-white" />}
                            {button.icon === "BarChart2" && <BarChart2 className="h-4 w-4 text-white" />}
                            {button.icon === "AlertCircle" && <AlertCircle className="h-4 w-4 text-white" />}
                            {!button.icon && <AlertCircle className="h-4 w-4 text-white" />}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{button.label}</h3>
                            <div className="text-sm text-muted-foreground flex items-center gap-4">
                              <div>Color: {button.color}</div>
                              {button.icon && <div>Icon: {button.icon}</div>}
                              <div>Status: {button.active ? 'Active' : 'Inactive'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => reorderMutation.mutate({ id: button.id, direction: "up" })}
                              disabled={sortedButtons.indexOf(button) === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => reorderMutation.mutate({ id: button.id, direction: "down" })}
                              disabled={sortedButtons.indexOf(button) === sortedButtons.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(button)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${button.label}"?`)) {
                                  deleteMutation.mutate(button.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Create Button Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Problem Button</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateButton)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Label</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Equipment Failure" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Color</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input {...field} />
                        <HexColorPicker color={field.value} onChange={(color) => field.onChange(color)} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {availableIcons.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            <div className="flex items-center">
                              {icon.icon}
                              <span className="ml-2">{icon.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Whether this button is visible to users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={createForm.handleSubmit(handleCreateButton)}
              disabled={createMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "Creating..." : "Create Button"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Button Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Problem Button</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditButton)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Label</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Color</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input {...field} />
                        <HexColorPicker color={field.value} onChange={(color) => field.onChange(color)} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {availableIcons.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            <div className="flex items-center">
                              {icon.icon}
                              <span className="ml-2">{icon.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Whether this button is visible to users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={editForm.handleSubmit(handleEditButton)}
              disabled={updateMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}