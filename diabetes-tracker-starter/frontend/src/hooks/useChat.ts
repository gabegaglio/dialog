import { useState } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

type Msg = { role: 'user' | 'assistant'; content: string }

export function useChat() {
  const [messages, setMessages] = useState<Msg[]>([])

  async function send(text: string) {
    const userMessage: Msg = { role: 'user', content: text }
    const updatedMessages: Msg[] = [...messages, userMessage]
    setMessages(updatedMessages)
    
    try {
      const { data } = await axios.post(`${API}/chat`, { 
        message: text,
        user_id: "default_user"
      })
      
      if (data.success) {
        const assistantMessage: Msg = { role: 'assistant', content: data.response }
        setMessages([...updatedMessages, assistantMessage])
      } else {
        const errorMessage: Msg = { role: 'assistant', content: 'Sorry, something went wrong.' }
        setMessages([...updatedMessages, errorMessage])
      }
    } catch (e: any) {
      const errorMessage: Msg = { role: 'assistant', content: 'Sorry, something went wrong.' }
      setMessages([...updatedMessages, errorMessage])
    }
  }

  return { messages, send }
}
