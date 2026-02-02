import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, Share2, LogOut, X, Check, Tag, Link as LinkIcon, Lock, Unlock, GripVertical, Folder } from 'lucide-react';
import { supabase, authService, bookmarksService, foldersService, isValidUrl, normalizeUrl, fetchUrlMetadata, generateShareId } from './supabaseService';

// ============================================================================
// TAG SUGGESTIONS
// ============================================================================

const getTagSuggestions = (bookmarks, currentTags = []) => {
  const allTags = new Set();
  bookmarks.forEach(bookmark => {
    bookmark.tags?.forEach(tag => allTags.add(tag));
  });
  return Array.from(allTags).filter(tag => !currentTags.includes(tag));
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function BookmarkManager() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [bookmarks, setBookmarks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [draggedBookmark, setDraggedBookmark] = useState(null);
  const [shareModal, setShareModal] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  
  // Auth form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // ============================================================================
  // INITIALIZATION - Check for existing session
  // ============================================================================

  useEffect(() => {
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadUserData(session.user.id);
      } else {
        setCurrentUser(null);
        setBookmarks([]);
        setFolders([]);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        await loadUserData(user.id);
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // LOAD USER DATA FROM SUPABASE
  // ============================================================================

  const loadUserData = async (userId) => {
    try {
      setLoading(true);
      
      // Load folders
      const foldersData = await foldersService.getAll(userId);
      if (foldersData.length === 0) {
        // Create default folder if none exists
        const defaultFolder = await foldersService.create({
          user_id: userId,
          name: 'All Bookmarks',
          is_default: true
        });
        setFolders([defaultFolder]);
      } else {
        setFolders(foldersData);
      }
      
      // Load bookmarks
      const bookmarksData = await bookmarksService.getAll(userId);
      setBookmarks(bookmarksData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading your data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // AUTH HANDLERS
  // ============================================================================

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    
    if (!authEmail || !authPassword) {
      setAuthError('Please fill in all fields');
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === 'login') {
        const { user } = await authService.signIn(authEmail, authPassword);
        setCurrentUser(user);
        await loadUserData(user.id);
      } else {
        const { user } = await authService.signUp(authEmail, authPassword);
        setCurrentUser(user);
        // Create default folder for new user
        const defaultFolder = await foldersService.create({
          user_id: user.id,
          name: 'All Bookmarks',
          is_default: true
        });
        setFolders([defaultFolder]);
        alert('Account created! Please check your email to verify your account.');
      }
      
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setCurrentUser(null);
      setBookmarks([]);
      setFolders([]);
      setSelectedFolder('all');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ============================================================================
  // BOOKMARK HANDLERS
  // ============================================================================

  const handleAddBookmark = async (e) => {
    e.preventDefault();
    setUrlError('');
    
    if (!urlInput.trim()) {
      setUrlError('Please enter a URL');
      return;
    }

    if (!isValidUrl(urlInput)) {
      setUrlError('Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    const normalizedUrl = normalizeUrl(urlInput);
    
    // Check for duplicates
    try {
      const isDuplicate = await bookmarksService.checkDuplicate(currentUser.id, normalizedUrl);
      if (isDuplicate) {
        setUrlError('This bookmark already exists');
        return;
      }
    } catch (error) {
      console.error('Duplicate check error:', error);
    }

    setIsLoadingMetadata(true);
    
    try {
      const metadata = await fetchUrlMetadata(normalizedUrl);
      
      const newBookmark = await bookmarksService.create({
        user_id: currentUser.id,
        url: normalizedUrl,
        title: metadata.title,
        description: metadata.description,
        thumbnail: metadata.thumbnail,
        tags: [],
        folder_id: selectedFolder === 'all' ? null : selectedFolder,
        is_private: false
      });

      setBookmarks([newBookmark, ...bookmarks]);
      setUrlInput('');
      setShowAddModal(false);
    } catch (error) {
      console.error('Add bookmark error:', error);
      if (error.message?.includes('duplicate')) {
        setUrlError('This bookmark already exists');
      } else {
        setUrlError('Failed to add bookmark. Please try again.');
      }
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleDeleteBookmark = async (bookmarkId) => {
    if (!confirm('Are you sure you want to delete this bookmark?')) return;
    
    try {
      await bookmarksService.delete(bookmarkId);
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete bookmark');
    }
  };

  const handleUpdateBookmark = async (bookmarkId, updates) => {
    try {
      const updatedBookmark = await bookmarksService.update(bookmarkId, updates);
      setBookmarks(bookmarks.map(b => b.id === bookmarkId ? updatedBookmark : b));
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update bookmark');
    }
  };

  const handleTogglePrivacy = async (bookmarkId) => {
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    await handleUpdateBookmark(bookmarkId, { is_private: !bookmark.is_private });
  };

  const handleShareBookmark = async (bookmark) => {
    if (!bookmark.share_id) {
      const shareId = generateShareId();
      await handleUpdateBookmark(bookmark.id, { share_id: shareId });
      setShareModal({ ...bookmark, share_id: shareId });
    } else {
      setShareModal(bookmark);
    }
  };

  // ============================================================================
  // FOLDER HANDLERS
  // ============================================================================

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;
    
    try {
      const newFolder = await foldersService.create({
        user_id: currentUser.id,
        name: folderNameInput,
        is_default: false
      });
      
      setFolders([...folders, newFolder]);
      setFolderNameInput('');
      setShowFolderModal(false);
    } catch (error) {
      console.error('Add folder error:', error);
      alert('Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder?.is_default) return;
    
    if (!confirm('Delete this folder? Bookmarks will be moved to "unsorted".')) return;
    
    try {
      // Move bookmarks in this folder to null (unsorted)
      const bookmarksInFolder = bookmarks.filter(b => b.folder_id === folderId);
      for (const bookmark of bookmarksInFolder) {
        await bookmarksService.update(bookmark.id, { folder_id: null });
      }
      
      await foldersService.delete(folderId);
      
      setFolders(folders.filter(f => f.id !== folderId));
      setBookmarks(bookmarks.map(b => b.folder_id === folderId ? { ...b, folder_id: null } : b));
      
      if (selectedFolder === folderId) {
        setSelectedFolder('all');
      }
    } catch (error) {
      console.error('Delete folder error:', error);
      alert('Failed to delete folder');
    }
  };

  // ============================================================================
  // DRAG & DROP
  // ============================================================================

  const handleDragStart = (e, bookmark) => {
    setDraggedBookmark(bookmark);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnFolder = async (e, folderId) => {
    e.preventDefault();
    if (draggedBookmark && draggedBookmark.folder_id !== folderId) {
      await handleUpdateBookmark(draggedBookmark.id, { folder_id: folderId });
    }
    setDraggedBookmark(null);
  };

  // ============================================================================
  // FILTERING & SEARCH
  // ============================================================================

  const filteredBookmarks = useMemo(() => {
    let filtered = bookmarks;
    
    // Check if selected folder is the default "All Bookmarks" folder
    const selectedFolderObj = folders.find(f => f.id === selectedFolder);
    const isAllBookmarksFolder = selectedFolderObj?.is_default || selectedFolder === 'all';
    
    // Filter by folder (skip if "All Bookmarks" is selected)
    if (!isAllBookmarksFolder) {
      filtered = filtered.filter(b => b.folder_id === selectedFolder);
    }
    
    // Filter by search query
    if (filterQuery.trim()) {
      const query = filterQuery.toLowerCase();
      filtered = filtered.filter(b => 
        b.title.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query) ||
        b.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [bookmarks, selectedFolder, filterQuery, folders]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: AUTH SCREEN
  // ============================================================================

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mb-4 shadow-lg">
                  <LinkIcon className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Bookmark Manager</h1>
                <p className="text-gray-600">Organize your digital life</p>
              </div>

              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    authMode === 'login'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    authMode === 'signup'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    disabled={authLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    disabled={authLoading}
                  />
                </div>

                {authError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {authLoading ? 'Processing...' : authMode === 'login' ? 'Login' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Powered by Supabase - Data synced across devices
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: MAIN APP
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Bookmark Manager</h1>
              </div>
              
              <div className="relative w-96 hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Search bookmarks..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Paste URL..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && setShowAddModal(true)}
                  className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:from-yellow-500 hover:to-orange-600 transition-all flex items-center gap-2 shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add Bookmark
              </button>

              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase">Folders</h2>
                <button
                  onClick={() => setShowFolderModal(true)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="New Folder"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="space-y-1">
                {folders.map(folder => (
                  <div
                    key={folder.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnFolder(e, folder.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      selectedFolder === folder.id
                        ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-900'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedFolder === folder.id
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                          : 'bg-gray-200'
                      }`}>
                        <span className="text-lg">📁</span>
                      </div>
                      <span className="font-medium truncate text-sm">{folder.name}</span>
                    </div>
                    {!folder.is_default && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                      >
                        <X className="w-3 h-3 text-red-600" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-900 font-medium mb-2">✅ Database Connected</p>
              <p className="text-xs text-green-700">
                Your bookmarks sync across all devices using Supabase.
              </p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {folders.find(f => f.id === selectedFolder)?.name || 'All Bookmarks'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder="Filter..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4">
                {filteredBookmarks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LinkIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No bookmarks yet</h3>
                    <p className="text-gray-500 mb-4">Start by adding your first bookmark</p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                    >
                      Add Bookmark
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBookmarks.map(bookmark => (
                      <BookmarkCard
                        key={bookmark.id}
                        bookmark={bookmark}
                        folder={folders.find(f => f.id === bookmark.folder_id)}
                        onDelete={handleDeleteBookmark}
                        onUpdate={handleUpdateBookmark}
                        onTogglePrivacy={handleTogglePrivacy}
                        onShare={handleShareBookmark}
                        onDragStart={handleDragStart}
                        allTags={getTagSuggestions(bookmarks, bookmark.tags)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Add Bookmark Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} title="Add Bookmark">
          <form onSubmit={handleAddBookmark} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">URL *</label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlError('');
                }}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
              {urlError && (
                <p className="text-red-600 text-sm mt-1">{urlError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoadingMetadata}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
              >
                {isLoadingMetadata ? 'Adding...' : 'Add Bookmark'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Folder Modal */}
      {showFolderModal && (
        <Modal onClose={() => setShowFolderModal(false)} title="New Folder">
          <form onSubmit={handleAddFolder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Folder Name</label>
              <input
                type="text"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="Work, Personal, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
              >
                Create Folder
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Share Modal */}
      {shareModal && (
        <Modal onClose={() => setShareModal(null)} title="Share Bookmark">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/shared/${shareModal.share_id}`}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/shared/${shareModal.share_id}`);
                    alert('Link copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                Anyone with this link can view this bookmark
              </p>
            </div>

            <button
              onClick={() => setShareModal(null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// BOOKMARK CARD COMPONENT
// ============================================================================

function BookmarkCard({ bookmark, folder, onDelete, onUpdate, onTogglePrivacy, onShare, onDragStart, allTags }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(bookmark.title);
  const [editDescription, setEditDescription] = useState(bookmark.description || '');
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);

  const handleSaveEdit = () => {
    onUpdate(bookmark.id, { 
      title: editTitle,
      description: editDescription 
    });
    setIsEditing(false);
  };

  const handleAddTag = (tag) => {
    if (tag && !bookmark.tags?.includes(tag)) {
      onUpdate(bookmark.id, { tags: [...(bookmark.tags || []), tag] });
    }
    setTagInput('');
    setShowTagInput(false);
    setTagSuggestions([]);
  };

  const handleRemoveTag = (tag) => {
    onUpdate(bookmark.id, { tags: bookmark.tags.filter(t => t !== tag) });
  };

  const handleTagInputChange = (value) => {
    setTagInput(value);
    if (value) {
      setTagSuggestions(allTags.filter(tag => 
        tag.toLowerCase().includes(value.toLowerCase())
      ));
    } else {
      setTagSuggestions([]);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, bookmark)}
      className="group border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all bg-white cursor-move"
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <GripVertical className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
        </div>

        {bookmark.thumbnail && (
          <img
            src={bookmark.thumbnail}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100"
          />
        )}

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2 mb-1">
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gray-900 hover:text-purple-600 transition-colors flex-1"
                >
                  {bookmark.title}
                </a>
                <div className="flex items-center gap-1">
                  {bookmark.is_private && (
                    <Lock className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
              {bookmark.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{bookmark.description}</p>
              )}
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-700 truncate block"
              >
                {bookmark.url}
              </a>

              {folder && !folder.is_default && (
                <div className="flex items-center gap-1 mt-2 w-fit">
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Folder className="w-3 h-3 text-yellow-700" />
                    <span className="text-xs font-medium text-yellow-800">{folder.name}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {bookmark.tags?.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-purple-200 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                
                {showTagInput ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => handleTagInputChange(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag(tagInput)}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowTagInput(false);
                          setTagInput('');
                          setTagSuggestions([]);
                        }, 200);
                      }}
                      placeholder="Add tag..."
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs w-32 focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                    {tagSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-48">
                        {tagSuggestions.map(tag => (
                          <button
                            key={tag}
                            onMouseDown={() => handleAddTag(tag)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-gray-400 hover:text-gray-600"
                  >
                    <Tag className="w-3 h-3" />
                    Add tag
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => onTogglePrivacy(bookmark.id)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={bookmark.is_private ? 'Make Public' : 'Make Private'}
          >
            {bookmark.is_private ? (
              <Lock className="w-4 h-4 text-gray-600" />
            ) : (
              <Unlock className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={() => onShare(bookmark)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => onDelete(bookmark.id)}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL COMPONENT
// ============================================================================

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}