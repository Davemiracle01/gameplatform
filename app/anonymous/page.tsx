'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type AnonPost = {
  id: string
  user_id: string
  content: string
  created_at: string
}

export default function AnonBoard() {
  const router = useRouter()
  const [posts, setPosts] = useState<AnonPost[]>([])
  const [content, setContent] = useState('')
  const [userId, setUserId] = useState('')
  const [hasPosted, setHasPosted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else {
        setUserId(data.user.id)
        checkIfPosted(data.user.id)
      }
    })
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('anon_posts')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  const checkIfPosted = async (uid: string) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('anon_posts')
      .select('id')
      .eq('user_id', uid)
      .gte('created_at', since)
    if (data && data.length > 0) setHasPosted(true)
  }

  const submitPost = async () => {
    if (!content.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.from('anon_posts').insert({
      content,
      user_id: userId
    })
    if (error) setError(error.message)
    else {
      setContent('')
      setHasPosted(true)
      await fetchPosts()
    }
    setLoading(false)
  }

  const deletePost = async (id: string) => {
    await supabase.from('anon_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold">Anonymous Board</h1>
            <p className="text-gray-500 text-xs">1 post per 24hrs • posts disappear after 24hrs</p>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 text-sm">← Back</button>
        </div>

        {!hasPosted ? (
          <div className="bg-gray-900 p-4 rounded-2xl mb-6">
            <textarea
              className="w-full bg-gray-800 text-white p-3 rounded-lg mb-3 outline-none resize-none"
              rows={3}
              placeholder="Say something anonymously..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button
              onClick={submitPost}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg font-semibold"
            >
              {loading ? 'Posting...' : 'Post Anonymously'}
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 p-4 rounded-2xl mb-6 text-center text-gray-400 text-sm">
            You already posted today. Come back in 24hrs.
          </div>
        )}

        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-gray-900 p-4 rounded-2xl">
              <div className="flex justify-between items-start">
                <p className="text-xs text-gray-500 mb-2">
                  Anonymous • {new Date(post.created_at).toLocaleString()}
                </p>
                {post.user_id === userId && (
                  <button
                    onClick={() => deletePost(post.id)}
                    className="text-red-400 text-xs hover:text-red-300"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-white">{post.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
