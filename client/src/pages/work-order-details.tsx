import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { WorkOrder, WorkOrderStatus, WorkOrderPriority, WorkOrderAttachment } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { SidebarNav } from "@/components/sidebar-nav";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Upload, FileText } from "lucide-react";

export default function WorkOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  console.log("Work Order ID:", id); // Debug log

  const { data: workOrder, isLoading } = useQuery<WorkOrder>({
    queryKey: [`/api/work-orders/${id}`],
    enabled: !!id // Only run query if we have an ID
  });

  const { data: attachments = [] } = useQuery<WorkOrderAttachment[]>({
    queryKey: [`/api/work-orders/${id}/attachments`],
    enabled: !!id && !!workOrder, // Only fetch attachments if we have both ID and work order
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<WorkOrder>) => {
      const res = await apiRequest("PATCH", `/api/work-orders/${id}`, {
        ...data,
        dueDate: data.dueDate instanceof Date ? data.dueDate.toISOString() : data.dueDate,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${id}`] });
      toast({
        title: "Success",
        description: "Work order updated successfully",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/work-orders/${id}/attachments`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to upload file');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/work-orders/${id}/attachments`]
      });
      setIsUploading(false);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const form = useForm({
    values: {
      title: workOrder?.title || "",
      description: workOrder?.description || "",
      status: workOrder?.status || WorkOrderStatus.OPEN,
      priority: workOrder?.priority || WorkOrderPriority.MEDIUM,
      dueDate: workOrder?.dueDate ? new Date(workOrder.dueDate).toISOString().slice(0, 16) : "",
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Work Order Not Found</h1>
          <Link href="/work-orders">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Work Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/work-orders">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Work Orders
                </Button>
              </Link>
              <h1 className="text-3xl font-bold">Work Order Details</h1>
            </div>
            <div className="flex gap-2">
              <Input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/gif,application/pdf"
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Attachment
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Work Order Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) =>
                      updateMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="min-h-[100px]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.values(WorkOrderStatus).map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
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
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.values(WorkOrderPriority).map(
                                  (priority) => (
                                    <SelectItem key={priority} value={priority}>
                                      {priority}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={updateMutation.isPending}
                    >
                      Save Changes
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attachments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No attachments yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 rounded-lg border hover:bg-accent transition-colors"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {attachment.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                attachment.uploadedAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}