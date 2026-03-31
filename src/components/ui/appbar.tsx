import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils";
import { ArrowLeft, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { SidebarTrigger } from "./sidebar";

interface AppBarProps extends React.HTMLAttributes<HTMLElement> {
  /** Der Titel der aktuellen Seite */
  title?: string;
  /** Soll die Suchleiste angezeigt werden? */
  showSearch?: boolean;
  /** Platzhaltertext für die Suche */
  searchPlaceholder?: string;
  /** Wert der Suche (Controlled Input) */
  searchValue?: string;
  /** Event, wenn sich die Suche ändert */
  onSearchChange?: (value: string) => void;
  /** Elemente auf der rechten Seite (z.B. Avatar, Buttons) */
  actions?: React.ReactNode;
  primaryAction?: React.ReactNode | "back" | "default";
  /** Soll die Leiste beim Scrollen einen Schatten bekommen? */
  withScrollEffect?: boolean;
  user?: User
}

export function AppBar({
  title,
  user,
  showSearch = false,
  searchPlaceholder = "Suchen...",
  searchValue,
  onSearchChange,
  primaryAction = "default",
  actions,
  withScrollEffect = true,
  className,
  ...props
}: AppBarProps) {
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
        "sticky top-0 z-50 flex h-14 w-full items-center gap-4 bg-background/95 px-4 supports-[backdrop-filter]:bg-background md:px-4 transition-shadow",
        scrolled ? "border-b shadow-sm" : "",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 md:gap-4 lg:w-1/3">
        {
          primaryAction === "default" && <SidebarTrigger className={"-ml-1 md:hidden"} />
        }
        {
          primaryAction === "back" && <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 rounded-full -ml-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        {
          React.isValidElement(primaryAction) && primaryAction
        }
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
              className="w-full rounded-full bg-muted/50 pl-9 focus-visible:bg-background"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 lg:w-1/3">
        {actions}
        {
          user && <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-1" onClick={() => navigate("/user")}>
            <Avatar className="h-8 w-8">
              {
                user.avatarUrl
                  ? <AvatarImage src={user.avatarUrl} alt={user.name ?? "User Avatar"} />
                  : <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(user.name ?? "User")}</AvatarFallback>
              }
            </Avatar>
          </Button>
        }
      </div>
    </header>
  );
}