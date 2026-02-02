# Database Integration Guide

## Current Setup (Local Storage)

The current app uses browser Local Storage:
```javascript
// Storage location: Browser's localStorage
localStorage.setItem('bookmarks_data', JSON.stringify(bookmarks));
```

**Pros:**
- No backend needed
- Instant deployment
- Free forever
- Simple code

**Cons:**
- Data only on one device/browser
- No cross-device sync
- Limited to ~5MB
- Can be cleared by browser

---

## Option 1: Supabase (Recommended - Easiest)

**Why Supabase?**
- PostgreSQL database
- Built-in authentication
- Real-time subscriptions
- Generous free tier
- Simple setup

### Setup Steps

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create account and new project
   - Save your project URL and anon key

2. **Install Supabase Client**
```bash
npm install @supabase/supabase-js
```

3. **Create Database Tables**

Run this SQL in Supabase SQL Editor:

```sql
-- Users table (handled by Supabase Auth automatically)

-- Folders table
CREATE TABLE folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookmarks table
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  folder_id UUID REFERENCES folders,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  tags TEXT[],
  is_private BOOLEAN DEFAULT FALSE,
  share_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, url)  -- Prevent duplicates per user
);

-- Enable Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own data
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bookmarks" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id OR share_id IS NOT NULL);

CREATE POLICY "Users can insert own bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks" ON bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_folder_id ON bookmarks(folder_id);
CREATE INDEX idx_bookmarks_share_id ON bookmarks(share_id);
CREATE INDEX idx_folders_user_id ON folders(user_id);
```

4. **Create Supabase Config**

Create `.env.local`:
```env
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. **Create Supabase Client**

Create `supabaseClient.js`:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

6. **Update Code to Use Supabase**

Replace localStorage calls with Supabase:

```javascript
import { supabase } from './supabaseClient';

// Authentication
const handleSignUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

const handleLogin = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Load bookmarks
const loadBookmarks = async (userId) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// Add bookmark
const addBookmark = async (bookmark) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .insert([bookmark])
    .select();
  
  if (error) throw error;
  return data[0];
};

// Update bookmark
const updateBookmark = async (id, updates) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .update(updates)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
};

// Delete bookmark
const deleteBookmark = async (id) => {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Load folders
const loadFolders = async (userId) => {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data;
};

// Add folder
const addFolder = async (folder) => {
  const { data, error } = await supabase
    .from('folders')
    .insert([folder])
    .select();
  
  if (error) throw error;
  return data[0];
};

// Real-time subscriptions (optional - live updates)
const subscribeToBookmarks = (userId, callback) => {
  return supabase
    .channel('bookmarks')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookmarks',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};
```

---

## Option 2: Firebase (Google's Platform)

**Why Firebase?**
- Easy Google/Facebook OAuth
- Real-time database
- File storage for images
- Free tier

### Setup Steps

1. **Install Firebase**
```bash
npm install firebase
```

2. **Initialize Firebase**

Create `firebaseConfig.js`:
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

3. **Use Firestore**

```javascript
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Add bookmark
const addBookmark = async (bookmark) => {
  const docRef = await addDoc(collection(db, 'bookmarks'), bookmark);
  return { id: docRef.id, ...bookmark };
};

// Get bookmarks
const getBookmarks = async (userId) => {
  const q = query(collection(db, 'bookmarks'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Update bookmark
const updateBookmark = async (id, updates) => {
  const docRef = doc(db, 'bookmarks', id);
  await updateDoc(docRef, updates);
};

// Delete bookmark
const deleteBookmark = async (id) => {
  await deleteDoc(doc(db, 'bookmarks', id));
};
```

---

## Option 3: Custom Backend (Node.js + PostgreSQL)

**Why Custom Backend?**
- Full control
- Custom business logic
- Can add advanced features

### Tech Stack
- Node.js + Express
- PostgreSQL database
- JWT authentication
- Deployed on Railway/Render

### Basic Structure

**Backend (Node.js + Express):**
```javascript
// server.js
import express from 'express';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await pool.query(
    'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
    [email, hashedPassword]
  );
  
  const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET);
  res.json({ token });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  res.json({ token });
});

// Get bookmarks
app.get('/api/bookmarks', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { userId } = jwt.verify(token, process.env.JWT_SECRET);
  
  const result = await pool.query(
    'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  
  res.json(result.rows);
});

// Add bookmark
app.post('/api/bookmarks', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { userId } = jwt.verify(token, process.env.JWT_SECRET);
  
  const { url, title, description, thumbnail, tags, folder_id } = req.body;
  
  const result = await pool.query(
    'INSERT INTO bookmarks (user_id, url, title, description, thumbnail, tags, folder_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [userId, url, title, description, thumbnail, tags, folder_id]
  );
  
  res.json(result.rows[0]);
});

app.listen(3001, () => console.log('Server running on port 3001'));
```

---

## Comparison Table

| Feature | Local Storage | Supabase | Firebase | Custom Backend |
|---------|---------------|----------|----------|----------------|
| Setup Time | 0 min | 15 min | 20 min | 2-4 hours |
| Cost (Free Tier) | Free | 500MB DB | 1GB DB | Varies |
| Cross-device Sync | ❌ | ✅ | ✅ | ✅ |
| Authentication | Manual | Built-in | Built-in | Build yourself |
| Real-time Updates | ❌ | ✅ | ✅ | Build yourself |
| Complexity | Very Low | Low | Low | High |
| Best For | Demos/MVP | Production | Production | Enterprise |

---

## Recommendation

**For this project, I recommend Supabase because:**
1. ✅ 15-minute setup
2. ✅ Free tier is generous (500MB database, 50,000 monthly active users)
3. ✅ Built-in authentication (email, Google, GitHub OAuth)
4. ✅ Real-time subscriptions
5. ✅ PostgreSQL (powerful SQL queries)
6. ✅ Automatic API generation
7. ✅ Row Level Security (automatic data privacy)

Would you like me to create the complete Supabase-integrated version of the app?
