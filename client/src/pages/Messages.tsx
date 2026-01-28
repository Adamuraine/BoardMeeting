import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMyProfile } from "@/hooks/use-profiles";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, Bug } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Profile, Message } from "@shared/schema";

type Conversation = {
  buddy: Profile;
  lastMessage: Message;
  unreadCount: number;
};

export default function Messages() {
  const { data: profile } = useMyProfile();
  const [selectedBuddy, setSelectedBuddy] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const [buddyIdFromUrl, setBuddyIdFromUrl] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  const fetchDebugInfo = async () => {
    setDebugLoading(true);
    try {
      const res = await fetch("/api/debug/messages", { credentials: "include" });
      const data = await res.json();
      setDebugInfo(data);
      setShowDebug(true);
    } catch (e) {
      console.error("Debug fetch error:", e);
      setDebugInfo({ error: String(e) });
      setShowDebug(true);
    }
    setDebugLoading(false);
  };

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    enabled: !!profile,
    refetchInterval: 5000,
  });

  const { data: buddies = [] } = useQuery<Profile[]>({
    queryKey: ["/api/buddies"],
    enabled: !!profile,
  });

  // Fetch profile by userId if coming from a profile page
  const { data: profileFromUrl } = useQuery<Profile>({
    queryKey: ["/api/profiles/user", buddyIdFromUrl],
    enabled: !!buddyIdFromUrl && !selectedBuddy,
  });

  // Get buddy ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const buddyId = params.get("buddy");
    if (buddyId) {
      setBuddyIdFromUrl(buddyId);
    }
  }, []);

  // Try to find buddy in buddies list first, then fall back to fetched profile
  useEffect(() => {
    if (buddyIdFromUrl && !selectedBuddy) {
      // First check buddies list
      const buddy = buddies.find(b => b.userId === buddyIdFromUrl);
      if (buddy) {
        setSelectedBuddy(buddy);
        navigate("/messages", { replace: true });
        setBuddyIdFromUrl(null);
      } else if (profileFromUrl) {
        // Fall back to fetched profile
        setSelectedBuddy(profileFromUrl);
        navigate("/messages", { replace: true });
        setBuddyIdFromUrl(null);
      }
    }
  }, [buddies, buddyIdFromUrl, profileFromUrl, selectedBuddy, navigate]);

  const { data: threadMessages = [], isLoading: threadLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedBuddy?.userId],
    enabled: !!selectedBuddy,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        receiverId: selectedBuddy!.userId,
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedBuddy?.userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setNewMessage("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedBuddy) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  const buddiesWithoutConversation = buddies.filter(
    b => !conversations.some(c => c.buddy.userId === b.userId)
  );

  if (selectedBuddy) {
    return (
      <Layout showNav={false}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 p-4 border-b bg-background sticky top-0 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedBuddy(null)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedBuddy.imageUrls?.[0]} />
              <AvatarFallback>{selectedBuddy.displayName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-foreground">{selectedBuddy.displayName}</h2>
              <p className="text-xs text-muted-foreground">{selectedBuddy.location}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {threadLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-3/4" />
                ))}
              </div>
            ) : threadMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">Send a message to start the conversation</p>
              </div>
            ) : (
              threadMessages.map((msg) => {
                const isMe = msg.senderId === profile?.userId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] px-4 py-2 rounded-2xl",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary text-foreground rounded-bl-sm"
                      )}
                      data-testid={`message-${msg.id}`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={cn(
                        "text-[10px] mt-1",
                        isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {msg.createdAt && format(new Date(msg.createdAt), "h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                data-testid="input-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim() || sendMutation.isPending}
                data-testid="button-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Messages</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchDebugInfo}
            disabled={debugLoading}
            data-testid="button-debug"
          >
            <Bug className="h-5 w-5" />
          </Button>
        </div>

        <Dialog open={showDebug} onOpenChange={setShowDebug}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Message Debug Info</DialogTitle>
            </DialogHeader>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[60vh]">
              {debugInfo ? JSON.stringify(debugInfo, null, 2) : "Loading..."}
            </pre>
          </DialogContent>
        </Dialog>

        {conversationsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 && buddiesWithoutConversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No conversations yet</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Match with surf buddies to start messaging them
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.buddy.userId}
                onClick={() => setSelectedBuddy(conv.buddy)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover-elevate active-elevate-2 transition-colors"
                data-testid={`conversation-${conv.buddy.userId}`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conv.buddy.imageUrls?.[0]} />
                    <AvatarFallback>{conv.buddy.displayName[0]}</AvatarFallback>
                  </Avatar>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{conv.buddy.displayName}</h3>
                    {conv.lastMessage.createdAt && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {format(new Date(conv.lastMessage.createdAt), "MMM d")}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm truncate",
                    conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {conv.lastMessage.senderId === profile?.userId && "You: "}
                    {conv.lastMessage.content}
                  </p>
                </div>
              </button>
            ))}

            {buddiesWithoutConversation.length > 0 && (
              <>
                <div className="pt-4 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Start a conversation
                  </h3>
                </div>
                {buddiesWithoutConversation.map((buddy) => (
                  <button
                    key={buddy.userId}
                    onClick={() => setSelectedBuddy(buddy)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover-elevate active-elevate-2 transition-colors"
                    data-testid={`buddy-${buddy.userId}`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={buddy.imageUrls?.[0]} />
                      <AvatarFallback>{buddy.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="font-semibold text-foreground truncate">{buddy.displayName}</h3>
                      <p className="text-sm text-muted-foreground truncate">{buddy.location}</p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
