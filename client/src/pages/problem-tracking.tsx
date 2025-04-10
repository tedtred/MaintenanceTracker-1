import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProblemButton, ProblemEvent, Asset } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
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
  problemDetails: z.string().optional(),
  locationName: z.string().optional(),
  // Handle assetId as either null, undefined, or a positive number
  assetId: z.union([
    z.literal(null),
    z.number().int().positive()
  ]).optional(),
  // Add timestamp field to match server schema
  timestamp: z.date().optional().default(() => new Date()),
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
      // Invalidate both problem events and work orders queries (since a work order may have been created)
      queryClient.invalidateQueries({ queryKey: ["/api/problem-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Define an interface for the solution notes form
  interface SolutionFormData {
    solutionNotes: string;
  }
  
  // Solution notes form setup for problem resolution
  const solutionForm = useForm<SolutionFormData>({
    defaultValues: {
      solutionNotes: "",
    }
  });
  
  // Resolve problem mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, solutionNotes }: { id: number, solutionNotes: string }) => {
      const response = await apiRequest("POST", `/api/problem-events/${id}/resolve`, { solutionNotes });
      const event = await response.json();
      return event;
    },
    onSuccess: () => {
      toast({
        title: "Problem resolved",
        description: "The problem has been marked as resolved",
      });
      setSelectedEvent(null);
      // Invalidate both problem events and work orders queries
      queryClient.invalidateQueries({ queryKey: ["/api/problem-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
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
      problemDetails: "",
      locationName: "",
      assetId: undefined,
      timestamp: new Date(), // Add default timestamp
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
    <div className="w-full">
      <div className="space-y-6">
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
                            <Card key={event.id} className="overflow-hidden">
                              <CardHeader className="py-3" 
                                style={{ 
                                  borderBottom: `1px solid ${button?.color || '#e5e7eb'}`, 
                                  backgroundColor: `${button?.color || '#f3f4f6'}10` 
                                }}
                              >
                                <div className="flex justify-between items-start">
                                  <CardTitle className="text-base flex items-center">
                                    <Check className="mr-2 h-4 w-4" style={{ color: button?.color }} />
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
                                  <div>
                                    Resolved by: <span className="font-medium">{event.resolvedBy ? getUserName(event.resolvedBy) : 'Unknown'}</span>
                                  </div>
                                  {event.resolvedAt && (
                                    <div>
                                      Resolved at: <span className="font-medium">{format(new Date(event.resolvedAt), "MMM d, h:mm a")}</span>
                                    </div>
                                  )}
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
      
      {/* Problem Report Dialog */}
      {isMobile ? (
        <Drawer open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DrawerContent>
            <DrawerHeader className="border-b">
              <DrawerTitle>Report Problem: {selectedButton?.label}</DrawerTitle>
              <DrawerDescription>
                Add details about the issue you're experiencing
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-6 flex-1 overflow-y-auto">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Brief Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the problem briefly..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="problemDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Detailed Information</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide additional technical details about the problem..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Include specific information like error messages, symptoms, or troubleshooting steps already tried
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="locationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Location</FormLabel>
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
                        <FormLabel className="text-base">Related Asset</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an asset (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
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
            <DrawerFooter className="border-t">
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={reportMutation.isPending}
                className="w-full"
              >
                {reportMutation.isPending ? "Reporting..." : "Submit Report"}
              </Button>
              <Button variant="outline" onClick={() => setIsReportOpen(false)}>
                Cancel
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DialogContent className="sm:max-w-[600px] md:max-w-[650px] max-h-[85vh] overflow-y-auto">
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
                      <FormLabel>Brief Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the problem briefly..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="problemDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Information</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide additional details about the problem..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include specific symptoms, error messages, or troubleshooting steps already tried
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="locationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Building A, Room 101" {...field} />
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
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select asset (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {assets.map(asset => (
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
                </div>
              </form>
            </Form>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setIsReportOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={reportMutation.isPending}
              >
                {reportMutation.isPending ? "Reporting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Problem Management Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Problem</DialogTitle>
            <DialogDescription>Review and resolve the reported issue</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{getButtonLabel(selectedEvent.buttonId)}</h2>
                  <p className="text-sm text-muted-foreground">
                    Reported on {format(new Date(selectedEvent.timestamp), "PPp")}
                  </p>
                </div>
                {!selectedEvent.resolved && (
                  <Button
                    variant="outline"
                    className="w-full md:w-auto"
                    onClick={() => {
                      solutionForm.reset();
                      solutionForm.setValue("solutionNotes", "");
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Mark as Resolved
                  </Button>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium">Problem Notes</h3>
                  <p className="text-sm mt-1">{selectedEvent.notes || "No notes provided"}</p>
                </div>
                {selectedEvent.problemDetails && (
                  <div>
                    <h3 className="font-medium">Technical Details</h3>
                    <p className="text-sm mt-1">{selectedEvent.problemDetails}</p>
                  </div>
                )}
                {selectedEvent.locationName && (
                  <div>
                    <h3 className="font-medium">Location</h3>
                    <p className="text-sm mt-1">{selectedEvent.locationName}</p>
                  </div>
                )}
                <div>
                  <h3 className="font-medium">Related Asset</h3>
                  <p>{getAssetName(selectedEvent.assetId)}</p>
                </div>
              </div>
              
              {selectedEvent.resolved ? (
                <div className="border rounded-md p-4 bg-muted/40">
                  <h3 className="font-medium flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Resolution Details
                  </h3>
                  <p className="text-sm">{selectedEvent.solutionNotes || "No solution notes provided"}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Resolved by: {selectedEvent.resolvedBy ? getUserName(selectedEvent.resolvedBy) : "System"}</span>
                    {selectedEvent.resolvedAt && (
                      <span>On {format(new Date(selectedEvent.resolvedAt), "PP")}</span>
                    )}
                  </div>
                </div>
              ) : (
                <Form {...solutionForm}>
                  <form className="space-y-4">
                    <FormField
                      control={solutionForm.control}
                      name="solutionNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resolution Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe how this problem was resolved..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Document the steps taken to fix the issue and any preventive measures for the future
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (selectedEvent) {
                          resolveMutation.mutate({
                            id: selectedEvent.id,
                            solutionNotes: solutionForm.getValues().solutionNotes,
                          });
                        }
                      }}
                      disabled={resolveMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {resolveMutation.isPending ? (
                        <span className="flex items-center">
                          Resolving...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Check className="mr-2 h-4 w-4" />
                          Mark as Resolved
                        </span>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedEvent(null)}
            >
              Close
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
              Manage problem reporting buttons and their associated work orders
            </DialogDescription>
          </DialogHeader>
          <div>
            <Button variant="outline" size="sm" className="mb-4" onClick={() => window.location.href = '/problem-tracking-admin'}>
              <Settings className="mr-2 h-4 w-4" /> 
              Open Problem Button Configuration
            </Button>
            <p className="text-sm text-muted-foreground">
              Configure button labels, colors, and work order integration in the full configuration panel.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}