import { useEffect, useState } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export function useDexcomConnect() {
  const [connectUrl, setConnectUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`${API}/dexcom/connect`)
        setConnectUrl(data.url)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return { connectUrl, loading }
}
