import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { authenticated, login, logout, tier, walletAddress, email } = useAuth();
  
  const { 
    messages, 
    isTyping, 
    queriesRemaining, 
    sendMessage 
  } = useChat(tier);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header 
        tier={tier}
        isLoggedIn={authenticated}
        walletAddress={walletAddress}
        email={email}
        onLogin={login}
        onLogout={logout}
      />
      
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen tier={tier} queriesRemaining={queriesRemaining} />
          ) : (
            <div className="divide-y divide-border/30">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isTyping && <TypingIndicator />}
            </div>
          )}
        </div>
        
        {/* Input area */}
        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <ChatInput
            onSend={sendMessage}
            disabled={isTyping}
            tier={tier}
            queriesRemaining={queriesRemaining}
            className="max-w-3xl mx-auto"
          />
          
          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mt-4 max-w-xl mx-auto">
            quackGPT provides information only. Not financial advice. 
            Data sourced from official Wallchain channels.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
