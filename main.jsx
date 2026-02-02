import React from 'react'
import ReactDOM from 'react-dom/client'
//import BookmarkManager from './bookmark-manager.jsx'
import BookmarkManager from './bookmark-manager-supabase.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BookmarkManager />
  </React.StrictMode>,
)
