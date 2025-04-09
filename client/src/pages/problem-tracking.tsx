import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SidebarNav } from "@/components/sidebar-nav";
import { ProblemButton, ProblemEvent, Asset } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { AlertTriangle, AlertCircle, BarChart2, Wrench, Check, Plus, X, Settings } from "lucide-react";

// Define form schema
const problemReportSchema = z.object({
  buttonId: z.number().int().positive("Button selection is required"),
  notes: z.string().optional(),
  locationName: z.string().optional(),
  assetId: z.number().int().positive().optional(),
});

type ProblemReportData = z.infer<typeof problemReportSchema>;

export default function ProblemTracking() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("report");
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ProblemEvent | null>(null);
  const [selectedButton, setSelectedButton] = useState<ProblemButton | null>(null);
  
  // Query for problem buttons
  const { data: buttons = [] } = useQuery<ProblemButton[]>({
    queryKey: ["/api/problem-buttons"],
  });
  
  // Query for problem events (reports)
  const { data: events = [] } = useQuery<ProblemEvent[]>({
    queryKey: ["/api/problem-events"],
  });
  
  // Query for assets
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });
  
  // Active buttons only
  const activeButtons = buttons.filter(button => button.active);
  
  // Group buttons into rows of 2
  const buttonRows = isMobile ? 
    activeButtons.map(button => [button]) : 
    activeButtons.reduce<ProblemButton[][]>((rows, button, index) => {
      if (index % 2 === 0) {
        rows.push([button]);
      } else {
        rows[rows.length - 1].push(button);
      }
      return rows;
    }, []);
  
  // Report problem mutation
  const reportMutation = useMutation({
    mutationFn: async (data: ProblemReportData) => {
      const response = await apiRequest("POST", "/api/problem-events", data);
      const event = await response.json();
      return event;
    },
    onSuccess: () => {
      toast({
        title: "Problem reported",
        description: "Your report has been submitted successfully",
      });
      setIsReportOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/problem-events"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Resolve problem mutation
  const resolveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/problem-events/${id}/resolve`);
      const event = await response.json();
      return event;
    },
    onSuccess: () => {
      toast({
        title: "Problem resolved",
        description: "The problem has been marked as resolved",
      });
      setSelectedEvent(null);
      queryClient.invalidateQueries({ queryKey: ["/api/problem-events"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form setup
  const form = useForm<ProblemReportData>({
    resolver: zodResolver(problemReportSchema),
    defaultValues: {
      notes: "",
      locationName: "",
    },
  });
  
  // Handle problem button click
  const handleButtonClick = (button: ProblemButton) => {
    setSelectedButton(button);
    form.setValue("buttonId", button.id);
    setIsReportOpen(true);
  };
  
  // Handle form submit
  const onSubmit = (data: ProblemReportData) => {
    const button = buttons.find(b => b.id === data.buttonId);
    
    // Check if we should create a work order alongside the problem event
    const workOrderData = button?.createWorkOrder ? {
      // Include work order creation data with the problem report
      createWorkOrder: true,
      workOrderTitle: button.workOrderTitle || '',
      workOrderDescription: button.workOrderDescription || '',
      workOrderPriority: button.workOrderPriority || 'MEDIUM',
      defaultAssetId: data.assetId || button.defaultAssetId,
      notifyMaintenance: button.notifyMaintenance || false,
    } : {};
    
    // Show feedback about work order creation if enabled
    if (button?.createWorkOrder) {
      toast({
        title: "Creating Work Order",
        description: `A work order will be automatically created for this problem`,
      });
    }
    
    // Combine the problem report with the work order data if needed
    reportMutation.mutate({
      ...data,
      ...workOrderData
    });
  };
  
  // Status counts for stats
  const openProblems = events.filter(event => !event.resolved).length;
  const resolvedProblems = events.filter(event => event.resolved).length;
  const highPriorityProblems = events.filter(event => !event.resolved && buttons.find(b => b.id === event.buttonId)?.label.toLowerCase().includes("critical")).length;
  
  // Get button label by ID
  const getButtonLabel = (buttonId: number) => {
    const button = buttons.find(b => b.id === buttonId);
    return button ? button.label : "Unknown";
  };
  
  // Get asset name by ID
  const getAssetName = (assetId: number | null) => {
    if (!assetId) return "None";
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : "Unknown";
  };
  
  // Get user name by ID
  const getUserName = (userId: number) => {
    return userId === user?.id ? "You" : `User #${userId}`;
  };
  
  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Problem Tracking</h1>
              <p className="text-muted-foreground">Report and monitor operational issues</p>
            </div>
            {user?.role === "ADMIN" && (
              <Button variant="outline" onClick={() => setIsAdminOpen(true)}>
                <Settings className="mr-2 h-4 w-4" /> Configure Buttons
              </Button>
            )}
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Open Problems</CardTitle>
                <CardDescription>Issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
                  {openProblems}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Critical Issues</CardTitle>
                <CardDescription>High priority problems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                  {highPriorityProblems}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Resolved Problems</CardTitle>
                <CardDescription>Issues fixed this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  {resolvedProblems}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList>
              <TabsTrigger value="report">Report Problem</TabsTrigger>
              <TabsTrigger value="active">Active Problems</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
            
            <TabsContent value="report">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Problem Reporting</CardTitle>
                  <CardDescription>
                    Tap/click a button to report a problem
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {buttonRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {row.map((button) => (
                        <Button
                          key={button.id}
                          variant="outline"
                          className="h-16 flex justify-start px-4"
                          style={{ 
                            borderColor: button.color,
                            background: `${button.color}10`
                          }}
                          onClick={() => handleButtonClick(button)}
                        >
                          {button.icon ? (
                            <span className="mr-2 flex items-center justify-center text-lg">
                              {button.icon === "AlertTriangle" && <AlertTriangle className="h-5 w-5" />}
                              {button.icon === "Wrench" && <Wrench className="h-5 w-5" />}
                              {button.icon === "BarChart2" && <BarChart2 className="h-5 w-5" />}
                            </span>
                          ) : (
                            <AlertCircle className="mr-2 h-5 w-5" style={{ color: button.color }} />
                          )}
                          <span className="font-medium">{button.label}</span>
                        </Button>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="active">
              <Card>
                <CardHeader>
                  <CardTitle>Active Problems</CardTitle>
                  <CardDescription>
                    Current issues requiring attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {events.filter(event => !event.resolved).length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No active problems
                        </p>
                      ) : (
                        events
                          .filter(event => !event.resolved)
                          .map(event => {
                            const button = buttons.find(b => b.id === event.buttonId);
                            return (
                              <Card key={event.id} className="overflow-hidden">
                                <CardHeader className="py-3" 
                                  style={{ 
                                    borderBottom: `1px solid ${button?.color || '#e5e7eb'}`, 
                                    backgroundColor: `${button?.color || '#f3f4f6'}10` 
                                  }}
                                >
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-base flex items-center">
                                      <AlertCircle className="mr-2 h-4 w-4" style={{ color: button?.color }} />
                                      {getButtonLabel(event.buttonId)}
                                    </CardTitle>
                                    <div className="text-xs text-muted-foreground">
                                      {format(new Date(event.timestamp), "MMM d, h:mm a")}
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="py-3">
                                  {event.notes && (
                                    <p className="text-sm mb-2">{event.notes}</p>
                                  )}
                                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                    {event.locationName && (
                                      <div>
                                        Location: <span className="font-medium">{event.locationName}</span>
                                      </div>
                                    )}
                                    {event.assetId && (
                                      <div>
                                        Asset: <span className="font-medium">{getAssetName(event.assetId)}</span>
                                      </div>
                                    )}
                                    <div>
                                      Reported by: <span className="font-medium">{getUserName(event.userId)}</span>
                                    </div>
                                  </div>
                                </CardContent>
                                <CardFooter className="border-t bg-muted/30 py-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="ml-auto"
                                    onClick={() => setSelectedEvent(event)}
                                  >
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Manage
                                  </Button>
                                </CardFooter>
                              </Card>
                            );
                          })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="resolved">
              <Card>
                <CardHeader>
                  <CardTitle>Resolved Problems</CardTitle>
                  <CardDescription>
                    Issues that have been fixed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {events.filter(event => event.resolved).length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No resolved problems
                        </p>
                      ) : (
                        events
                          .filter(event => event.resolved)
                          .map(event => {
                            const button = buttons.find(b => b.id === event.buttonId);
                            return (
                              <Card key={event.id} className="overflow-hidden opacity-70">
                                <CardHeader className="py-3" 
                                  style={{ 
                                    borderBottom: `1px solid ${button?.color || '#e5e7eb'}`, 
                                    backgroundColor: `${button?.color || '#f3f4f6'}10` 
                                  }}
                                >
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-base flex items-center">
                                      <Check className="mr-2 h-4 w-4 text-green-500" />
                                      {getButtonLabel(event.buttonId)}
                                    </CardTitle>
                                    <div className="text-xs text-muted-foreground">
                                      Resolved: {event.resolvedAt && format(new Date(event.resolvedAt), "MMM d, h:mm a")}
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="py-3">
                                  {event.notes && (
                                    <p className="text-sm mb-2">{event.notes}</p>
                                  )}
                                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                    {event.locationName && (
                                      <div>
                                        Location: <span className="font-medium">{event.locationName}</span>
                                      </div>
                                    )}
                                    {event.assetId && (
                                      <div>
                                        Asset: <span className="font-medium">{getAssetName(event.assetId)}</span>
                                      </div>
                                    )}
                                    <div>
                                      Resolved by: <span className="font-medium">
                                        {event.resolvedBy ? getUserName(event.resolvedBy) : "Unknown"}
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Problem Report Dialog */}
      {isMobile ? (
        <Drawer open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Report Problem: {selectedButton?.label}</DrawerTitle>
              <DrawerDescription>
                Add details about the issue you're experiencing
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the problem..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="locationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Building A, Room 101"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="assetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related Asset</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an asset (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assets.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id.toString()}>
                                {asset.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
            <DrawerFooter>
              <Button 
                type="submit" 
                onClick={form.handleSubmit(onSubmit)}
                disabled={reportMutation.isPending}
              >
                {reportMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
              <Button variant="outline" onClick={() => setIsReportOpen(false)}>
                Cancel
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Problem: {selectedButton?.label}</DialogTitle>
              <DialogDescription>
                Add details about the issue you're experiencing
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the problem..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="locationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Building A, Room 101"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Asset</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an asset (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assets.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id.toString()}>
                              {asset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={form.handleSubmit(onSubmit)}
                disabled={reportMutation.isPending}
              >
                {reportMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Event Management Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Problem</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Problem Type</h3>
                <p>{getButtonLabel(selectedEvent.buttonId)}</p>
              </div>
              
              {selectedEvent.notes && (
                <div>
                  <h3 className="font-medium">Description</h3>
                  <p>{selectedEvent.notes}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {selectedEvent.locationName && (
                  <div>
                    <h3 className="font-medium">Location</h3>
                    <p>{selectedEvent.locationName}</p>
                  </div>
                )}
                
                {selectedEvent.assetId && (
                  <div>
                    <h3 className="font-medium">Related Asset</h3>
                    <p>{getAssetName(selectedEvent.assetId)}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium">Reported By</h3>
                  <p>{getUserName(selectedEvent.userId)}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Reported At</h3>
                  <p>{format(new Date(selectedEvent.timestamp), "MMM d, h:mm a")}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedEvent(null)}
            >
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
            <Button 
              variant="default" 
              onClick={() => selectedEvent && resolveMutation.mutate(selectedEvent.id)}
              disabled={resolveMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              {resolveMutation.isPending ? "Resolving..." : "Mark as Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Admin Config Dialog */}
      <Dialog open={isAdminOpen} onOpenChange={setIsAdminOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Configure Problem Buttons</DialogTitle>
            <DialogDescription>
              Manage the quick problem reporting buttons
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Button 
              className="mb-4" 
              variant="outline" 
              onClick={() => window.location.href = "/problem-tracking-admin"}
            >
              <Settings className="mr-2 h-4 w-4" />
              Open Button Configuration
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Configure the problem reporting buttons, including their labels, colors, and icons. Changes will be reflected immediately in the problem reporting interface.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdminOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}