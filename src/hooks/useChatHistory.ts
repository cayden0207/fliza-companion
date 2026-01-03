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
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // 1. Get Current User
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) {
            setMessages([]);
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
    const sendMessage = async (content: string, role: 'user' | 'assistant' = 'user') => {
        if (!user) return;

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

        const { data, error } = await supabase
            .from('messages')
            .insert({
                user_id: user.id,
                content,
                role,
            })
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            // Rollback optimistic update
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setLoading(false);
        } else {
            // Replace temp message with real one (updates ID and timestamp)
            setMessages(prev => prev.map(m => m.id === tempId ? (data as Message) : m));

            // Trigger Eliza Response
            if (role === 'user') {
                try {
                    const res = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: content,
                            userId: user.id,
                        }),
                    });

                    if (!res.ok) {
                        throw new Error(`API Error: ${res.status}`);
                    }

                    const apiData = await res.json();
                    console.log('ElizaOS Response:', apiData);

                    // If response was received, manually add to messages
                    // (Realtime should also catch this, but belt and suspenders)
                    if (apiData.response) {
                        const aiMessage: Message = {
                            id: 'ai-' + Date.now(),
                            content: apiData.response,
                            role: 'assistant',
                            created_at: new Date().toISOString()
                        };
                        setMessages(prev => {
                            // Avoid duplicates (check if Realtime already added it)
                            const exists = prev.some(m =>
                                m.role === 'assistant' && m.content === apiData.response
                            );
                            return exists ? prev : [...prev, aiMessage];
                        });
                    }
                } catch (err) {
                    console.error('Failed to trigger AI:', err);
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    return { messages, loading, sendMessage, user };
}
