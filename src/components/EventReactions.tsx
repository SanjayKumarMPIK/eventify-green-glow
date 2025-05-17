
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ReactionType = "👍" | "👏" | "❤️" | "🔥" | "🎉" | "🤔";

interface Reaction {
  type: ReactionType;
  count: number;
  users: string[];
}

export function EventReactions({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([
    { type: "👍", count: 0, users: [] },
    { type: "👏", count: 0, users: [] },
    { type: "❤️", count: 0, users: [] },
    { type: "🔥", count: 0, users: [] },
    { type: "🎉", count: 0, users: [] },
    { type: "🤔", count: 0, users: [] },
  ]);
  const [flyingEmojis, setFlyingEmojis] = useState<{id: number, emoji: ReactionType}[]>([]);
  const [nextEmojiId, setNextEmojiId] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    
    // In a real implementation, we would fetch reactions from a database
    // For demo purposes, we're using local storage to persist reactions
    const storedReactions = localStorage.getItem(`event-reactions-${eventId}`);
    if (storedReactions) {
      setReactions(JSON.parse(storedReactions));
    }
    
    // Set up realtime subscription for reactions
    const channel = supabase
      .channel(`event-reactions-${eventId}`)
      .on('broadcast', { event: 'reaction' }, (payload) => {
        if (payload.payload) {
          const { reaction, userId } = payload.payload as { reaction: ReactionType, userId: string };
          // Don't process own reactions (they're handled immediately in the UI)
          if (userId !== user?.id) {
            handleReactionUpdate(reaction, userId);
            
            // Add flying emoji animation
            const newEmoji = { id: nextEmojiId, emoji: reaction };
            setFlyingEmojis(current => [...current, newEmoji]);
            setNextEmojiId(prev => prev + 1);
            
            // Remove emoji after animation completes
            setTimeout(() => {
              setFlyingEmojis(current => current.filter(e => e.id !== newEmoji.id));
            }, 2000);
          }
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, user?.id, nextEmojiId]);

  const handleReactionUpdate = (type: ReactionType, userId: string) => {
    setReactions(prev => {
      const newReactions = [...prev];
      const reactionIndex = newReactions.findIndex(r => r.type === type);
      
      if (reactionIndex !== -1) {
        const reaction = newReactions[reactionIndex];
        // If user already reacted, remove their reaction
        if (reaction.users.includes(userId)) {
          reaction.users = reaction.users.filter(id => id !== userId);
          reaction.count = Math.max(0, reaction.count - 1);
        } else {
          // Add new reaction
          reaction.users.push(userId);
          reaction.count += 1;
        }
        newReactions[reactionIndex] = { ...reaction };
      }
      
      // Save to local storage
      localStorage.setItem(`event-reactions-${eventId}`, JSON.stringify(newReactions));
      
      return newReactions;
    });
  };

  const handleReaction = (type: ReactionType) => {
    if (!user) {
      toast.error("You must be logged in to react");
      return;
    }
    
    // Update UI immediately
    handleReactionUpdate(type, user.id);
    
    // Add flying emoji animation
    const newEmoji = { id: nextEmojiId, emoji: type };
    setFlyingEmojis(current => [...current, newEmoji]);
    setNextEmojiId(prev => prev + 1);
    
    // Remove emoji after animation completes
    setTimeout(() => {
      setFlyingEmojis(current => current.filter(e => e.id !== newEmoji.id));
    }, 2000);
    
    // Broadcast reaction to other users
    supabase
      .channel(`event-reactions-${eventId}`)
      .send({
        type: 'broadcast',
        event: 'reaction',
        payload: { reaction: type, userId: user.id }
      });
  };

  const hasReacted = (type: ReactionType) => {
    if (!user) return false;
    const reaction = reactions.find(r => r.type === type);
    return reaction ? reaction.users.includes(user.id) : false;
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-3">Event Reactions</h3>
        <div className="flex flex-wrap gap-2">
          {reactions.map((reaction) => (
            <Button
              key={reaction.type}
              variant={hasReacted(reaction.type) ? "default" : "outline"}
              size="sm"
              onClick={() => handleReaction(reaction.type)}
              className={`relative ${hasReacted(reaction.type) ? "bg-primary-foreground text-primary" : ""}`}
            >
              <span className="mr-1">{reaction.type}</span>
              <span className="text-xs">{reaction.count > 0 ? reaction.count : ""}</span>
            </Button>
          ))}
        </div>
        
        {/* Flying emojis */}
        <AnimatePresence>
          {flyingEmojis.map((emojiObj) => (
            <motion.div
              key={emojiObj.id}
              initial={{ 
                opacity: 0,
                scale: 0.5,
                y: 20,
                x: Math.random() * 200 - 100 
              }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.5, 1.5, 1],
                y: -100,
                x: emojiObj.id % 2 === 0 ? 50 : -50
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute text-2xl pointer-events-none"
              style={{ 
                bottom: "50px", 
                left: "50%",
              }}
            >
              {emojiObj.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
