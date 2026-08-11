import React, { useState, useEffect, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ChannelList } from './components/ChannelList';
import { ChatView } from './components/ChatView';
import { VoiceLoungeView } from './components/VoiceLoungeView';
import { FriendsView } from './components/FriendsView';
import { CommunityDashboardView } from './components/CommunityDashboardView';
import { MemberList } from './components/MemberList';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { ScreenShareModal } from './components/ScreenShareModal';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { UserProfilePopover } from './components/UserProfilePopover';
import { api, getAuthToken, removeAuthToken, WS_BASE_URL } from './services/api';
import { Channel, Message, Server, User } from './types';
import { WebRTCService } from './services/webrtc';
import { ExponentialBackoff } from './services/reconnect';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const [showServerSettingsModal, setShowServerSettingsModal] = useState(false);
  const [showUserProfilePopover, setShowUserProfilePopover] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [viewMode, setViewMode] = useState<'server' | 'friends' | 'dashboard'>('server');

  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [connectedVoiceChannel, setConnectedVoiceChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const wsRef = useRef<WebSocket | null>(null);
  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const backoffRef = useRef<ExponentialBackoff>(new ExponentialBackoff(1000, 30000, 2));

  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    const targetCh = channels.find((c) => c.id === channelId);
    if (targetCh && targetCh.channel_type === 'voice') {
      setConnectedVoiceChannel(targetCh);
    }
  };

  const handleDisconnectVoice = () => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.stopAll();
      webrtcServiceRef.current = null;
    }
    setConnectedVoiceChannel(null);
  };

  // Check auth on load
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthRequired(true);
      return;
    }

    api.getMe()
      .then((user) => {
        setCurrentUser(user);
        loadServers();
      })
      .catch(() => {
        removeAuthToken();
        setAuthRequired(true);
      });
  }, []);

  // Connect WebSocket with Automatic Reconnection Loop
  const connectWebSocket = () => {
    const token = getAuthToken();
    if (!currentUser || !token) return;

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(`${WS_BASE_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      setConnectionState('connected');
      backoffRef.current.reset();
      console.log('WebSocket connected successfully');
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      try {
        const frame = JSON.parse(event.data);
        if (frame.type === 'NewMessage') {
          const newMsg: Message = frame.data;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, decryptedText: newMsg.ciphertext }];
          });
        } else if (frame.type === 'ChannelCreated') {
          const newChannel: Channel = frame.data;
          setChannels((prev) => {
            if (prev.some((c) => c.id === newChannel.id)) return prev;
            return [...prev, newChannel];
          });
        } else if (frame.type === 'VoiceSignalRelay') {
          const { sender_id, sender_name, payload } = frame.data;
          if (sender_id !== currentUser.id) {
            if (payload.target_user_id && payload.target_user_id !== currentUser.id) {
              return;
            }
            if (webrtcServiceRef.current) {
              webrtcServiceRef.current.handleSignal(sender_id, payload.signal_type, payload.payload, sender_name);
            }
            window.dispatchEvent(
              new CustomEvent('dc_voice_signal', {
                detail: { senderId: sender_id, senderName: sender_name, signalType: payload.signal_type, payload: payload.payload },
              })
            );
          }
        } else if (frame.type === 'OnlineUsersList') {
          setOnlineUserIds(new Set(frame.data));
        } else if (frame.type === 'UserPresence') {
          const { user_id, status } = frame.data;
          setOnlineUserIds((prev) => {
            const next = new Set(prev);
            if (status === 'online') {
              next.add(user_id);
            } else {
              next.delete(user_id);
            }
            return next;
          });
        } else if (frame.type === 'UserProfileUpdated') {
          const updatedUser: User = frame.data;
          setCurrentUser((prev) => (prev && prev.id === updatedUser.id ? updatedUser : prev));
          window.dispatchEvent(new CustomEvent('dc_refresh_data'));
        } else if (frame.type === 'ServerInviteReceived' || frame.type === 'FriendAdded') {
          window.dispatchEvent(new CustomEvent('dc_refresh_data'));
        }
      } catch (err) {
        console.error('WS Parse Error:', err);
      }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      setConnectionState('reconnecting');
      console.warn('WebSocket closed. Attempting reconnect...');
      backoffRef.current.scheduleReconnect(() => {
        connectWebSocket();
      });
    };

    ws.onerror = (err) => {
      if (wsRef.current !== ws) return;
      console.error('WebSocket Error:', err);
    };
  };

  useEffect(() => {
    if (currentUser) {
      connectWebSocket();
    }
    return () => {
      backoffRef.current.clear();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [currentUser]);

  const loadServers = async () => {
    try {
      const serverList = await api.getServers();
      setServers(serverList);
      if (serverList.length > 0 && !activeServerId) {
        setActiveServerId(serverList[0].id);
      }
    } catch (err) {
      console.error('Failed to load servers:', err);
    }
  };

  // Load channels when server changes + 3s Auto-Sync Polling
  useEffect(() => {
    if (!activeServerId) {
      setChannels([]);
      setActiveChannelId(null);
      return;
    }

    const loadChannels = () => {
      api.getChannels(activeServerId)
        .then((channelList) => {
          setChannels(channelList);
          setActiveChannelId((prevActive) => {
            if (prevActive && channelList.some((c) => c.id === prevActive)) {
              return prevActive;
            }
            const defaultTextChannel = channelList.find((c) => c.channel_type === 'text');
            return defaultTextChannel ? defaultTextChannel.id : (channelList[0]?.id || null);
          });
        })
        .catch(console.error);
    };

    loadChannels();
    const interval = setInterval(loadChannels, 3000);
    return () => clearInterval(interval);
  }, [activeServerId]);

  // Load messages when text channel changes
  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    api.getMessages(activeChannelId)
      .then((msgList) => {
        setMessages(msgList.map((m) => ({ ...m, decryptedText: m.ciphertext })));
      })
      .catch(console.error);
  }, [activeChannelId]);

  const handleCreateServer = async (name: string) => {
    try {
      const newServer = await api.createServer(name);
      setServers((prev) => [...prev, newServer]);
      setActiveServerId(newServer.id);
      setViewMode('server');
    } catch (err) {
      console.error('Create server error:', err);
    }
  };

  const handleCreateChannel = async (name: string, type: 'text' | 'voice') => {
    if (!activeServerId) return;
    try {
      const newChannel = await api.createChannel(activeServerId, name, type);
      setChannels((prev) => [...prev, newChannel]);
      setActiveChannelId(newChannel.id);
    } catch (err) {
      console.error('Create channel error:', err);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!activeChannelId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = {
      type: 'SendMessage',
      data: {
        channel_id: activeChannelId,
        ciphertext: text,
        nonce: null,
      },
    };

    wsRef.current.send(JSON.stringify(payload));
  };

  const handleSendVoiceSignal = (signal: { targetUserId?: string; signalType: string; payload: string }) => {
    if (!activeChannelId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'VoiceSignal',
        data: {
          channel_id: activeChannelId,
          target_user_id: signal.targetUserId || null,
          signal_type: signal.signalType,
          payload: signal.payload,
        },
      })
    );
  };

  const handleLogout = () => {
    backoffRef.current.clear();
    removeAuthToken();
    setCurrentUser(null);
    setAuthRequired(true);
    setShowSettings(false);
    if (wsRef.current) wsRef.current.close();
  };

  const activeServer = servers.find((s) => s.id === activeServerId) || null;
  const activeChannel = channels.find((c) => c.id === activeChannelId) || null;
  const isVoiceChannel = activeChannel?.channel_type === 'voice';

  return (
    <div className="flex flex-col h-screen w-screen bg-midnight-darkest overflow-hidden font-['Inter',sans-serif] relative">
      {/* Reconnecting Status Banner Toast */}
      {connectionState === 'reconnecting' && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center space-x-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>Bağlantı koptu, yeniden bağlanılıyor (Deneme #{backoffRef.current.getAttemptCount()})...</span>
        </div>
      )}

      {/* Custom Windows TitleBar */}
      <TitleBar />

      <div className="flex-1 flex overflow-hidden">
        {authRequired && (
          <AuthModal
            onSuccess={(user) => {
              setCurrentUser(user);
              setAuthRequired(false);
              loadServers();
            }}
          />
        )}

        {showSettings && (
          <SettingsModal
            currentUser={currentUser}
            onClose={() => setShowSettings(false)}
            onLogout={handleLogout}
            onUpdateUser={(updated) => setCurrentUser(updated)}
          />
        )}

        {showScreenShareModal && (
          <ScreenShareModal
            onClose={() => setShowScreenShareModal(false)}
            onStartShare={(monitor, quality) => {
              if (webrtcServiceRef.current) {
                webrtcServiceRef.current.startScreenShare(quality);
              }
            }}
          />
        )}

        {showServerSettingsModal && (
          <ServerSettingsModal
            server={activeServer}
            onClose={() => setShowServerSettingsModal(false)}
          />
        )}

        {showUserProfilePopover && (
          <UserProfilePopover
            username="AetherUser"
            onClose={() => setShowUserProfilePopover(false)}
            onDirectMessage={() => {
              setShowUserProfilePopover(false);
              setViewMode('friends');
            }}
          />
        )}

        {/* 1. Left Navigation Rail */}
        <Sidebar
          servers={servers}
          activeServerId={activeServerId}
          currentUser={currentUser}
          onSelectServer={(id) => {
            if (id === null) {
              setViewMode('friends');
            } else {
              setActiveServerId(id);
              setViewMode('server');
            }
          }}
          onCreateServer={handleCreateServer}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Dynamic Main View Modes */}
        {viewMode === 'friends' ? (
          <FriendsView
            currentUser={currentUser}
            onlineUserIds={onlineUserIds}
            onOpenDM={async (friend) => {
              try {
                const dmChannel = await api.getOrCreateDM(friend.id);
                dmChannel.name = `@${friend.username}`;
                setChannels([dmChannel]);
                setActiveChannelId(dmChannel.id);
                setViewMode('server');
              } catch (err) {
                console.error('Failed to open DM channel:', err);
              }
            }}
            onOpenSettings={() => setShowSettings(true)}
            onServerJoined={loadServers}
          />
        ) : viewMode === 'dashboard' ? (
          <CommunityDashboardView
            onSelectExplore={() => setViewMode('friends')}
            onCreateServer={() => setShowServerSettingsModal(true)}
          />
        ) : (
          <>
            {/* 2. Channel Navigation Panel */}
            <ChannelList
              server={activeServer}
              channels={channels}
              activeChannelId={activeChannelId}
              connectedVoiceChannel={connectedVoiceChannel}
              currentUser={currentUser}
              onSelectChannel={handleSelectChannel}
              onCreateChannel={handleCreateChannel}
              onOpenSettings={() => setShowSettings(true)}
              onDisconnectVoice={handleDisconnectVoice}
            />

            {/* 3. Persistent Voice Lounge (kept active in background when switching text channels) */}
            {connectedVoiceChannel && (
              <div className={activeChannelId === connectedVoiceChannel.id ? 'flex-1 h-full flex flex-col' : 'hidden'}>
                <VoiceLoungeView
                  channel={connectedVoiceChannel}
                  currentUser={currentUser}
                  onOpenScreenShare={() => setShowScreenShareModal(true)}
                  onSendVoiceSignal={handleSendVoiceSignal}
                  onBindWebRTCService={(rtc) => {
                    webrtcServiceRef.current = rtc;
                  }}
                  onLeaveVoice={handleDisconnectVoice}
                />
              </div>
            )}

            {/* 4. Text Chat View */}
            {activeChannelId !== connectedVoiceChannel?.id && (
              <ChatView
                channel={activeChannel}
                messages={messages}
                currentUser={currentUser}
                onSendMessage={handleSendMessage}
                onToggleMembers={() => setShowMembers(!showMembers)}
              />
            )}

            {/* 5. Right Member Sidebar */}
            {activeServer && showMembers && activeChannelId !== connectedVoiceChannel?.id && (
              <MemberList server={activeServer} currentUser={currentUser} />
            )}
          </>
        )}
      </div>
    </div>
  );
};
