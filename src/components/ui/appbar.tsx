import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsOffline } from "@/hooks/useIsOffline";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils";
import { ArrowLeft, Search, WifiOff } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { SidebarTrigger } from "./sidebar";

interface AppBarProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
  primaryAction?: React.ReactNode | "back" | "default";
  navigateBackPath?: string;
  withScrollEffect?: boolean;
  user?: User; // Ersetze User durch deinen echten Typen
}

export function AppBar({
  title,
  user,
  showSearch = false,
  searchPlaceholder = "Suchen...",
  searchValue,
  onSearchChange,
  primaryAction = "default",
  navigateBackPath,
  actions,
  withScrollEffect = true,
  className,
  ...props
}: AppBarProps) {
  const isOffline = useIsOffline();
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!withScrollEffect) return;
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [withScrollEffect]);

  return (
    <header
      className={cn(
        "pt-safe-top sticky top-0 z-50 w-full transition-all duration-200 text-foreground",
        // OPTIMIERT: Der Blur-Effekt funktioniert jetzt in beiden Themes perfekt
        "bg-header/80 text-header-foreground backdrop-blur-md",
        // OPTIMIERT: border-border greift automatisch auf deine global.css zurück
        scrolled ? "border-b border-border shadow-sm" : "border-b border-transparent",
        className
      )}
      {...props}
    >
      <div className="flex h-14 w-full items-center gap-4 px-4 md:px-4">
        <div className="flex items-center gap-2 md:gap-4 lg:w-1/3">
          {primaryAction === "default" && (
            // GEFIXT: bg-foreground/50 entfernt. Der Trigger hat meist ein eigenes sauberes Hover-Styling
            <SidebarTrigger className="-ml-1 md:hidden" />
          )}
          {primaryAction === "back" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateBackPath ? navigate(navigateBackPath) : navigate(-1)}
              className="shrink-0 rounded-full -ml-1 text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {React.isValidElement(primaryAction) && primaryAction}
          {title && (
            <div className="font-semibold tracking-tight sm:block text-lg">
              {title}
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center lg:w-1/3">
          {showSearch && (
            <div className="relative w-full max-w-md flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                // OPTIMIERT: Nutzt die definierten Muted- und Background-Farben
                className="w-full rounded-full bg-muted/50 pl-9 text-foreground focus-visible:bg-background border-transparent focus-visible:border-ring"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 lg:w-1/3">
          {actions}
          {user && (
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full ml-1"
              onClick={() => navigate("/user")}
            >
              <Avatar className="h-8 w-8 border border-border/50 shadow-sm">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name ?? "User Avatar"} />
                ) : (
                  // Nutzt perfekt deine --primary und --primary-foreground Farben
                  <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                    {getInitials(user.name ?? "U")}
                  </AvatarFallback>
                )}
              </Avatar>
            </Button>
          )}
        </div>
      </div>

      {/* Offline Banner nutzt exakt deine --warning und --warning-foreground Variablen */}
      {isOffline && (
        <div className="w-full bg-warning px-4 py-2 flex items-center justify-center gap-2 text-warning-foreground shadow-sm">
          <WifiOff className="size-4 shrink-0" />
          <span className="text-xs font-medium">
            Du bist offline. Es werden gespeicherte Daten angezeigt.
          </span>
        </div>
      )}
    </header>
  );
}