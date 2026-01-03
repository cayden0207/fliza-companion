import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    created_at: string;
    metadata?: any;
}

export function useChatHistory() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false); // Default false to allow immediate guest interaction
    const [user, setUser] = useState<User | null>(null);
    const [guestId] = useState(() => 'guest-' + Math.random().toString(36).substr(2, 9)); // Stable guest ID for session

    // Helper to get effective user ID
    const getEffectiveUserId = () => user?.id || guestId;

    // Effect to get current user and listen for auth state changes
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Effect for loading history
    useEffect(() => {
        // If guest, we just start empty
        if (!user) {
            setLoading(false);
            return;
        }

        // 2. Load History
        const fetchMessages = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setMessages(data as Message[]);
            }
            setLoading(false);
        };

        fetchMessages();

        // 3. Realtime Subscription (Listen for new messages from Eliza)
        const channel = supabase
            .channel('chat_updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => [...prev, newMsg]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // 4. Send Message Function
    const sendMessage = async (content: string, role: 'user' | 'assistant' = 'user', visionContext?: string) => {
        const effectiveUserId = getEffectiveUserId();
        const isGuest = !user;

        // Optimistic Update: Show message immediately
        const tempId = 'temp-' + Date.now();
        const optimisticMsg: Message = {
            id: tempId,
            content,
            role,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);

        // If user sent a message, set typing state to true (waiting for AI)
        if (role === 'user') {
            setLoading(true);
        }

        let savedMessage = optimisticMsg;

        if (!isGuest) {
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    user_id: user!.id,
                    content,
                    role,
                })
                .select()
                .single();

            if (error) {
                console.error('Error sending message:', error);
                // We don't rollback for guest mode or demo stability, but log it
            } else {
                savedMessage = data as Message;
                // Replace temp message with real one (updates ID and timestamp)
                setMessages(prev => prev.map(m => m.id === tempId ? savedMessage : m));
            }
        }

        // Trigger Eliza Response
        if (role === 'user') {
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: content,
                        userId: effectiveUserId, // Send guest ID or real ID
                        visionContext
                    }),
                });

                if (!res.ok) {
                    throw new Error(`API Error: ${res.status}`);
                }

                const apiData = await res.json();
                console.log('ElizaOS Response:', apiData);

                // For Guest Mode OR if Realtime is slow/fails
                if (apiData.response) {
                    const aiMessage: Message = {
                        id: 'ai-' + Date.now(),
                        content: apiData.response,
                        role: 'assistant',
                        created_at: new Date().toISOString()
                    };
                    setMessages(prev => {
                        // Avoid duplicates (check if Realtime already added it - mainly for logged in users)
                        const exists = prev.some(m =>
                            m.role === 'assistant' && m.content === apiData.response
                        );
                        return exists ? prev : [...prev, aiMessage];
                    });
                }
            } catch (err) {
                console.error('Failed to trigger AI:', err);

                // Demo fallback if API fails
                const errorMsg: Message = {
                    id: 'err-' + Date.now(),
                    content: "Sorry, I'm having trouble connecting to the network (Demo Mode).",
                    role: 'assistant',
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, errorMsg]);

            } finally {
                setLoading(false);
            }
        }
    };

    // Return guestId as user if valid user is null, to trick UI into thinking we are logged in for demo
    // Or we keep user as null but pass a 'isGuest' flag.
    // Simpler for existing UI: return a fake user object if guest
    const exposedUser = user || (guestId ? { id: guestId, email: 'guest@demo.com' } as User : null);

    return { messages, loading, sendMessage, user: exposedUser };
}
