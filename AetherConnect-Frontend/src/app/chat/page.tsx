
'use client';

import { ChatView } from '@/components/chat/chat-view';
import { useSelectedRoom } from '@/context/selected-room-context';
import { MessageSquare } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';

export default function ChatPage() {
  const { selectedRoomId } = useSelectedRoom();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!selectedRoomId) {
    return (
        <div className="flex h-full flex-col items-center justify-center bg-secondary">
            <div className="flex flex-col items-center text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground" />
                <h1 className="mt-4 text-2xl font-semibold">Welcome to Aether Connect</h1>
                <p className="mt-2 text-muted-foreground">
                    Select a conversation from the sidebar to start messaging.
                </p>
            </div>
        </div>
    );
  }

  return <ChatView conversationId={selectedRoomId} />;
}
