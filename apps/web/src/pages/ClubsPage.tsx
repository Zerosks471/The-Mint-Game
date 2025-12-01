import { useEffect, useState, useCallback } from 'react';
import { gameApi, ClubInfo, ClubMember, ClubActivity } from '../api/game';
import { formatCurrency } from '@mint/utils';

type View = 'browse' | 'my-club' | 'create' | 'detail';

export function ClubsPage() {
  const [view, setView] = useState<View>('browse');
  const [publicClubs, setPublicClubs] = useState<ClubInfo[]>([]);
  const [myClub, setMyClub] = useState<ClubInfo | null>(null);
  const [selectedClub, setSelectedClub] = useState<(ClubInfo & { members: ClubMember[] }) | null>(null);
  const [activities, setActivities] = useState<ClubActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create form
  const [clubName, setClubName] = useState('');
  const [clubDescription, setClubDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Donate form
  const [donateAmount, setDonateAmount] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [clubsRes, myClubRes] = await Promise.all([
        gameApi.getPublicClubs(),
        gameApi.getMyClub(),
      ]);

      if (clubsRes.success && clubsRes.data) setPublicClubs(clubsRes.data);
      if (myClubRes.success) {
        setMyClub(myClubRes.data ?? null);
        if (myClubRes.data) {
          setView('my-club');
        }
      }
    } catch {
      setError('Failed to load clubs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewClub = async (clubId: string) => {
    try {
      const [clubRes, activitiesRes] = await Promise.all([
        gameApi.getClub(clubId),
        gameApi.getClubActivities(clubId),
      ]);

      if (clubRes.success && clubRes.data) {
        setSelectedClub(clubRes.data);
        setView('detail');
      }
      if (activitiesRes.success && activitiesRes.data) {
        setActivities(activitiesRes.data);
      }
    } catch {
      setError('Failed to load club details');
    }
  };

  const handleCreateClub = async () => {
    if (!clubName || clubName.length < 3) {
      setError('Club name must be at least 3 characters');
      return;
    }

    try {
      const res = await gameApi.createClub(clubName, clubDescription, isPublic);
      if (res.success && res.data) {
        setSuccessMessage('Club created!');
        setMyClub(res.data);
        setView('my-club');
        setClubName('');
        setClubDescription('');
        await fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to create club');
      }
    } catch {
      setError('Failed to create club');
    }
  };

  const handleJoinClub = async (clubId: string) => {
    try {
      const res = await gameApi.joinClub(clubId);
      if (res.success) {
        setSuccessMessage('Joined club!');
        await fetchData();
        setView('my-club');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to join club');
      }
    } catch {
      setError('Failed to join club');
    }
  };

  const handleLeaveClub = async () => {
    if (!confirm('Are you sure you want to leave this club?')) return;

    try {
      const res = await gameApi.leaveClub();
      if (res.success) {
        setSuccessMessage('Left club');
        setMyClub(null);
        setView('browse');
        await fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to leave club');
      }
    } catch {
      setError('Failed to leave club');
    }
  };

  const handleDonate = async () => {
    const amount = parseInt(donateAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    try {
      const res = await gameApi.donateToClub(amount);
      if (res.success && res.data) {
        setSuccessMessage(`Donated! Club is now level ${res.data.newLevel}`);
        setDonateAmount('');
        await fetchData();
        if (myClub) {
          const clubRes = await gameApi.getClub(myClub.id);
          if (clubRes.success && clubRes.data) {
            setSelectedClub(clubRes.data);
          }
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to donate');
      }
    } catch {
      setError('Failed to donate');
    }
  };

  const handleKickMember = async (userId: string) => {
    if (!confirm('Kick this member?')) return;

    try {
      await gameApi.kickClubMember(userId);
      setSuccessMessage('Member kicked');
      if (myClub) {
        await handleViewClub(myClub.id);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to kick member');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple/20 to-pink/20 border border-purple/30 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Clubs</h1>
            <p className="text-zinc-400">
              {myClub ? `Member of ${myClub.name}` : 'Join a club for bonus income!'}
            </p>
          </div>
          <span className="text-5xl">🏛️</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-mint/10 border border-mint/30 rounded-xl p-4 text-mint">
          {successMessage}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('browse')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            view === 'browse'
              ? 'bg-purple/20 text-purple border border-purple/30'
              : 'bg-dark-elevated text-zinc-400 hover:text-zinc-200 hover:bg-dark-border'
          }`}
        >
          Browse Clubs
        </button>
        {myClub && (
          <button
            onClick={() => {
              setView('my-club');
              handleViewClub(myClub.id);
            }}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              view === 'my-club' || view === 'detail'
                ? 'bg-purple/20 text-purple border border-purple/30'
                : 'bg-dark-elevated text-zinc-400 hover:text-zinc-200 hover:bg-dark-border'
            }`}
          >
            My Club
          </button>
        )}
        {!myClub && (
          <button
            onClick={() => setView('create')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              view === 'create'
                ? 'bg-purple/20 text-purple border border-purple/30'
                : 'bg-dark-elevated text-zinc-400 hover:text-zinc-200 hover:bg-dark-border'
            }`}
          >
            Create Club
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        {/* Browse Clubs */}
        {view === 'browse' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-100 mb-4">Public Clubs</h2>
            {publicClubs.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No public clubs yet. Be the first to create one!</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {publicClubs.map((club) => (
                  <div
                    key={club.id}
                    className="bg-dark-elevated border border-dark-border rounded-xl p-4 hover:border-purple/30 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-zinc-100">{club.name}</h3>
                        <p className="text-sm text-zinc-500">by {club.ownerUsername}</p>
                      </div>
                      <span className="px-2 py-1 bg-purple/20 text-purple text-sm rounded-full font-medium">
                        Lv.{club.clubLevel}
                      </span>
                    </div>
                    {club.description && (
                      <p className="text-sm text-zinc-400 mb-3">{club.description}</p>
                    )}
                    <div className="flex justify-between items-center text-sm text-zinc-500 mb-3">
                      <span>
                        {club.memberCount}/{club.maxMembers} members
                      </span>
                      <span className="text-mint font-medium">+{club.incomeBonusPct}% income</span>
                    </div>
                    {!myClub && (
                      <button
                        onClick={() => handleJoinClub(club.id)}
                        disabled={club.memberCount >= club.maxMembers}
                        className="w-full py-2 bg-purple hover:bg-purple/80 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {club.memberCount >= club.maxMembers ? 'Full' : 'Join Club'}
                      </button>
                    )}
                    {myClub?.id === club.id && (
                      <span className="block text-center text-mint font-medium">Your Club</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Club / Club Detail */}
        {(view === 'my-club' || view === 'detail') && selectedClub && (
          <div className="space-y-6">
            {/* Club Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">{selectedClub.name}</h2>
                <p className="text-zinc-500">Owner: {selectedClub.ownerUsername}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-purple">Lv.{selectedClub.clubLevel}</span>
                <p className="text-mint font-medium">+{selectedClub.incomeBonusPct}% income bonus</p>
              </div>
            </div>

            {selectedClub.description && (
              <p className="text-zinc-400 bg-dark-elevated p-4 rounded-xl">{selectedClub.description}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-dark-elevated rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-zinc-100 font-mono">{selectedClub.memberCount}</p>
                <p className="text-sm text-zinc-500">Members</p>
              </div>
              <div className="bg-dark-elevated rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-zinc-100 font-mono">{selectedClub.maxMembers}</p>
                <p className="text-sm text-zinc-500">Max</p>
              </div>
              <div className="bg-mint/10 border border-mint/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-mint font-mono">+{selectedClub.incomeBonusPct}%</p>
                <p className="text-sm text-zinc-500">Bonus</p>
              </div>
            </div>

            {/* Donate Section (if member) */}
            {selectedClub.isMember && (
              <div className="bg-purple/10 border border-purple/30 rounded-xl p-4">
                <h3 className="font-bold text-zinc-100 mb-3">Donate to Level Up</h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(e.target.value)}
                    placeholder="Amount..."
                    className="flex-1 px-4 py-3 bg-dark-input border border-dark-border rounded-xl text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-purple/50 focus:border-purple"
                  />
                  <button
                    onClick={handleDonate}
                    className="px-6 py-2 bg-purple hover:bg-purple/80 text-white rounded-xl font-medium transition-colors"
                  >
                    Donate
                  </button>
                </div>
                {selectedClub.nextLevelDonations && (
                  <p className="text-sm text-zinc-500 mt-2">
                    Next level at {formatCurrency(selectedClub.nextLevelDonations)} total donations
                  </p>
                )}
              </div>
            )}

            {/* Members List */}
            <div>
              <h3 className="font-bold text-zinc-100 mb-3">Members</h3>
              <div className="space-y-2">
                {selectedClub.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-dark-elevated rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple/20 rounded-full flex items-center justify-center">
                        {member.role === 'owner' ? '👑' : '👤'}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-100">
                          {member.displayName || member.username}
                        </p>
                        <p className="text-xs text-zinc-500 capitalize">{member.role}</p>
                      </div>
                    </div>
                    {selectedClub.isOwner && member.role !== 'owner' && (
                      <button
                        onClick={() => handleKickMember(member.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            {activities.length > 0 && (
              <div>
                <h3 className="font-bold text-zinc-100 mb-3">Recent Activity</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activities.map((activity) => (
                    <div key={activity.id} className="text-sm text-zinc-400 py-2 border-b border-dark-border">
                      <span className="font-medium text-zinc-200">{activity.user.username}</span>{' '}
                      {activity.type === 'joined' && 'joined the club'}
                      {activity.type === 'left' && 'left the club'}
                      {activity.type === 'donated' && `donated ${formatCurrency((activity.data as any)?.amount || 0)}`}
                      {activity.type === 'created' && 'created the club'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leave Button */}
            {selectedClub.isMember && !selectedClub.isOwner && (
              <button
                onClick={handleLeaveClub}
                className="w-full py-3 bg-dark-elevated hover:bg-dark-border text-zinc-300 rounded-xl font-medium transition-colors"
              >
                Leave Club
              </button>
            )}
          </div>
        )}

        {/* Create Club */}
        {view === 'create' && (
          <div className="max-w-lg mx-auto space-y-4">
            <h2 className="text-xl font-bold text-zinc-100 mb-4">Create a New Club</h2>

            <div className="bg-amber/10 border border-amber/30 rounded-xl p-4 mb-4">
              <p className="text-amber">
                Creating a club costs <span className="font-bold">$10,000</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Club Name</label>
              <input
                type="text"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Enter club name..."
                maxLength={30}
                className="w-full px-4 py-3 bg-dark-input border border-dark-border rounded-xl text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-purple/50 focus:border-purple transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Description (optional)</label>
              <textarea
                value={clubDescription}
                onChange={(e) => setClubDescription(e.target.value)}
                placeholder="Describe your club..."
                rows={3}
                className="w-full px-4 py-3 bg-dark-input border border-dark-border rounded-xl text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-purple/50 focus:border-purple transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-5 h-5 text-purple bg-dark-input border-dark-border rounded"
              />
              <label htmlFor="isPublic" className="text-zinc-300">Public club (anyone can join)</label>
            </div>

            <button
              onClick={handleCreateClub}
              className="w-full py-3 bg-purple hover:bg-purple/80 text-white rounded-xl font-bold text-lg transition-colors"
            >
              Create Club ($10,000)
            </button>
          </div>
        )}
      </div>

      {/* Club Benefits Info */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <h3 className="font-bold text-zinc-100 mb-3">Club Benefits</h3>
        <div className="grid md:grid-cols-5 gap-4 text-center text-sm">
          {[
            { level: 1, bonus: '5%', donations: '$0' },
            { level: 2, bonus: '7%', donations: '$100K' },
            { level: 3, bonus: '10%', donations: '$500K' },
            { level: 4, bonus: '12%', donations: '$2M' },
            { level: 5, bonus: '15%', donations: '$10M' },
          ].map((tier) => (
            <div key={tier.level} className="bg-dark-elevated rounded-xl p-3 border border-dark-border">
              <p className="font-bold text-purple">Level {tier.level}</p>
              <p className="text-mint font-medium">+{tier.bonus}</p>
              <p className="text-zinc-500 text-xs">{tier.donations}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
