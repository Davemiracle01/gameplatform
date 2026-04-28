'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = { id: string; username: string }
type Request = { id: string; sender_id: string; receiver_id: string; status: string; profiles: Profile }

export default function FriendsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [friends, setFriends] = useState<Profile[]>([])
  const [incoming, setIncoming] = useState<Request[]>([])
  const [tab, setTab] = useState<'friends' | 'search' | 'requests'>('friends')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else {
        setUserId(data.user.id)
        loadFriends(data.user.id)
        loadIncoming(data.user.id)
      }
    })
  }, [])

  const loadFriends = async (uid: string) => {
    const { data } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)

    if (!data) return
    const ids = data.map(r => r.sender_id === uid ? r.receiver_id : r.sender_id)
    if (ids.length === 0) return
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ids)
    if (profiles) setFriends(profiles)
  }

  const loadIncoming = async (uid: string) => {
    const { data } = await supabase
      .from('friend_requests')
      .select('*, profiles!sender_id(id, username)')
      .eq('receiver_id', uid)
      .eq('status', 'pending')
    if (data) setIncoming(data as any)
  }

  const searchUsers = async () => {
    if (!search.trim()) return
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${search}%`)
      .neq('id', userId)
      .limit(10)
    if (data) setSearchResults(data)
  }

  const sendRequest = async (receiverId: string) => {
    await supabase.from('friend_requests').insert({ sender_id: userId, receiver_id: receiverId })
    alert('Friend request sent!')
  }

  const respondRequest = async (id: string, status: 'accepted' | 'rejected') => {
    await supabase.from('friend_requests').update({ status }).eq('id', id)
    setIncoming(prev => prev.filter(r => r.id !== id))
    if (status === 'accepted') loadFriends(userId)
  }

  const blockUser = async (blockedId: string) => {
    await supabase.from('blocks').insert({ blocker_id: userId, blocked_id: blockedId })
    setFriends(prev => prev.filter(f => f.id !== blockedId))
    alert('User blocked.')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Friends</h1>
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 text-sm">← Back</button>
        </div>

        <div className="flex gap-2 mb-6">
          {(['friends', 'search', 'requests'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${tab === t ? 'bg-indigo-600' : 'bg-gray-800'}`}
            >
              {t} {t === 'requests' && incoming.length > 0 && `(${incoming.length})`}
            </button>
          ))}
        </div>

        {tab === 'friends' && (
          <div className="space-y-3">
            {friends.length === 0 && <p className="text-gray-400 text-sm">No friends yet. Search for users to add.</p>}
            {friends.map(f => (
              <div key={f.id} className="bg-gray-900 p-4 rounded-2xl flex justify-between items-center">
                <span className="font-semibold">@{f.username}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dm/${f.id}`)}
                    className="bg-indigo-600 px-3 py-1 rounded-lg text-xs"
                  >DM</button>
                  <button
                    onClick={() => blockUser(f.id)}
                    className="bg-red-900 px-3 py-1 rounded-lg text-xs"
                  >Block</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'search' && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-xl outline-none text-sm"
                placeholder="Search username..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUsers()}
              />
              <button onClick={searchUsers} className="bg-indigo-600 px-4 py-2 rounded-xl text-sm">Search</button>
            </div>
            <div className="space-y-3">
              {searchResults.map(u => (
                <div key={u.id} className="bg-gray-900 p-4 rounded-2xl flex justify-between items-center">
                  <span className="font-semibold">@{u.username}</span>
                  <button onClick={() => sendRequest(u.id)} className="bg-indigo-600 px-3 py-1 rounded-lg text-xs">Add</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-3">
            {incoming.length === 0 && <p className="text-gray-400 text-sm">No pending requests.</p>}
            {incoming.map(r => (
              <div key={r.id} className="bg-gray-900 p-4 rounded-2xl flex justify-between items-center">
                <span className="font-semibold">@{(r.profiles as any)?.username}</span>
                <div className="flex gap-2">
                  <button onClick={() => respondRequest(r.id, 'accepted')} className="bg-green-700 px-3 py-1 rounded-lg text-xs">Accept</button>
                  <button onClick={() => respondRequest(r.id, 'rejected')} className="bg-red-900 px-3 py-1 rounded-lg text-xs">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
