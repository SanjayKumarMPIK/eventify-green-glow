
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRole } from "@/types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ADMIN_CODE, validateEmail, USERS } from "@/lib/data";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email format
    if (!validateEmail(email)) {
      toast.error("Invalid email format. It should be like: name.123456@dept.ritchennai.edu.in");
      return;
    }

    // Validate admin code if role is admin
    if (role === "admin" && adminCode !== ADMIN_CODE) {
      toast.error("Invalid admin code. The correct code is ADMIN123");
      return;
    }

    if (type === "login") {
      // Check if user exists in mock data
      const user = USERS.find(u => u.email === email);
      if (!user) {
        toast.error("User not found. Please register first.");
        return;
      }

      // In a real app, you would validate the password here
      
      // Store user in localStorage
      localStorage.setItem("currentUser", JSON.stringify(user));
      toast.success(`Logged in successfully as ${role}`);
      navigate("/dashboard");
    } else {
      // Registration
      // Create a new user
      const newUser = {
        id: (Date.now()).toString(),
        email,
        name,
        role,
        department: role === "student" ? department : undefined
      };

      // In a real app, you would store this in a database
      // For now, we'll just use localStorage
      const existingUsers = JSON.parse(localStorage.getItem("users") || JSON.stringify(USERS));
      existingUsers.push(newUser);
      localStorage.setItem("users", JSON.stringify(existingUsers));
      
      // Log in the new user automatically
      localStorage.setItem("currentUser", JSON.stringify(newUser));
      
      toast.success(`Registered successfully as ${role}`);
      navigate("/dashboard");
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
                  {type === "login" && (
                    <p className="text-xs text-muted-foreground">
                      Hint: The admin code is ADMIN123
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button className="w-full mt-6" type="submit">
              {type === "login" ? "Login" : "Register"}
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
