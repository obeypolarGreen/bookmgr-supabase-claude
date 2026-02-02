# Bookmark Manager 🔖

A full-featured, production-ready bookmark manager with authentication, tagging, folders, and sharing capabilities.

![Bookmark Manager](https://img.shields.io/badge/React-18.2-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3-38bdf8)
![Vite](https://img.shields.io/badge/Vite-4.3-646cff)

## ✨ Features

### Core Features
- ✅ **User Authentication** - Email/password authentication with local storage
- ✅ **Auto-fetch Metadata** - Automatically fetches title, description, and thumbnail from URLs
- ✅ **Smart Tagging System** - Add custom tags with auto-suggestions based on existing bookmarks
- ✅ **Full-Text Search** - Search across titles, descriptions, URLs, and tags
- ✅ **Folder Organization** - Create custom folders and drag-and-drop bookmarks
- ✅ **Public/Private Sharing** - Share bookmarks with unique links
- ✅ **Duplicate Detection** - Prevents adding duplicate URLs
- ✅ **URL Validation** - Validates and normalizes URLs before saving

### Additional Features
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- 🎨 **Beautiful UI** - Modern gradient design with smooth animations
- 🔒 **Privacy Controls** - Mark bookmarks as private/public
- ✏️ **Inline Editing** - Edit bookmark titles and descriptions directly
- 🏷️ **Tag Management** - Add/remove tags with suggestions
- 🗑️ **Easy Deletion** - Delete bookmarks and folders with confirmation
- 💾 **Local Storage** - All data persists in browser local storage

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm installed

### Installation

1. **Clone or download the files**

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

The app will open at `http://localhost:3000`

4. **Build for production**
```bash
npm run build
```

## 📦 Deployment

### Deploy to Vercel (Recommended)

#### Option 1: Deploy with Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Option 2: Deploy via GitHub
1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Vercel will auto-detect Vite and deploy

The `vercel.json` configuration is already included for optimal deployment.

### Deploy to Railway

1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect and deploy

Add these environment variables if needed:
```
NODE_VERSION=18
```

### Deploy to Netlify

1. Build the project locally:
```bash
npm run build
```

2. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

3. Deploy:
```bash
netlify deploy --prod --dir=dist
```

Or drag and drop the `dist` folder to [app.netlify.com](https://app.netlify.com)

## 🏗️ Project Structure

```
bookmark-manager/
├── index.html              # HTML entry point
├── main.jsx                # React entry point
├── bookmark-manager.jsx    # Main application component
├── index.css              # Global styles with Tailwind
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
├── vercel.json            # Vercel deployment config
└── README.md              # This file
```

## 🎯 Usage Guide

### Getting Started

1. **Sign Up/Login**
   - Create an account with email and password
   - Or login with existing credentials
   - Demo app stores data locally in browser

2. **Add Bookmarks**
   - Click "Add Bookmark" button
   - Paste a URL (e.g., https://example.com)
   - App automatically fetches title, description, and favicon
   - Bookmark is saved to current folder

3. **Organize with Folders**
   - Create custom folders (Work, Personal, etc.)
   - Drag and drop bookmarks to folders
   - Click folders to filter bookmarks

4. **Add Tags**
   - Click "Add tag" on any bookmark
   - Type custom tags or select from suggestions
   - Use tags for cross-folder categorization

5. **Search & Filter**
   - Use the search bar to find bookmarks
   - Search works across titles, URLs, descriptions, and tags
   - Use folder-specific filter for refined results

6. **Share Bookmarks**
   - Click share icon on bookmark
   - Copy the generated unique link
   - Anyone with link can view the bookmark

7. **Edit & Manage**
   - Click edit icon to modify title/description
   - Toggle privacy with lock icon
   - Delete bookmarks with trash icon

## 🔒 Security Notes

**Important:** This is a demo application using local storage. For production use, you should:

1. **Implement proper backend authentication**
   - Use JWT tokens or sessions
   - Hash passwords (bcrypt)
   - Implement OAuth (Google, GitHub)

2. **Use a real database**
   - PostgreSQL, MongoDB, or Firebase
   - Implement proper data validation
   - Add user authorization

3. **Add API for metadata fetching**
   - Backend endpoint to fetch URL metadata
   - Implement rate limiting
   - Cache results

4. **Security headers**
   - Add CORS configuration
   - Implement CSP headers
   - Use HTTPS only

## 🛠️ Technical Details

### Built With
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **Lucide React** - Icon library
- **Local Storage** - Data persistence

### Key Features Implementation

#### URL Validation
```javascript
// Validates and normalizes URLs
const isValidUrl = (urlString) => {
  try {
    const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
```

#### Duplicate Detection
```javascript
// Checks if bookmark URL already exists
if (bookmarks.some(b => b.url === normalizedUrl)) {
  setUrlError('This bookmark already exists');
  return;
}
```

#### Drag and Drop
```javascript
// Drag bookmark to folder
const handleDropOnFolder = (e, folderId) => {
  e.preventDefault();
  if (draggedBookmark && draggedBookmark.folder !== folderId) {
    handleUpdateBookmark(draggedBookmark.id, { folder: folderId });
  }
};
```

## 🔧 Customization

### Change Theme Colors
Edit `bookmark-manager.jsx` to modify the gradient colors:
```javascript
// Header gradient
className="bg-gradient-to-r from-yellow-400 to-orange-500"

// Auth screen gradient
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
```

### Add More Features
The codebase is modular and easy to extend:
- Add bookmark collections
- Implement bookmark notes
- Add browser extension
- Export/import bookmarks
- Add bookmark analytics

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🐛 Troubleshooting

### Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Styling Issues
```bash
# Rebuild Tailwind
npx tailwindcss -i ./index.css -o ./dist/output.css
```

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review the code comments

## 🎉 Acknowledgments

- Design inspired by modern bookmark managers
- Icons by Lucide
- Built with love using React and Tailwind CSS

---

**Happy Bookmarking! 🔖**
