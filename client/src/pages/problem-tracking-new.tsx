import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { ProblemButton, ProblemEvent } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { 
  AlertTriangle, 
  AlertCircle, 
  BarChart2, 
  Wrench, 
  Check, 
  Plus, 
  X, 
  Settings, 
  Loader2 
} from "lucide-react";

// Import our modular hooks and components
import { 
  useProblemTracking, 
  problemReportSchema, 
  ProblemReportData,
  SolutionFormData,
  useAssets
} from "@/hooks/use-problem-tracking-data";
import { DataLoader, MultiQueryLoader } from "@/components/data-loader";

// UI Components
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

export default function ProblemTracking() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("report");
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ProblemEvent | null>(null);
  const [selectedButton, setSelectedButton] = useState<ProblemButton | null>(null);
  
  // Use our modular hooks
  const {
    buttonsQuery,
    eventsQuery,
    getActiveButtons,
    getButtonRows,
    getButtonLabel,
    getButtonById,
    getProblemStats,
    getFilteredEvents,
    reportProblemMutation,
    resolveProblemMutation
  } = useProblemTracking();
  
  const { assetsQuery, getAssetName } = useAssets();
  
  // Form setup for problem reporting
  const form = useForm<ProblemReportData>({
    resolver: zodResolver(problemReportSchema),
    defaultValues: {
      notes: "",
      problemDetails: "",
      locationName: "",
      assetId: undefined,
      timestamp: new Date(),
    },
  });
  
  // Solution notes form setup for problem resolution
  const solutionForm = useForm<SolutionFormData>({
    defaultValues: {
      solutionNotes: "",
    }
  });
  
  // Handle problem button click
  const handleButtonClick = (button: ProblemButton) => {
    setSelectedButton(button);
    form.setValue("buttonId", button.id);
    setIsReportOpen(true);
  };
  
  // Handle form submit for problem reporting
  const onSubmit = (data: ProblemReportData) => {
    const button = selectedButton;
    
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
    reportProblemMutation.mutate({
      ...data,
      ...workOrderData
    }, {
      onSuccess: () => {
        toast({
          title: "Problem reported",
          description: "Your report has been submitted successfully",
        });
        setIsReportOpen(false);
        form.reset();
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };
  
  // Handle problem resolution
  const handleResolve = (id: number, solutionNotes: string) => {
    resolveProblemMutation.mutate({ id, solutionNotes }, {
      onSuccess: () => {
        toast({
          title: "Problem resolved",
          description: "The problem has been marked as resolved",
        });
        setSelectedEvent(null);
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };
  
  // Get user name by ID
  const getUserName = (userId: number) => {
    return userId === user?.id ? "You" : `User #${userId}`;
  };
  
  // Get the problem stats
  const { openProblems, resolvedProblems, highPriorityProblems } = getProblemStats();
  
  // Get button rows based on mobile status
  const buttonRows = getButtonRows(isMobile ? 1 : 2);
  
  // Render the main content
  const renderContent = () => {
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
                      {getFilteredEvents(false).length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No active problems
                        </p>
                      ) : (
                        getFilteredEvents(false).map(event => {
                          const button = getButtonById(event.buttonId);
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
                                  Resolve
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
                      {getFilteredEvents(true).length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No resolved problems
                        </p>
                      ) : (
                        getFilteredEvents(true).map(event => {
                          const button = getButtonById(event.buttonId);
                          return (
                            <Card key={event.id} className="overflow-hidden border-muted">
                              <CardHeader className="py-3 border-b bg-muted/30">
                                <div className="flex justify-between items-start">
                                  <CardTitle className="text-base flex items-center">
                                    <Check className="mr-2 h-4 w-4 text-green-500" />
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
                                {event.solutionNotes && (
                                  <div className="mt-3 p-3 bg-muted/50 rounded-md">
                                    <p className="text-sm font-medium mb-1">Solution:</p>
                                    <p className="text-sm">{event.solutionNotes}</p>
                                  </div>
                                )}
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
        
        {/* Problem report dialog */}
        {isMobile ? (
          <Drawer open={isReportOpen} onOpenChange={setIsReportOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>
                  Report {selectedButton?.label || "Problem"}
                </DrawerTitle>
                <DrawerDescription>
                  Provide additional details about the issue
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 py-2">
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
                              placeholder="Brief description of the problem" 
                              className="resize-none" 
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
                              placeholder="Where is the problem located?" 
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
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select asset (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {Array.isArray(assetsQuery.data) && assetsQuery.data.map(asset => (
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
                <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={reportProblemMutation.isPending}>
                  {reportProblemMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reporting...
                    </>
                  ) : (
                    'Report Problem'
                  )}
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
                <DialogTitle>
                  Report {selectedButton?.label || "Problem"}
                </DialogTitle>
                <DialogDescription>
                  Provide additional details about the issue
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
                            placeholder="Brief description of the problem" 
                            className="resize-none" 
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
                            placeholder="Where is the problem located?" 
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
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select asset (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {Array.isArray(assetsQuery.data) && assetsQuery.data.map(asset => (
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
                <Button variant="outline" onClick={() => setIsReportOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={reportProblemMutation.isPending}>
                  {reportProblemMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reporting...
                    </>
                  ) : (
                    'Report Problem'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Resolution dialog */}
        {selectedEvent && (
          <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resolve Problem</DialogTitle>
                <DialogDescription>
                  Add details about how the problem was resolved
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-md space-y-2">
                  <div className="flex items-center">
                    <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                    <p className="font-medium">{getButtonLabel(selectedEvent.buttonId)}</p>
                  </div>
                  {selectedEvent.notes && (
                    <p className="text-sm">{selectedEvent.notes}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <div>
                      Reported: {format(new Date(selectedEvent.timestamp), "MMM d, h:mm a")}
                    </div>
                    {selectedEvent.locationName && (
                      <div>
                        | Location: {selectedEvent.locationName}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="solutionNotes">Solution Notes</Label>
                    <Textarea
                      id="solutionNotes"
                      placeholder="Describe how the problem was resolved"
                      value={solutionForm.watch("solutionNotes")}
                      onChange={(e) => solutionForm.setValue("solutionNotes", e.target.value)}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const solutionNotes = solutionForm.getValues().solutionNotes;
                    handleResolve(selectedEvent.id, solutionNotes);
                  }}
                  disabled={resolveProblemMutation.isPending}
                >
                  {resolveProblemMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    'Mark as Resolved'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  };
  
  // Use MultiQueryLoader to handle loading states
  return (
    <MultiQueryLoader
      queries={[buttonsQuery, eventsQuery, assetsQuery]}
      loadingComponent={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      {renderContent()}
    </MultiQueryLoader>
  );
}