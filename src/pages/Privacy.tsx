import { Link } from "react-router-dom";
import { QuackLogo } from "@/components/QuackLogo";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollBendContainer } from "@/components/ScrollBendContainer";

const Privacy = () => {
  return (
    <div className="min-h-screen relative z-10 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center">
            <QuackLogo size="sm" />
          </Link>
          <Button variant="ghost" size="icon-sm" asChild title="Home">
            <Link to="/">
              <Home className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </header>
      
      <main className="container max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-gradient mb-8">Privacy Policy</h1>
        
        <ScrollBendContainer className="prose prose-invert prose-sm max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: September 2026</p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-foreground/80">The Service does not create user accounts or store server-side conversation history. We process only:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li><strong>Submitted text:</strong> Questions or text you choose to verify, processed to return an answer</li>
              <li><strong>Technical data:</strong> IP addresses processed briefly to prevent automated abuse</li>
              <li><strong>Local chat:</strong> Recent messages saved only in your browser, where you can clear them</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p className="text-foreground/80">Your information is used to:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Provide and maintain the Service</li>
              <li>Return source-bound information and claim verification</li>
              <li>Apply short-window safety limits against automated abuse</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Data Storage and Security</h2>
            <p className="text-foreground/80">
              Questions are sent securely for processing and are not saved to a user profile or server-side chat history. Recent chat displayed by the app remains in your browser until you clear it or remove browser data.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. GDPR Compliance</h2>
            <p className="text-foreground/80">For users in the European Union, you have the right to:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to data processing</li>
              <li>Data portability</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Third-Party Services</h2>
            <p className="text-foreground/80">
              We use hosted infrastructure and AI processing services to answer requests. We do not use blockchain or payment services and do not collect private social data.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Data Retention</h2>
            <p className="text-foreground/80">
              The Service does not retain account records or saved conversations. Infrastructure providers may retain limited technical logs under their own security and retention practices.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
            <p className="text-foreground/80">
              For privacy-related inquiries, please contact us through the contact options on quackgpt.info.
            </p>
          </section>
        </ScrollBendContainer>
      </main>
    </div>
  );
};

export default Privacy;
