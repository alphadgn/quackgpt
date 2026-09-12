import { useState, useCallback, useRef, useEffect } from "react";
import { ScrollBendContainer } from "@/components/ScrollBendContainer";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { ChatModeSelector, ChatMode } from "@/components/ChatModeSelector";
import { GlowBracket } from "@/components/GlowBracket";
import { Button } from "@/components/ui/button";
import { Send, Trash2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";

const Index = () => {
  const [prefillMessage, setPrefillMessage] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isTyping, 
    sendMessage,
    clearMessages,
  } = useChat();

  // Only scroll to latest message when a NEW message arrives (not on every re-render)
  // Use scrollIntoView on the chatEnd ref but never lock scroll position
  const prevMsgCount = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCount.current && chatEndRef.current) {
      // Use a short delay so layout settles, then gently scroll the new message into view
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
    prevMsgCount.current = messages.length;
  }, [messages.length]);

  const handlePrefillConsumed = useCallback(() => {
    setPrefillMessage("");
  }, []);

  const selectionComplete = chatMode !== null;

  const handleSendMessage = useCallback((content: string) => {
    if (!chatMode) return;
    if (chatMode === "quack-check") {
      sendMessage(`[QUACK CHECK] ${content}`, "quack-check");
    } else {
      sendMessage(content, "search");
    }
  }, [chatMode, sendMessage]);

  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden">
      <div className="relative z-10 flex flex-col min-h-screen w-full">
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-0 overflow-x-hidden">
        {/* Chat area - always visible */}
        <div>
          {messages.length === 0 ? (
            <WelcomeScreen onQuerySelect={setPrefillMessage} />
          ) : (
            <ScrollBendContainer className="divide-y divide-border/30">
              {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={chatEndRef} />
            </ScrollBendContainer>
          )}
        </div>

        {/* Mode selector + Input area - always visible */}
        <div className="p-4">
          <div className="flex flex-col items-center gap-3 mb-3 max-w-3xl mx-auto">
              {/* Step 1: Always show mode selector */}
              <div className="w-full animate-fade-in flex flex-col items-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className={`text-xl transition-all duration-500 ${!chatMode ? 'opacity-100 w-7' : 'opacity-0 w-0'}`} style={{ animation: !chatMode ? 'horizontal-bounce-right 0.7s ease-in-out infinite' : 'none', overflow: 'hidden' }}>👉</span>
                <p className={`text-[17px] sm:text-[21px] leading-tight text-center uppercase tracking-wider font-bold transition-colors duration-500 ${chatMode ? 'text-muted-foreground' : 'text-primary'}`}>
                  Select a search mode
                </p>
                <span className={`text-xl transition-all duration-500 ${!chatMode ? 'opacity-100 w-7' : 'opacity-0 w-0'}`} style={{ animation: !chatMode ? 'horizontal-bounce-left 0.7s ease-in-out infinite' : 'none', overflow: 'hidden' }}>👈</span>
              </div>
                <GlowBracket visible={!chatMode} />
                <ChatModeSelector mode={chatMode} onModeChange={setChatMode} className="justify-center" />
              </div>
          </div>
          {!selectionComplete ? (
              <div className="max-w-3xl mx-auto w-full">
                <div className="relative flex items-end gap-2 p-2 rounded-2xl border border-border/30 bg-secondary/10 opacity-60 cursor-not-allowed">
                  <textarea
                    disabled
                    rows={1}
                    placeholder="Select a search mode above to begin..."
                    className="flex-1 bg-transparent resize-none border-0 outline-none text-foreground placeholder:text-primary/50 px-3 py-2 text-sm leading-relaxed opacity-50 cursor-not-allowed"
                  />
                  <Button variant="send" size="icon" disabled className="shrink-0 opacity-50">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <ChatInput
                onSend={handleSendMessage}
                disabled={isTyping || !selectionComplete}
                className="max-w-3xl mx-auto"
                prefillValue={prefillMessage}
                onPrefillConsumed={handlePrefillConsumed}
                selectionComplete={selectionComplete}
              />
            )}

          {messages.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" size="sm" onClick={clearMessages} className="text-muted-foreground">
                <Trash2 className="h-4 w-4" /> Clear this device's chat
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6 mb-12 max-w-xl mx-auto">
            QuackGPT provides information only. Not financial advice.
            Answers are drawn only from official Ugly Duck Society sources.
          </p>
        </div>
      </main>
      <Footer />
      </div>
    </div>
  );
};

export default Index;
