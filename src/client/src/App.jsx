import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import './App.css'

function App() {
  const [socket, setSocket] = useState(null)
  
  useEffect(() => {
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)
    
    return () => newSocket.close()
  }, [])
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>德州扑克</h1>
      </header>
    </div>
  )
}

export default App