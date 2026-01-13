import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Globe, LogOut, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/lib/auth-client";
import { useLanguage } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { user } = Route.useRouteContext();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const themeOptions = [
    {
      value: "light" as const,
      label: language === "es" ? "Claro" : "Light",
      icon: Sun,
    },
    {
      value: "dark" as const,
      label: language === "es" ? "Oscuro" : "Dark",
      icon: Moon,
    },
    {
      value: "system" as const,
      label: language === "es" ? "Sistema" : "System",
      icon: Monitor,
    },
  ];

  const languageOptions = [
    { value: "en" as const, label: "English" },
    { value: "es" as const, label: "Español" },
  ];

  return (
    <div className="w-full max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">
        {language === "es" ? "Configuración" : "Settings"}
      </h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {language === "es" ? "Apariencia" : "Appearance"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {language === "es" ? "Tema" : "Theme"}
            </p>
            <div className="flex gap-2">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={theme === option.value ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setTheme(option.value)}
                >
                  <option.icon className="w-4 h-4 mr-2" />
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mb-3 mt-4">
              {language === "es" ? "Idioma" : "Language"}
            </p>
            <div className="flex gap-2">
              {languageOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={language === option.value ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setLanguage(option.value)}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{language === "es" ? "Cuenta" : "Account"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {language === "es" ? "Correo electrónico" : "Email"}
              </p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {language === "es" ? "Cerrar sesión" : "Sign Out"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
