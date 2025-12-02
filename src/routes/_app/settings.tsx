import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { language } = useLanguage();

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">
        {language === "es" ? "Configuración" : "Settings"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === "es" ? "Próximamente" : "Coming Soon"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {language === "es"
              ? "Las opciones de configuración estarán disponibles pronto."
              : "Settings options will be available soon."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
