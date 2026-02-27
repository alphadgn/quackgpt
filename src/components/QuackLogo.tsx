import { cn } from "@/lib/utils";

interface QuackLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const textSizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

export function QuackLogo({ className, showText = true, size = 'md' }: QuackLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Duck Icon */}
      <div className={cn(
        "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent",
        sizeClasses[size]
      )}>
        {/* Duck bill shape */}
        <svg
          viewBox="0 0 100 100"
          className="w-3/4 h-3/4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Duck head */}
          <circle cx="50" cy="45" r="28" fill="hsl(var(--primary-foreground))" />
          {/* Duck bill */}
          <ellipse cx="50" cy="58" rx="18" ry="10" fill="hsl(35 85% 50%)" />
          <ellipse cx="50" cy="55" rx="16" ry="8" fill="hsl(42 92% 58%)" />
          {/* Eyes */}
          <circle cx="40" cy="40" r="5" fill="hsl(var(--background))" />
          <circle cx="60" cy="40" r="5" fill="hsl(var(--background))" />
          <circle cx="41" cy="39" r="2" fill="hsl(var(--foreground))" />
          <circle cx="61" cy="39" r="2" fill="hsl(var(--foreground))" />
        </svg>
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl -z-10" />
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            "font-display font-bold text-gradient leading-tight",
            textSizeClasses[size]
          )}>
            quackGPT
          </span>
        </div>
      )}
    </div>
  );
}
