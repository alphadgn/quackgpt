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
          <p className="text-muted-foreground">Last updated: January 2026</p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-foreground/80">We collect the following types of information:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li><strong>Account Information:</strong> Email address for user registration</li>
              <li><strong>Wallet Information:</strong> Public wallet addresses for NFT verification</li>
              <li><strong>Usage Data:</strong> Query history, rate limit tracking, and access patterns</li>
              <li><strong>Technical Data:</strong> IP addresses, browser type, and device information</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p className="text-foreground/80">Your information is used to:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Provide and maintain the Service</li>
              <li>Verify NFT ownership for tier access</li>
              <li>Enforce rate limits and usage policies</li>
              <li>Improve and optimize the Service</li>
              <li>Communicate important updates</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Data Storage and Security</h2>
            <p className="text-foreground/80">
              We implement industry-standard security measures to protect your data. Wallet addresses are stored securely, and we never request or store private keys. All data is encrypted in transit and at rest.
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
              We may use third-party services for blockchain verification and analytics. These services have their own privacy policies and we encourage you to review them.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Data Retention</h2>
            <p className="text-foreground/80">
              We retain your data for as long as your account is active or as needed to provide the Service. Query logs are retained for 30 days for rate limiting purposes.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
            <p className="text-foreground/80">
              For privacy-related inquiries, please contact us through official Wallchain channels.
            </p>
          </section>
        </ScrollBendContainer>
      </main>
    </div>
  );
};

export default Privacy;
