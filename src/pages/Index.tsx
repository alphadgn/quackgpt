import { useState, useCallback, useRef, useEffect } from "react";
import { ScrollBendContainer } from "@/components/ScrollBendContainer";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ChatModeSelector, ChatMode } from "@/components/ChatModeSelector";
import { CampaignSelector, Campaign } from "@/components/CampaignSelector";
import { InlineQueryHistory } from "@/components/WelcomeScreen";
import { MessageSquare, Search, Shield, Bird } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AlertCircle, Loader2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { toast } from "sonner";

const Index = () => {
  const { authenticated, login, logout, tier, walletAddress, email, nftCheckLoading, linkedWallets, linkWallet, unlinkWallet, user, isSuperAdmin, embeddedWallet, getAccessToken, tierOverride } = useAuth();
  const [prefillMessage, setPrefillMessage] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("search");
  const [campaign, setCampaign] = useState<Campaign>("wallchain");
  const [historyFilter, setHistoryFilter] = useState<"all" | "search" | "quack-check" | "tweet-audit">("all");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useInactivityLogout(authenticated, logout);

  // Always scroll to top of welcome page when user signs in
  const prevAuth = useRef(false);
  useEffect(() => {
    if (authenticated && !prevAuth.current) {
      // User just signed in — navigate home and scroll to top
      if (window.location.pathname !== '/') {
        navigate('/');
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    prevAuth.current = authenticated;
  }, [authenticated, navigate]);
  
  const { 
    messages, 
    isTyping, 
    queriesRemaining, 
    sendMessage,
    sendTweetAudit,
    cooldownUntil,
    resetTime,
    usageLoaded,
  } = useChat({ tier, isAuthenticated: authenticated, privyUserId: user?.id, getAccessToken, tierOverride, isSuperAdmin });

  useEffect(() => {
    // Gentle scroll — don't hijack full-page scroll position
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isTyping]);

  const handlePrefillConsumed = useCallback(() => {
    setPrefillMessage("");
  }, []);

  const getAuthHeaders = useCallback(async () => {
    const token = getAccessToken ? await getAccessToken() : null;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      ...(token ? { 'x-privy-token': token } : {}),
    };
  }, [getAccessToken]);

  const handleSendMessage = useCallback((content: string) => {
    if (chatMode === "tweet-audit") {
      sendTweetAudit(content, campaign);
    } else if (chatMode === "quack-check") {
      sendMessage(`[QUACK CHECK] ${content}`);
    } else {
      sendMessage(content);
    }
  }, [chatMode, campaign, sendMessage, sendTweetAudit]);

  const handleFeedback = useCallback(async (messageContent: string, type: 'positive' | 'negative', userQuery?: string) => {
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
        body: JSON.stringify({ messageContent, feedbackType: type, userQuery }),
      });
    } catch (err) {
      console.error('Feedback submission failed:', err);
    }
  }, [user?.id, getAccessToken]);

  const handleCheckout = useCallback(async () => {
    if (!user?.id) { navigate("/settings"); return; }
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

  const historyModes = [
    { id: "all" as const, label: "All", icon: MessageSquare },
    { id: "search" as const, label: "Search", icon: Search },
    { id: "quack-check" as const, label: "Quack Check", icon: Shield },
    { id: "tweet-audit" as const, label: "Tweet Audit", icon: Bird },
  ];

  const HistoryModeTabs = () => (
    <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-secondary/30 border border-border/50 mb-3">
      {historyModes.map((m) => (
        <button
          key={m.id}
          onClick={() => setHistoryFilter(m.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            historyFilter === m.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <m.icon className="w-3.5 h-3.5" />
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="relative z-10 flex flex-col min-h-screen">
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
      
      <main className="flex-1 max-w-4xl mx-auto w-full">
        {/* Chat area - always visible */}
        <div>
          {messages.length === 0 ? (
            <WelcomeScreen tier={tier} queriesRemaining={queriesRemaining} onQuerySelect={setPrefillMessage} isAuthenticated={authenticated} onLogin={login} getAuthHeaders={authenticated ? getAuthHeaders : undefined} />
          ) : (
            <ScrollBendContainer className="divide-y divide-border/30">
              {messages.map((message, index) => {
                let previousUserMessage: string | undefined;
                if (message.role === 'assistant') {
                  for (let i = index - 1; i >= 0; i--) {
                    if (messages[i].role === 'user') {
                      previousUserMessage = messages[i].content;
                      break;
                    }
                  }
                }
                return (
                  <ChatMessage key={message.id} message={message} onFeedback={handleFeedback} previousUserMessage={previousUserMessage} />
                );
              })}
              {isTyping && <TypingIndicator />}
              <div ref={chatEndRef} />
            </ScrollBendContainer>
          )}
        </div>

        {/* Mode selector + Input area - always visible */}
        <div className="p-4">
          {authenticated && (
            <div className="flex flex-col items-center gap-3 mb-3 max-w-3xl mx-auto">
              <ChatModeSelector mode={chatMode} onModeChange={setChatMode} />
              {chatMode === "tweet-audit" && (
                <CampaignSelector campaign={campaign} onCampaignChange={setCampaign} />
              )}
            </div>
          )}
          {authenticated ? (
            usageLoaded && queriesRemaining <= 0 ? (
              <div className="max-w-3xl mx-auto w-full">
                <div
                  className="relative flex items-center gap-3 p-4 rounded-2xl border border-destructive/40 bg-destructive/5 cursor-pointer hover:border-destructive/60 transition-colors"
                  onClick={handleCheckout}
                >
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <div className="flex-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Daily queries depleted.</span>{' '}
                    Subscribe or connect a wallet with{' '}
                    <span className="text-primary font-semibold">Quack Heads NFT(s)</span> to unlock more.
                  </div>
                  <div className="shrink-0 flex flex-col items-stretch gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleCheckout(); }}
                          disabled={checkoutLoading}
                          className="gap-1"
                        >
                          {checkoutLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Subscribe
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-center">
                        <p className="text-xs">$1.49/week trial offer. Prices may change after the trial period ends.</p>
                      </TooltipContent>
                    </Tooltip>
                    {resetTime && <CountdownTimer resetTime={resetTime} />}
                  </div>
                </div>
              </div>
            ) : (
              <ChatInput
                onSend={handleSendMessage}
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
          
          <p className="text-center text-xs text-muted-foreground mt-12 mb-12 max-w-xl mx-auto">
            QuackGPT provides information only. Not financial advice. 
            Data sourced from Wallchain & other official channels.
          </p>

          {/* Query History - below input area */}
          {authenticated && messages.length === 0 && (
            <div className="max-w-3xl mx-auto mt-6">
              <div className="w-full rounded-xl bg-card/50 border border-border/50 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Query History
                </h3>
                <HistoryModeTabs />
                <InlineQueryHistory getAuthHeaders={getAuthHeaders} historyFilter={historyFilter} />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      </div>
    </div>
  );
};

export default Index;
