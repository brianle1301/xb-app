import {
  Apple,
  BookOpen,
  CheckCircle,
  Dumbbell,
  Eye,
  FileText,
  FlaskConical,
  Footprints,
  Library,
  Lightbulb,
  type LucideProps,
  Moon,
  Move,
  NotebookPen,
  Pencil,
  Salad,
  Scan,
  Sun,
  Target,
  Utensils,
  Wind,
} from "lucide-react";

// Map of icon names to components
const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  apple: Apple,
  "book-open": BookOpen,
  "check-circle": CheckCircle,
  eye: Eye,
  "file-text": FileText,
  "flask-conical": FlaskConical,
  footprints: Footprints,
  library: Library,
  lightbulb: Lightbulb,
  moon: Moon,
  move: Move,
  "notebook-pen": NotebookPen,
  pencil: Pencil,
  salad: Salad,
  scan: Scan,
  sun: Sun,
  target: Target,
  utensils: Utensils,
  wind: Wind,
  dumbbell: Dumbbell,
};

interface DynamicIconProps extends Omit<LucideProps, "ref"> {
  name: string;
  fallback?: React.ReactNode;
}

export function DynamicIcon({
  name,
  fallback = null,
  ...props
}: DynamicIconProps) {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    // Return fallback or default icon
    return <>{fallback || <FileText {...props} />}</>;
  }

  return <IconComponent {...props} />;
}
