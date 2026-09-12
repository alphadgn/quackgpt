import { cn } from "@/lib/utils";
import { UGLY_DUCK_LOGO } from "@/lib/brand-assets";

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
      <div className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl border border-primary/35 shadow-[0_0_24px_hsl(var(--primary)/0.28)]",
        sizeClasses[size]
      )}>
        <img src={UGLY_DUCK_LOGO} alt="Ugly Duck Society mark" className="h-full w-full object-cover" />
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
