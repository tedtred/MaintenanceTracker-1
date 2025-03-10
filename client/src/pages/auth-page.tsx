import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define a simpler schema for the registration form
const registrationSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegistrationData = z.infer<typeof registrationSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleRegister = async (data: RegistrationData) => {
    try {
      const result = await registerMutation.mutateAsync(data);
      if (result.message) {
        setRegistrationSuccess(true);
        registerForm.reset();
      }
    } catch (error) {
      // Error handling is done by the mutation
      console.error("Registration error:", error);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left side - Forms */}
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Wrench className="h-6 w-6" />
              <CardTitle className="text-2xl">CMMS Platform</CardTitle>
            </div>
            <CardDescription>
              Manage your maintenance operations efficiently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit((data) =>
                      loginMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      Login
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                {registrationSuccess ? (
                  <Alert className="mb-4">
                    <AlertDescription>
                      Registration successful! Your account is pending admin approval.
                      You will be able to login once an administrator approves your account.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(handleRegister)}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        Register
                      </Button>
                    </form>
                  </Form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Hero */}
      <div className="hidden md:flex bg-muted items-center justify-center p-8">
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-bold">
            Streamline Your Maintenance Operations
          </h1>
          <div className="space-y-4">
            <p>
              Our CMMS platform helps you manage work orders, track assets, and
              optimize maintenance schedules all in one place.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                ✓ Efficient work order management
              </li>
              <li className="flex items-center gap-2">
                ✓ Comprehensive asset tracking
              </li>
              <li className="flex items-center gap-2">
                ✓ Real-time status updates
              </li>
              <li className="flex items-center gap-2">
                ✓ Team collaboration tools
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}