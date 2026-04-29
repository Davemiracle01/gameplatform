'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Profile = {
  id: string
  username: string
  status: string
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { userId } = useParams() as { userId: string }
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [status, setStatus] = useState('')
  const [editingStatus, setEditingStatus] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [alreadyFriends, setAlreadyFriends] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else {
        setCurrentUserId(data.user.id)
        setIsOwnProfile(data.user.id === userId)
        loadProfile()
        checkFriendStatus(data.user.id)
      }
    })
  }, [userId])

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setProfile(data)
      setStatus(data.status || '')
    }
  }

  const checkFriendStatus = async (uid: string) => {
    const { data } = await supabase
      .from('friend_requests')
      .select('status')
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${uid})`)
      .single()
    if (data?.status === 'accepted') setAlreadyFriends(true)
    if (data?.status === 'pending') setRequestSent(true)
  }

  const sendRequest = async () => {
    await supabase.from('friend_requests').insert({
      sender_id: currentUserId,
      receiver_id: userId
    })
    setRequestSent(true)
  }

  const saveStatus = async () => {
    await supabase.from('profiles').update({ status }).eq('id', currentUserId)
    setEditingStatus(false)
  }

  if (!profile) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-md mx-auto">
        <button onClick={() => router.back()} className="text-gray-400 text-sm mb-6">← Back</button>

        <div className="bg-gray-900 rounded-2xl p-6 text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
            {profile.username[0].toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold mb-1">@{profile.username}</h1>
          <p className="text-gray-500 text-xs mb-4">
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>

          {editingStatus ? (
            <div className="mt-2">
              <input
                className="w-full bg-gray-800 text-white p-2 rounded-lg outline-none text-sm text-center mb-2"
                placeholder="What's on your mind?"
                value={status}
                onChange={e => setStatus(e.target.value)}
                maxLength={100}
              />
              <button onClick={saveStatus} className="bg-indigo-600 px-4 py-1 rounded-lg text-sm">Save</button>
            </div>
          ) : (
            <p
              className="text-gray-400 text-sm italic cursor-pointer"
              onClick={() => isOwnProfile && setEditingStatus(true)}
            >
              {status || (isOwnProfile ? 'Tap to add a status...' : 'No status yet')}
            </p>
          )}
        </div>

        {!isOwnProfile && (
          <button
            onClick={sendRequest}
            disabled={requestSent || alreadyFriends}
            className={`w-full p-3 rounded-2xl font-semibold text-sm ${
              alreadyFriends ? 'bg-green-800 text-green-300' :
              requestSent ? 'bg-gray-700 text-gray-400' :
              'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {alreadyFriends ? '✓ Friends' : requestSent ? 'Request Sent' : 'Add Friend'}
          </button>
        )}
      </div>
    </div>
  )
      }
