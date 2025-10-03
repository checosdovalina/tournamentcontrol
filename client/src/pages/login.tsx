import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import courtflowLogo from "@assets/courtflow-logo.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password
      });
      
      const data = await response.json();
      
      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido, ${data.user.name}`,
      });
      
      // Invalidate and refetch user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      
      // Redirect to dashboard
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error de inicio de sesión",
        description: error.message || "Credenciales inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={courtflowLogo} alt="CourtFlow" className="h-24 w-auto" />
          </div>
          <CardTitle className="text-2xl">CourtFlow</CardTitle>
          <p className="text-muted-foreground">Sistema de Control de Torneos de Pádel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
              />
            </div>
            <Button 
              type="submit" 
              data-testid="button-login"
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Credenciales de prueba:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Admin:</strong> admin / admin123</p>
              <p><strong>Escribano:</strong> escribano / escribano123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
