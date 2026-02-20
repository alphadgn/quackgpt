import { useState, useCallback, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import heroBgDuck from "@/assets/hero-bg-duck.jpeg";

const Index = () => {
  const { authenticated, login, logout, tier, walletAddress, email, nftCheckLoading, linkedWallets, linkWallet, user, isSuperAdmin, embeddedWallet } = useAuth();
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
  } = useChat({ tier, isAuthenticated: authenticated, privyUserId: user?.id });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handlePrefillConsumed = useCallback(() => {
    setPrefillMessage("");
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background" style={{ backgroundImage: `url(${heroBgDuck})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
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
        isSuperAdmin={isSuperAdmin}
        embeddedWallet={embeddedWallet}
      />
      
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen tier={tier} queriesRemaining={queriesRemaining} onQuerySelect={setPrefillMessage} isAuthenticated={authenticated} onLogin={login} />
          ) : (
            <div className="divide-y divide-border/30">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
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
              disabled={isTyping}
              tier={tier}
              queriesRemaining={queriesRemaining}
              className="max-w-3xl mx-auto"
              prefillValue={prefillMessage}
              onPrefillConsumed={handlePrefillConsumed}
              cooldownUntil={cooldownUntil}
            />
          ) : null}
          
          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mt-4 max-w-xl mx-auto">
            quackGPT provides information only. Not financial advice. 
            Data sourced from official Wallchain channels.
          </p>
        </div>
      </main>
      
      {authenticated && <CountdownTimer resetTime={resetTime} />}
      
      {/* Footer removed */}
    </div>
  );
};

export default Index;
