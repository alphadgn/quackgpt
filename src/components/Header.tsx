import { QuackLogo } from "./QuackLogo";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center px-4">
        <Link to="/" className="flex items-center">
          <QuackLogo size="sm" />
        </Link>
      </div>
    </header>
  );
}
