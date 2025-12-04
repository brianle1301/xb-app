import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/auth-client";
import { useLanguage } from "@/lib/language-context";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">
        {language === "es" ? "Configuración" : "Settings"}
      </h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {language === "es" ? "Cuenta" : "Account"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {language === "es" ? "Correo electrónico" : "Email"}
              </p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              {language === "es" ? "Cerrar sesión" : "Sign Out"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
