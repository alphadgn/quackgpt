import { useState, useCallback, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

const Index = () => {
  const { authenticated, login, logout, tier, walletAddress, email, nftCheckLoading, linkedWallets, linkWallet, unlinkWallet, user, isSuperAdmin, embeddedWallet } = useAuth();
  const [prefillMessage, setPrefillMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useInactivityLogout(authenticated, logout);
  
  const { 
    messages, 
    isTyping, 
    queriesRemaining, 
    sendMessage,
    cooldownUntil,
    resetTime,
    usageLoaded,
  } = useChat({ tier, isAuthenticated: authenticated, privyUserId: user?.id });

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
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-privy-user-id': user.id,
        },
        body: JSON.stringify({ messageContent, feedbackType: type }),
      });
    } catch (err) {
      console.error('Feedback submission failed:', err);
    }
  }, [user?.id]);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-y-auto">
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
