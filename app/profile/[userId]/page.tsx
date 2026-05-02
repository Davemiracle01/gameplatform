'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Profile = {
  id: string
  username: string
  status: string
  status_expires_at: string
  avatar_url: string
  created_at: string
  role?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { userId } = useParams() as { userId: string }
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [status, setStatus] = useState('')
  const [editingStatus, setEditingStatus] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setCurrentUserId(data.user.id)
      setIsOwnProfile(data.user.id === userId)
      loadProfile()
      checkBlocked(data.user.id)
    })
  }, [userId])

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setProfile(data)
      // Check if status expired
      if (data.status_expires_at && new Date(data.status_expires_at) < new Date()) {
        setStatus('')
      } else {
        setStatus(data.status || '')
      }
      setAvatarUrl(data.avatar_url || '')
    }
  }

  const checkBlocked = async (uid: string) => {
    const { data } = await supabase.from('blocks').select('id')
      .eq('blocker_id', uid).eq('blocked_id', userId).single()
    if (data) setIsBlocked(true)
  }

  const saveStatus = async () => {
    const expires = new Date()
    expires.setHours(expires.getHours() + 24)
    await supabase.from('profiles').update({
      status,
      status_expires_at: expires.toISOString()
    }).eq('id', currentUserId)
    setEditingStatus(false)
  }

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${currentUserId}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', currentUserId)
      setAvatarUrl(url)
    }
    setUploading(false)
  }

  const blockUser = async () => {
    await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: userId })
    setIsBlocked(true)
  }

  const unblockUser = async () => {
    await supabase.from('blocks').delete().eq('blocker_id', currentUserId).eq('blocked_id', userId)
    setIsBlocked(false)
  }

  const statusTimeLeft = () => {
    if (!profile?.status_expires_at) return null
    const diff = new Date(profile.status_expires_at).getTime() - Date.now()
    if (diff <= 0) return null
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return hours > 0 ? `${hours}h left` : `${mins}m left`
  }

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6b7280', fontSize: 14 }}>Loading...</div>
    </div>
  )

  const isAdmin = profile.role === 'admin'
  const timeLeft = statusTimeLeft()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f, #0d0d1a)', color: 'white', padding: 16 }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>← Back</button>

        {/* Avatar + info card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24, padding: 24, textAlign: 'center', marginBottom: 12
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            {avatarUrl ? (
              <img
                src={avatarUrl} alt="avatar"
                style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${isAdmin ? '#7c3aed' : '#6366f1'}` }}
              />
            ) : (
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                background: isAdmin ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontWeight: 700, color: 'white',
                border: `3px solid ${isAdmin ? '#7c3aed' : '#6366f1'}`,
              }}>
                {profile.username[0].toUpperCase()}
              </div>
            )}
            {isOwnProfile && (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#6366f1', border: '2px solid #0a0a0f',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 14,
                }}
              >
                {uploading ? '⏳' : '📷'}
              </div>
            )}
            {isAdmin && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0,
                width: 24, height: 24, borderRadius: '50%',
                background: '#7c3aed', border: '2px solid #0a0a0f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: 'white'
              }}>✓</div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar}/>
          </div>

          {/* Username + badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>@{profile.username}</h1>
            {isAdmin && (
              <span style={{
                background: 'rgba(124,58,237,0.2)', border: '1px solid #7c3aed', color: '#a855f7',
                fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 600
              }}>ADMIN</span>
            )}
          </div>

          <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 16 }}>
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>

          {/* Status */}
          {editingStatus ? (
            <div>
              <input
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white', padding: '10px 14px', borderRadius: 12, outline: 'none',
                  fontSize: 13, textAlign: 'center', marginBottom: 8, boxSizing: 'border-box'
                }}
                placeholder="What's on your mind? (24hrs)"
                value={status}
                onChange={e => setStatus(e.target.value)}
                maxLength={100}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  onClick={saveStatus}
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: 'white', padding: '8px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >Save</button>
                <button
                  onClick={() => setEditingStatus(false)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9ca3af', padding: '8px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}
                >Cancel</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => isOwnProfile && setEditingStatus(true)}
              style={{ cursor: isOwnProfile ? 'pointer' : 'default' }}
            >
              {status ? (
                <div style={{
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 12, padding: '10px 16px',
                }}>
                  <p style={{ color: '#e5e7eb', fontSize: 13, fontStyle: 'italic', marginBottom: 4 }}>"{status}"</p>
                  {timeLeft && <p style={{ color: '#6b7280', fontSize: 10 }}>⏱ {timeLeft}</p>}
                </div>
              ) : (
                <p style={{ color: isOwnProfile ? '#4b5563' : '#374151', fontSize: 12, fontStyle: 'italic' }}>
                  {isOwnProfile ? 'Tap to add a 24hr status...' : 'No status'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isOwnProfile && (
          <div style={{ display: 'flex', gap: 10 }}>
            {!isBlocked ? (
              <>
                <button
                  onClick={() => router.push(`/dm/${userId}`)}
                  style={{
                    flex: 1, padding: '14px 0', borderRadius: 18,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                  }}
                >Message</button>
                <button
                  onClick={blockUser}
                  style={{
                    padding: '14px 18px', borderRadius: 18,
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >Block</button>
              </>
            ) : (
              <button
                onClick={unblockUser}
                style={{
                  flex: 1, padding: '14px 0', borderRadius: 18,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#9ca3af', fontSize: 14, cursor: 'pointer',
                }}
              >Unblock</button>
            )}
          </div>
        )}

        {isOwnProfile && (
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 18,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#9ca3af', fontSize: 14, cursor: 'pointer',
            }}
          >Back to Dashboard</button>
        )}
      </div>
    </div>
  )
}
