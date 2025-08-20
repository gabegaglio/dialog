import { useState } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

type Msg = { role: 'user' | 'assistant'; content: string }

export function useChat() {
  const [messages, setMessages] = useState<Msg[]>([])

  async function send(text: string) {
    const prev = [...messages, { role: 'user', content: text }]
    setMessages(prev)
    try {
      const { data } = await axios.post(`${API}/chat`, { message: text })
      setMessages([...prev, { role: 'assistant', content: data.answer }])
    } catch (e: any) {
      setMessages([...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    }
  }

  return { messages, send }
}
