'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Post = {
  id: string
  content: string
  is_anonymous: boolean
  created_at: string
  user_id: string
}

export default function SocialPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [content, setContent] = useState('')
  const [isAnon, setIsAnon] = useState(false)
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUserId(data.user.id)
    })
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  const submitPost = async () => {
    if (!content.trim()) return
    setLoading(true)
    await supabase.from('posts').insert({
      content,
      is_anonymous: isAnon,
      user_id: userId
    })
    setContent('')
    await fetchPosts()
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Social</h1>
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 text-sm">← Back</button>
        </div>

        <div className="bg-gray-900 p-4 rounded-2xl mb-6">
          <textarea
            className="w-full bg-gray-800 text-white p-3 rounded-lg mb-3 outline-none resize-none"
            rows={3}
            placeholder="What's on your mind?"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} />
              Post anonymously
            </label>
            <button
              onClick={submitPost}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-gray-900 p-4 rounded-2xl">
              <p className="text-xs text-gray-500 mb-2">
                {post.is_anonymous ? 'Anonymous' : `User ${post.user_id.slice(0, 8)}`} · {new Date(post.created_at).toLocaleString()}
              </p>
              <p className="text-white">{post.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
