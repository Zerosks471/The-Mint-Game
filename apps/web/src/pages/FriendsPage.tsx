import { useEffect, useState, useCallback } from 'react';
import { gameApi, Friend, FriendRequest, UserSearchResult, GiftInfo } from '../api/game';
import { formatCurrency } from '@mint/utils';

type Tab = 'friends' | 'requests' | 'search' | 'gifts';

export function FriendsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [pendingGifts, setPendingGifts] = useState<GiftInfo[]>([]);
  const [giftCounts, setGiftCounts] = useState({ pending: 0, sentToday: 0, maxPerDay: 5 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [friendsRes, requestsRes, sentRes, giftsRes, countsRes] = await Promise.all([
        gameApi.getFriends(),
        gameApi.getFriendRequests(),
        gameApi.getSentRequests(),
        gameApi.getPendingGifts(),
        gameApi.getGiftCounts(),
      ]);

      if (friendsRes.success && friendsRes.data) setFriends(friendsRes.data);
      if (requestsRes.success && requestsRes.data) setRequests(requestsRes.data);
      if (sentRes.success && sentRes.data) setSentRequests(sentRes.data);
      if (giftsRes.success && giftsRes.data) setPendingGifts(giftsRes.data);
      if (countsRes.success && countsRes.data) setGiftCounts(countsRes.data);
    } catch {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await gameApi.searchUsers(query);
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    } catch {
      // Silently fail
    }
  };

  const handleSendRequest = async (username: string) => {
    try {
      const res = await gameApi.sendFriendRequest(username);
      if (res.success) {
        setSuccessMessage('Friend request sent!');
        await fetchData();
        setSearchQuery('');
        setSearchResults([]);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to send request');
      }
    } catch {
      setError('Failed to send request');
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      const res = await gameApi.acceptFriendRequest(id);
      if (res.success) {
        setSuccessMessage('Friend request accepted!');
        await fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      setError('Failed to accept request');
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await gameApi.rejectFriendRequest(id);
      await fetchData();
    } catch {
      setError('Failed to reject request');
    }
  };

  const handleRemoveFriend = async (id: string) => {
    if (!confirm('Remove this friend?')) return;
    try {
      await gameApi.removeFriend(id);
      await fetchData();
    } catch {
      setError('Failed to remove friend');
    }
  };

  const handleSendGift = async (friendId: string) => {
    if (giftCounts.sentToday >= giftCounts.maxPerDay) {
      setError('Daily gift limit reached');
      return;
    }
    try {
      const res = await gameApi.sendGift(friendId, 'cash');
      if (res.success) {
        setSuccessMessage('Gift sent!');
        await fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to send gift');
      }
    } catch {
      setError('Failed to send gift');
    }
  };

  const handleClaimGift = async (giftId: string) => {
    try {
      const res = await gameApi.claimGift(giftId);
      if (res.success && res.data) {
        setSuccessMessage(
          res.data.cashReceived
            ? `Claimed ${formatCurrency(res.data.cashReceived)}!`
            : 'Gift claimed!'
        );
        await fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      setError('Failed to claim gift');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Friends</h1>
            <p className="text-blue-100">
              {friends.length} friends | {requests.length} pending requests
            </p>
          </div>
          <span className="text-5xl">👥</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-600">
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-border pb-2">
        {[
          { key: 'friends' as Tab, label: 'Friends', count: friends.length },
          { key: 'requests' as Tab, label: 'Requests', count: requests.length },
          { key: 'search' as Tab, label: 'Add Friend', count: null },
          { key: 'gifts' as Tab, label: 'Gifts', count: pendingGifts.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-500 text-white'
                : 'bg-dark-elevated text-zinc-400 hover:bg-dark-card'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        {/* Friends List */}
        {activeTab === 'friends' && (
          <div className="space-y-4">
            {friends.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">
                No friends yet. Add some friends to share the journey!
              </p>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-4 bg-dark-elevated rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100">
                        {friend.friend.displayName || friend.friend.username}
                      </p>
                      <p className="text-sm text-zinc-500">@{friend.friend.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendGift(friend.friend.id)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors"
                      disabled={giftCounts.sentToday >= giftCounts.maxPerDay}
                    >
                      🎁 Gift
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="px-4 py-2 bg-dark-elevated hover:bg-dark-card border border-dark-border text-zinc-400 rounded-xl text-sm font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Received */}
            <div>
              <h3 className="font-bold text-zinc-100 mb-3">Received Requests</h3>
              {requests.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-4 bg-dark-elevated rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          👤
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">
                            {req.requester.displayName || req.requester.username}
                          </p>
                          <p className="text-sm text-zinc-500">@{req.requester.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-4 py-2 bg-dark-elevated hover:bg-dark-card border border-dark-border text-zinc-400 rounded-xl text-sm font-medium"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent */}
            <div>
              <h3 className="font-bold text-zinc-100 mb-3">Sent Requests</h3>
              {sentRequests.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">No pending sent requests</p>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-4 bg-dark-elevated rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          👤
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">
                            {req.requester.displayName || req.requester.username}
                          </p>
                          <p className="text-sm text-zinc-500">@{req.requester.username}</p>
                        </div>
                      </div>
                      <span className="text-sm text-zinc-400">Pending...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Search by username
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Enter username..."
                className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-xl text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-dark-elevated rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        👤
                      </div>
                      <div>
                        <p className="font-medium text-zinc-100">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-sm text-zinc-500">@{user.username}</p>
                      </div>
                    </div>
                    {user.isFriend ? (
                      <span className="text-green-600 text-sm font-medium">Already friends</span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(user.username)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium"
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-zinc-500 text-center py-4">No users found</p>
            )}
          </div>
        )}

        {/* Gifts */}
        {activeTab === 'gifts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-zinc-100">Pending Gifts</h3>
              <span className="text-sm text-zinc-500">
                Sent today: {giftCounts.sentToday}/{giftCounts.maxPerDay}
              </span>
            </div>

            {pendingGifts.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No pending gifts</p>
            ) : (
              <div className="space-y-3">
                {pendingGifts.map((gift) => (
                  <div
                    key={gift.id}
                    className="flex items-center justify-between p-4 bg-dark-elevated border border-yellow-500/20 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎁</span>
                      <div>
                        <p className="font-medium text-zinc-100">
                          Gift from {gift.senderUsername}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {gift.giftData.amount
                            ? formatCurrency(gift.giftData.amount)
                            : 'Mystery gift'}
                        </p>
                        {gift.message && (
                          <p className="text-sm text-zinc-400 italic">"{gift.message}"</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleClaimGift(gift.id)}
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-medium"
                    >
                      Claim
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
