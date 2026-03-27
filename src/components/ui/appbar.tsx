import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Menu, Search } from "lucide-react";
import React, { useEffect, useState } from "react";

interface AppBarProps extends React.HTMLAttributes<HTMLElement> {
  /** Der Titel der aktuellen Seite */
  title: string;
  /** Funktion, um die Sidebar zu öffnen/schließen */
  onDrawerToggle?: () => void;
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
  /** Soll die Leiste beim Scrollen einen Schatten bekommen? */
  withScrollEffect?: boolean;
}

export function AppBar({
  title,
  onDrawerToggle,
  showSearch = false,
  searchPlaceholder = "Suchen...",
  searchValue,
  onSearchChange,
  actions,
  withScrollEffect = true,
  className,
  ...props
}: AppBarProps) {
  const [scrolled, setScrolled] = useState(false);

  // Scroll-Effekt für den Schatten (Glas-Effekt)
  useEffect(() => {
    if (!withScrollEffect) return;
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [withScrollEffect]);

  return (
    <header
      className={cn(
        "sticky top-0 z-999 flex h-14 w-full items-center gap-4 bg-background/95 px-4 supports-[backdrop-filter]:bg-background md:px-6 transition-shadow",
        scrolled ? "border-b shadow-sm" : "",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 md:gap-4 lg:w-1/3">
        {onDrawerToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDrawerToggle}
            className="shrink-0 rounded-full md:hidden"
            aria-label="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {title && (
          <div className="font-semibold tracking-tight sm:block text-lg">
            {title}
          </div>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center lg:w-1/3">
        {showSearch && (
          <div className="relative w-full max-w-md">
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
      </div>
    </header>
  );
}