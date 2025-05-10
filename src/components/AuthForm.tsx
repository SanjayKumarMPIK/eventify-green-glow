
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRole } from "@/types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { validateEmail, ADMIN_CODE } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";

interface AuthFormProps {
  type: "login" | "register";
}

export function AuthForm({ type }: AuthFormProps) {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email format
      if (!validateEmail(email)) {
        toast.error("Invalid email format. It should be like: name.123456@dept.ritchennai.edu.in");
        setLoading(false);
        return;
      }

      // Validate admin code if role is admin
      if (role === "admin" && adminCode !== ADMIN_CODE) {
        toast.error("Invalid admin code");
        setLoading(false);
        return;
      }

      if (type === "login") {
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }

        toast.success("Logged in successfully");
        navigate("/dashboard");
      } else {
        // Register with Supabase
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role,
              department: role === "student" ? department : undefined
            },
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });

        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }

        toast.success("Registration successful! Please check your email for verification.");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {type === "login" ? "Login to Eventify" : "Create an Eventify Account"}
          </CardTitle>
          <CardDescription className="text-center">
            {type === "login" 
              ? "Enter your credentials to access your account" 
              : "Fill in the details to create your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="student" className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="student" onClick={() => setRole("student")}>
                  Student
                </TabsTrigger>
                <TabsTrigger value="admin" onClick={() => setRole("admin")}>
                  Admin
                </TabsTrigger>
              </TabsList>
              <TabsContent value="student">
                <p className="text-sm text-muted-foreground mb-4">
                  Login as a student to register for events and access your dashboard.
                </p>
              </TabsContent>
              <TabsContent value="admin">
                <p className="text-sm text-muted-foreground mb-4">
                  Login as an admin to manage events and view registrations.
                </p>
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              {type === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Your full name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name.123456@dept.ritchennai.edu.in" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
                <p className="text-xs text-muted-foreground">
                  Format: name.123456@dept.ritchennai.edu.in
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Your secure password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>

              {type === "register" && role === "student" && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input 
                    id="department" 
                    placeholder="Your department" 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required 
                  />
                </div>
              )}

              {role === "admin" && (
                <div className="space-y-2">
                  <Label htmlFor="adminCode">Admin Code</Label>
                  <Input 
                    id="adminCode" 
                    placeholder="Enter admin code" 
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    required 
                  />
                </div>
              )}
            </div>

            <Button className="w-full mt-6" type="submit" disabled={loading}>
              {loading ? "Processing..." : type === "login" ? "Login" : "Register"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {type === "login" ? "Don't have an account? " : "Already have an account? "}
            <a 
              href={type === "login" ? "/register" : "/login"} 
              className="text-primary hover:underline"
            >
              {type === "login" ? "Register" : "Login"}
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
