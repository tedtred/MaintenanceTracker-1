import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  User, 
  UserRole, 
  AvailablePages, 
  ProblemButton, 
  WeekDay, 
  Settings, 
  insertSettingsSchema 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarNav } from "@/components/sidebar-nav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Trash2, 
  Search, 
  Check, 
  Shield, 
  AlertTriangle, 
  Wrench, 
  BarChart2, 
  AlertCircle, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  PencilIcon, 
  Save, 
  X,
  UserCog,
  Settings2 as SettingsIcon,
  Clock,
  Calendar,
  Bell,
  Palette,
  Building,
  CalendarDays,
  WrenchIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { HexColorPicker } from "react-colorful";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

// Page Permissions Dialog Component
function PagePermissionsDialog({ user }: { user: User }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  // Format page titles for better display
  const formatPageTitle = (pageId: string) => {
    return pageId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Page list from AvailablePages
  const pages = Object.values(AvailablePages);

  // Parse saved permissions when dialog opens
  const handleDialogOpen = () => {
    try {
      const userPermissions = JSON.parse(user.pagePermissions || '[]');
      setSelectedPermissions(userPermissions);
    } catch (error) {
      setSelectedPermissions([]);
      console.error("Error parsing user permissions:", error);
    }
    setOpen(true);
  };

  // Save permissions
  const handleSavePermissions = async () => {
    try {
      await apiRequest("PATCH", `/api/admin/users/${user.id}/permissions`, {
        permissions: selectedPermissions
      });
      
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      toast({
        title: "Success",
        description: "Page permissions updated successfully",
      });
      
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update page permissions",
        variant: "destructive",
      });
    }
  };

  // Toggle a page permission
  const togglePermission = (pageId: string) => {
    setSelectedPermissions(current => 
      current.includes(pageId)
        ? current.filter(id => id !== pageId)
        : [...current, pageId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          onClick={handleDialogOpen}
          title="Manage page access"
        >
          <Shield className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Page Access for {user.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-3 mt-2">
            {pages.map(pageId => (
              <div key={pageId} className="flex items-center space-x-2">
                <Checkbox 
                  id={`permission-${pageId}`}
                  checked={selectedPermissions.includes(pageId)}
                  onCheckedChange={() => togglePermission(pageId)}
                />
                <Label htmlFor={`permission-${pageId}`}>
                  {formatPageTitle(pageId)}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSavePermissions}>
            Save Permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// User Administration Component
function UserManagementSection() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all users
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      return response.json();
    },
  });

  // Fetch pending users
  const { data: pendingUsers, isLoading: isLoadingPending } = useQuery<User[]>({
    queryKey: ["/api/admin/pending-users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/pending-users");
      return response.json();
    },
  });

  // Filter users based on search query
  const filteredUsers = users?.filter(user => 
    user.approved && user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPendingUsers = pendingUsers?.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update user role
  const handleRoleUpdate = async (userId: number, newRole: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/users/${userId}`, {
        role: newRole,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  // Approve user
  const handleApproveUser = async (userId: number) => {
    try {
      await apiRequest("PATCH", `/api/admin/users/${userId}/approve`);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User approved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  if (isLoadingUsers || isLoadingPending) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/4 bg-muted rounded"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Active Users</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approvals
            {filteredPendingUsers?.length ? (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {filteredPendingUsers.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          defaultValue={user.role}
                          onValueChange={(value) => handleRoleUpdate(user.id, value)}
                          disabled={user.id === currentUser?.id}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                            <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                            <SelectItem value={UserRole.TECHNICIAN}>Technician</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Page Permissions Dialog - only for non-admin users */}
                        {user.role !== UserRole.ADMIN && user.id !== currentUser?.id && (
                          <PagePermissionsDialog user={user} />
                        )}

                        {user.id !== currentUser?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.username}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPendingUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleApproveUser(user.id)}
                          variant="default"
                          size="sm"
                        >
                          Approve User
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Pending User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.username}'s pending registration? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Problem Button Configuration Component
function ProblemButtonSection() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedButton, setSelectedButton] = useState<ProblemButton | null>(null);
  
  // Form schema
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
  
  // Query for problem buttons
  const { data: buttons = [], isLoading } = useQuery<ProblemButton[]>({
    queryKey: ["/api/problem-buttons"],
  });
  
  // Create button mutation
  const createMutation = useMutation({
    mutationFn: async (data: ButtonFormData) => {
      // Convert "none" to null or undefined for backend
      const processedData = {
        ...data,
        icon: data.icon === "none" ? null : data.icon
      };
      const response = await apiRequest("POST", "/api/problem-buttons", processedData);
      return await response.json() as ProblemButton;
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
      return await response.json() as ProblemButton;
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
      icon: "none",
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
      icon: "none",
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
      // Convert "none" to null or undefined for backend
      const processedData = {
        ...data,
        icon: data.icon === "none" ? null : data.icon
      };
      updateMutation.mutate({
        id: selectedButton.id,
        data: processedData
      });
    }
  };
  
  // Open edit dialog
  const openEditDialog = (button: ProblemButton) => {
    setSelectedButton(button);
    editForm.reset({
      label: button.label,
      color: button.color,
      icon: button.icon || "none",
      active: button.active,
    });
    setIsEditOpen(true);
  };
  
  // Sort buttons by order
  const sortedButtons = [...buttons].sort((a, b) => a.order - b.order);
  
  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-1/4 bg-muted rounded"></div>
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">Configure problem reporting buttons for users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = "/problem-tracking"}>
            View Problem Tracking
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
          {sortedButtons.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No problem buttons have been created yet</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Button
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
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
                        {(!button.icon || button.icon === "none") && <AlertCircle className="h-4 w-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{button.label}</h3>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <div>Color: {button.color}</div>
                          {button.icon && button.icon !== "none" && <div>Icon: {button.icon}</div>}
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
                        <SelectItem value="none">None</SelectItem>
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
            <Button onClick={createForm.handleSubmit(handleCreateButton)}>
              <Save className="mr-2 h-4 w-4" />
              Create
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
                      <Input placeholder="e.g., Equipment Failure" {...field} />
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
                        <SelectItem value="none">None</SelectItem>
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
            <Button onClick={editForm.handleSubmit(handleEditButton)}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// System Settings Component
function SystemSettingsSection() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("schedule");
  const [holidays, setHolidays] = useState<{
    id: string;
    name: string;
    date: string;
    isRecurringYearly: boolean;
  }[]>([]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/settings");
      return response.json();
    }
  });
  
  // Parse holiday calendar data when settings load
  React.useEffect(() => {
    if (settings?.holidayCalendar) {
      try {
        const parsedHolidays = JSON.parse(settings.holidayCalendar);
        if (Array.isArray(parsedHolidays)) {
          setHolidays(parsedHolidays);
        }
      } catch (error) {
        console.error("Failed to parse holiday calendar data:", error);
      }
    }
  }, [settings]);

  const form = useForm({
    defaultValues: settings || {
      // Work Schedule
      workWeekStart: 1,
      workWeekEnd: 5,
      workDayStart: "09:00",
      workDayEnd: "17:00",
      
      // Date & Time
      timeZone: "UTC",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "HH:mm",
      
      // Notifications
      emailNotifications: true,
      maintenanceDueReminder: 1,
      criticalAlertsOnly: false,
      
      // Appearance
      theme: "system",
      accentColor: "#0284c7",
      
      // Company
      companyName: "",
      companyLogo: "",
      
      // Holiday Calendar
      holidayCalendar: "[]"
    }
  });

  const addHoliday = () => {
    const newHoliday = {
      id: Math.random().toString(36).substring(2, 9),
      name: "",
      date: new Date().toISOString().split('T')[0],
      isRecurringYearly: false
    };
    setHolidays([...holidays, newHoliday]);
  };

  const updateHoliday = (id: string, field: string, value: any) => {
    setHolidays(holidays.map(holiday => 
      holiday.id === id ? { ...holiday, [field]: value } : holiday
    ));
  };

  const removeHoliday = (id: string) => {
    setHolidays(holidays.filter(holiday => holiday.id !== id));
  };

  // Update form with holidays before submit
  const prepareSubmitData = (formData: any) => {
    return {
      ...formData,
      holidayCalendar: JSON.stringify(holidays)
    };
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    const updatedData = prepareSubmitData(data);
    mutation.mutate(updatedData);
  };

  const settingsSections = [
    {
      id: "schedule",
      title: "Work Schedule",
      icon: <Clock className="mr-2 h-4 w-4" />,
    },
    {
      id: "dateTime",
      title: "Date & Time",
      icon: <Calendar className="mr-2 h-4 w-4" />,
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: <Bell className="mr-2 h-4 w-4" />,
    },
    {
      id: "appearance",
      title: "Appearance",
      icon: <Palette className="mr-2 h-4 w-4" />,
    },
    {
      id: "company",
      title: "Company Profile",
      icon: <Building className="mr-2 h-4 w-4" />,
    },
    {
      id: "holidays",
      title: "Holiday Calendar",
      icon: <CalendarDays className="mr-2 h-4 w-4" />,
    },
  ];

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-1/4 bg-muted rounded"></div>
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Configure your system settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Settings Navigation Sidebar */}
            <aside className="md:w-1/5">
              <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 overflow-auto md:sticky md:top-4">
                {settingsSections.map((section) => (
                  <Button
                    key={section.id}
                    variant={activeTab === section.id ? "secondary" : "ghost"}
                    className={cn(
                      "justify-start",
                      activeTab === section.id && "bg-muted"
                    )}
                    onClick={() => setActiveTab(section.id)}
                  >
                    {section.icon}
                    {section.title}
                  </Button>
                ))}
              </nav>
            </aside>

            {/* Settings Content */}
            <div className="flex-1">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  
                  {/* Work Schedule Section */}
                  {activeTab === "schedule" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Work Week */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Work Week</h3>
                          <FormField
                            control={form.control}
                            name="workWeekStart"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Week Starts On</FormLabel>
                                <Select 
                                  onValueChange={val => field.onChange(parseInt(val))} 
                                  defaultValue={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.entries(WeekDay).map(([key, value]) => (
                                      <SelectItem key={value} value={value.toString()}>
                                        {key.charAt(0) + key.slice(1).toLowerCase()}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="workWeekEnd"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Week Ends On</FormLabel>
                                <Select 
                                  onValueChange={val => field.onChange(parseInt(val))} 
                                  defaultValue={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.entries(WeekDay).map(([key, value]) => (
                                      <SelectItem key={value} value={value.toString()}>
                                        {key.charAt(0) + key.slice(1).toLowerCase()}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Work Hours */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Work Hours</h3>
                          <FormField
                            control={form.control}
                            name="workDayStart"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Work Day Start</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="workDayEnd"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Work Day End</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date & Time Section */}
                  {activeTab === "dateTime" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="timeZone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time Zone</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="h-[300px]">
                                  {Intl.supportedValuesOf('timeZone').map((tz) => (
                                    <SelectItem key={tz} value={tz}>
                                      {tz}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Select your organization's primary time zone
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="dateFormat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date Format</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (EU)</SelectItem>
                                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Other tabs would follow the same pattern */}
                  
                  <Button type="submit" className="mt-4">Save Settings</Button>
                </form>
              </Form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    return (
      <div className="flex h-screen items-center justify-center">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Administration Panel</h1>
          <p className="text-muted-foreground mb-6">Manage all aspects of your application</p>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="mb-4">
              <TabsTrigger value="users">
                <UserCog className="h-4 w-4 mr-2" />
                User Administration
              </TabsTrigger>
              <TabsTrigger value="problemButtons">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Problem Tracking
              </TabsTrigger>
              <TabsTrigger value="settings">
                <SettingsIcon className="h-4 w-4 mr-2" />
                System Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="space-y-4">
              <UserManagementSection />
            </TabsContent>
            
            <TabsContent value="problemButtons" className="space-y-4">
              <ProblemButtonSection />
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <SystemSettingsSection />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}