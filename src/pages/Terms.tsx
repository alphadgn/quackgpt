import { Link } from "react-router-dom";
import { QuackLogo } from "@/components/QuackLogo";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollBendContainer } from "@/components/ScrollBendContainer";

const Terms = () => {
  return (
    <div className="min-h-screen relative z-10">
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
        <h1 className="text-3xl font-display font-bold text-gradient mb-8">Terms of Service</h1>
        
        <ScrollBendContainer className="prose prose-invert prose-sm max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 2026</p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-foreground/80">
              By accessing and using quackGPT.app ("Service"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Service Description</h2>
            <p className="text-foreground/80">
              quackGPT is an information verification and summarization system that provides factual, source-bound information about Wallchain, InfoFi, Quack Heads, gQuack, and the quack.xyz ecosystem. The Service does NOT create content, including but not limited to tweets, articles, marketing copy, or promotional materials.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. User Tiers and Limitations</h2>
            <p className="text-foreground/80">The Service offers different access tiers:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li><strong>Free Users:</strong> 1 query per 24 hours, 100 character response limit, no image generation</li>
              <li><strong>Paid Users ($1.49/week — trial offer):</strong> 3 queries per 24 hours, 300 character response limit, 3 images per day. This is a limited-time trial offer; prices are subject to change after the trial period ends.</li>
              <li><strong>Quack Heads NFT Holders:</strong> 5 queries per 24 hours, 1000 character response limit, 5 images per day</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Prohibited Uses</h2>
            <p className="text-foreground/80">You may not use the Service to:</p>
            <ul className="list-disc pl-6 text-foreground/80 space-y-2">
              <li>Request content creation of any kind</li>
              <li>Generate misleading or false information</li>
              <li>Violate any applicable laws or regulations</li>
              
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Disclaimer of Warranties</h2>
            <p className="text-foreground/80">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR TIMELINESS OF INFORMATION PROVIDED. THIS IS NOT FINANCIAL, INVESTMENT, OR LEGAL ADVICE.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
            <p className="text-foreground/80">
              In no event shall quackGPT, it's operators, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
            <p className="text-foreground/80">
              For questions about these Terms, please contact customer support at{' '}
              <a href="mailto:info@QuackGPT.info" className="text-primary hover:underline">info@QuackGPT.info</a>.
            </p>
          </section>
        </ScrollBendContainer>
      </main>
    </div>
  );
};

export default Terms;
