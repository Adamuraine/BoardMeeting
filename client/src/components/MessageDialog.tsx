import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMyProfile } from "@/hooks/use-profiles";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Profile, Message } from "@shared/schema";

interface MessageDialogProps {
  buddy: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MessageDialog({ buddy, open, onOpenChange }: MessageDialogProps) {
  const { data: profile } = useMyProfile();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: threadMessages = [], isLoading: threadLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", buddy?.userId],
    enabled: !!buddy && open,
    refetchInterval: open ? 3000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        receiverId: buddy!.userId,
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", buddy?.userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setNewMessage("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && buddy) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  if (!buddy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="flex flex-row items-center gap-3 p-4 border-b">
          <Avatar className="h-10 w-10">
            <AvatarImage src={buddy.imageUrls?.[0]} />
            <AvatarFallback>{buddy.displayName[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <DialogTitle className="text-left">{buddy.displayName}</DialogTitle>
            <p className="text-xs text-muted-foreground">{buddy.location}</p>
          </div>
        </DialogHeader>

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
                    data-testid={`dialog-message-${msg.id}`}
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
              data-testid="dialog-input-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || sendMutation.isPending}
              data-testid="dialog-button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
