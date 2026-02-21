import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { toast } from "sonner";

const Index = () => {
  const { authenticated, login, logout, tier, walletAddress, email, nftCheckLoading, linkedWallets, linkWallet, unlinkWallet, user, isSuperAdmin, embeddedWallet, getAccessToken } = useAuth();
  const [prefillMessage, setPrefillMessage] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useInactivityLogout(authenticated, logout);
  
  const { 
    messages, 
    isTyping, 
    queriesRemaining, 
    sendMessage,
    cooldownUntil,
    resetTime,
    usageLoaded,
  } = useChat({ tier, isAuthenticated: authenticated, privyUserId: user?.id, getAccessToken });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handlePrefillConsumed = useCallback(() => {
    setPrefillMessage("");
  }, []);

  const handleFeedback = useCallback(async (messageContent: string, type: 'positive' | 'negative') => {
    if (!user?.id) return;
    try {
      const token = await getAccessToken();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          ...(token ? { 'x-privy-token': token } : {}),
        },
        body: JSON.stringify({ messageContent, feedbackType: type }),
      });
    } catch (err) {
      console.error('Feedback submission failed:', err);
    }
  }, [user?.id, getAccessToken]);

  const handleCheckout = useCallback(async () => {
    if (!user?.id) {
      navigate("/settings");
      return;
    }
    setCheckoutLoading(true);
    try {
      const token = await getAccessToken();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          ...(token ? { "x-privy-token": token } : {}),
        },
      });
      const data = await resp.json();
      if (data.url) {
        const w = window.open(data.url, '_blank');
        if (!w) window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to create checkout session");
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }, [user?.id, navigate, getAccessToken]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto">
      <div className="relative z-10 flex flex-col flex-1">
      <Header 
        tier={tier}
        isLoggedIn={authenticated}
        walletAddress={walletAddress}
        email={email}
        onLogin={login}
        onLogout={logout}
        nftCheckLoading={nftCheckLoading}
        linkedWallets={linkedWallets}
        onLinkWallet={linkWallet}
        onUnlinkWallet={unlinkWallet}
        isSuperAdmin={isSuperAdmin}
        embeddedWallet={embeddedWallet}
      />
      
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-visible">
        {/* Chat area */}
        <div className="flex-1">
          {messages.length === 0 ? (
            <WelcomeScreen tier={tier} queriesRemaining={queriesRemaining} onQuerySelect={setPrefillMessage} isAuthenticated={authenticated} onLogin={login} />
          ) : (
            <div className="divide-y divide-border/30">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} onFeedback={handleFeedback} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
        
        {/* Input area */}
        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          {authenticated ? (
            tier === 'free' ? (
              <div className="max-w-3xl mx-auto w-full">
                <div className="relative flex items-center gap-3 p-4 rounded-2xl border border-destructive/40 bg-destructive/5">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <div className="flex-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">24hr cooldown.</span>{' '}
                    Subscribe or connect a wallet with{' '}
                    <span className="text-primary font-semibold">Quack Heads NFT(s)</span> to unlock.
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="shrink-0 gap-1"
                  >
                    {checkoutLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Subscribe
                  </Button>
                </div>
              </div>
            ) : (
              <ChatInput
                onSend={sendMessage}
                disabled={isTyping || !usageLoaded}
                tier={tier}
                queriesRemaining={usageLoaded ? queriesRemaining : -1}
                className="max-w-3xl mx-auto"
                prefillValue={prefillMessage}
                onPrefillConsumed={handlePrefillConsumed}
                cooldownUntil={cooldownUntil}
                privyUserId={user?.id ?? null}
              />
            )
          ) : null}
          
          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mt-4 max-w-xl mx-auto">
            quackGPT provides information only. Not financial advice. 
            Data sourced from official Wallchain channels.
          </p>
        </div>
      </main>
      </div>
      
      {authenticated && <CountdownTimer resetTime={resetTime} />}
    </div>
  );
};

export default Index;
