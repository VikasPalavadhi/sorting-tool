# Card Sorting & Page Structuring Tool

A real-time collaborative web application for card sorting and page structure planning with AI-powered recommendations.

## 🔥 New Features

### Real-Time Collaboration
- 👥 **Multi-User Support** - Multiple users can work on the same board simultaneously
- 🔴 **Activity Indicators** - See who's moving which sticky in real-time
- 🔄 **Instant Sync** - All changes broadcast immediately via WebSocket
- 🔗 **Board Sharing** - Share board URLs with team members

### User Authentication
- 🔐 **Secure Login** - User authentication with session management
- 📊 **Personal Dashboards** - Each user has their own project dashboard
- 👤 **User-Specific Projects** - Only see your own saved projects
- 🔑 **Owner Permissions** - Only board creators can save projects

## Features

### Library Panel
- Create, edit, and delete stickies
- Color customization with presets
- Search and filter stickies
- Drag stickies to canvas
- Duplicate stickies

### Canvas
- Unlimited free-form workspace
- Zoom in/out (30% - 200%)
- Pan around the canvas
- Grid background for alignment
- Drag and drop stickies from library

### Sticky Management on Canvas
- Drag to reposition
- Resize from bottom-right corner
- Duplicate canvas instances
- Delete instances
- Bring forward / send backward (z-index control)
- Hover actions toolbar

### Project Management
- Auto-save to localStorage
- Multi-project dashboard
- Edit project name
- Export to PDF
- Persistent state across sessions
- Owner-only save permissions in collaborative mode

## Getting Started

### Installation

```bash
git clone https://github.com/VikasPalavadhi/sorting-tool.git
cd sorting-tool
npm install
```

### Install Server Dependencies

```bash
cd server
npm install
cd ..
```

### Environment Setup

Create `.env.local` file in the root directory:

```bash
# WebSocket Server URL
VITE_WS_URL=http://localhost:3001

# OpenAI API Key (Optional - for AI features)
VITE_OPENAI_API_KEY=your-actual-api-key-here
```

**Note:** The `.env.local` file is gitignored for security. Never commit your API key to version control.

### Development

**Run both client and server:**
```bash
npm run dev:all
```

This starts:
- Client: [http://localhost:5173](http://localhost:5173)
- WebSocket Server: http://localhost:3001

**Or run separately:**

Client only:
```bash
npm run dev
```

Server only:
```bash
npm run server:dev
```

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder, ready for deployment to Digital Ocean.

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **@dnd-kit** - Drag and drop
- **react-zoom-pan-pinch** - Canvas zoom/pan
- **Socket.IO Client** - Real-time communication
- **lucide-react** - Icons

### Backend
- **Node.js + Express** - Server framework
- **Socket.IO** - WebSocket server
- **TypeScript** - Type safety

### AI
- **OpenAI API** - GPT-4o-mini for intelligent recommendations

## Usage

### Login
Use demo credentials:
- **User 1:** `user1` / `martechuser1`
- **User 2:** `user2` / `martechuser2`

### Solo Mode
1. **Create Stickies**: Click "New Sticky" in the Library panel
2. **Add to Canvas**: Drag stickies from Library to Canvas
3. **Arrange**: Move, resize, and layer stickies as needed
4. **AI Review** (Optional): Use AI to analyze content and get reorganization suggestions
5. **Save**: Click Save to persist your project
6. **Export PDF**: Download canvas layout as PDF document

### Collaboration Mode
1. **Create a Board**: Login and create your board with stickies
2. **Share**: Click the **Share** button and copy the board URL
3. **Invite**: Send the URL to team members
4. **Collaborate**:
   - Watch real-time updates as team members move stickies
   - See activity indicators showing who's moving what
   - Blue badges appear with usernames when someone is active
5. **Save**: Only the board owner can save the project

## AI Features

The tool includes AI-powered content strategy and page structure assistance using OpenAI's GPT-4o-mini with context-aware suggestions.

### AI Review Workflow
1. Click **"AI Review"** button
2. Enter your OpenAI API key (stored in memory only)
3. **Describe your project purpose** and target audience
   Example: "I am creating a home finance page for my website that will help users compare loan options and apply online. I want to provide the best experience to the end user."
4. Click **"Review My Content & Structure"**

### What AI Analyzes
- **All library stickies** - Reviews your entire content inventory
- **Canvas layout** - Analyzes positioning and flow (if stickies are on canvas)
- **User context** - Understands your specific goals and target audience

### AI Provides
1. **Page Interpretation** - What type of page you're building
2. **What's Working Well** - Positive observations about your current content
3. **Suggested Improvements** - Prioritized (high/medium/low) layout improvements with reasoning
4. **Missing Crucial Content Blocks** - AI identifies critical missing stickies based on your context
   - Each suggestion includes priority level (critical/high/medium)
   - Clear reasoning why it's important for your use case
   - **Selectable checkboxes** - Pick which missing stickies to add
5. **3 Reorganization Versions** - Displayed side-by-side:
   - One marked as "Recommended" based on best practices
   - Different strategies (e.g., "Sales-Driven", "Educational Flow", "Comparison-First")
   - Numbered content order (top to bottom) for each version
   - Description and strategic reasoning
   - Includes both existing and suggested missing stickies in layout

### Apply Your Choices
After selecting a reorganization version and optionally checking missing stickies:
- **"Apply [Version] Only"** - Rearranges existing stickies on canvas
- **"Apply [Version] + X New Stickies"** - Creates selected missing stickies in library AND places all content on canvas according to the version layout
- Modal automatically closes after applying

### Intelligent Layout System
The tool features a **Professional Layout Validator** that ensures your board looks amazing:

**AI Recommendations + Smart Validation:**
- AI provides layout strategy (which items go together, flow, hierarchy)
- The app validates and adjusts positions to guarantee professional appearance
- Respects AI's grouping intent while ensuring perfect spacing and alignment

**Layout Rules:**
- **Single column**: Items centered at x=500 with 170px vertical spacing
- **Two items side-by-side**: x=300 and x=700 (perfectly balanced)
- **Three items side-by-side**: x=200, x=500, x=800 (evenly distributed)
- **4+ items**: Automatically distributed across canvas width
- **Automatic boundary enforcement**: All stickies guaranteed to fit within canvas
- **Zero overlaps**: Smart spacing ensures clean, professional appearance

**Smart Grouping Examples:**
- Comparison features (Interest Rate + Loan Amount)
- CTA choices (Apply Now + Calculate EMI)
- Trust indicators (Security Badge + Customer Reviews)
- Related calculators or forms

**Result**: An official-quality sorting board that clearly communicates your page structure to stakeholders.

**Note**: Your API key is never saved and only exists in memory during your session.

## Collaboration Features in Detail

### Activity Indicators
When another user moves a sticky, you'll see:
- **Blue pulsing badge** with their username above the sticky
- **Thick blue border** around the active sticky
- **Auto-clear** after 3 seconds of inactivity
- You never see your own activity indicator

### Board Ownership
- **Owner**: User who created the board
  - Can save the project
  - Can share the board URL
  - Full edit permissions
- **Collaborators**: Users who joined via shared URL
  - Can move/edit/delete stickies in real-time
  - Cannot save the project
  - See all changes instantly

### Real-Time Sync
All actions sync instantly:
- Creating, editing, deleting stickies
- Moving stickies on canvas
- Resizing stickies
- Z-index changes (bring forward/send back)

## Export Options

### Export PDF
- Captures current canvas layout as a high-quality PDF document
- Perfect for presentations, documentation, or stakeholder reviews
- Multi-page support for large canvases
- File format: `project-name-canvas.pdf`
- Disabled when canvas is empty

## Project Structure

```
card-sorting-tool/
├── src/
│   ├── components/
│   │   ├── AIModal.tsx              # AI sorting assistant modal
│   │   ├── Canvas.tsx               # Main canvas with zoom/pan
│   │   ├── CanvasSticky.tsx         # Sticky on canvas with activity indicators
│   │   ├── CollaborationStatus.tsx  # Shows connected users
│   │   ├── Dashboard.tsx            # User project dashboard
│   │   ├── Library.tsx              # Left sidebar with sticky list
│   │   ├── LoginScreen.tsx          # Authentication screen
│   │   ├── LoadingScreen.tsx        # Loading state
│   │   ├── SaveProjectModal.tsx     # Save/Save As dialog
│   │   ├── StickyModal.tsx          # Create/edit sticky modal
│   │   └── Toolbar.tsx              # Top toolbar with controls
│   ├── hooks/
│   │   └── useCollaboration.ts      # WebSocket collaboration hook
│   ├── services/
│   │   ├── aiService.ts             # OpenAI integration
│   │   ├── authService.ts           # Authentication logic
│   │   └── websocketService.ts      # Socket.IO client wrapper
│   ├── store/
│   │   ├── projectStorage.ts        # localStorage project persistence
│   │   └── useStore.ts              # Zustand store with collaboration
│   ├── types/
│   │   ├── auth.ts                  # Auth type definitions
│   │   └── index.ts                 # Core type definitions
│   ├── utils/
│   │   └── layoutValidator.ts       # Professional grid layout system
│   └── App.tsx                      # Main app with auth guard
├── server/
│   └── src/
│       ├── index.ts                 # Express + Socket.IO server
│       └── types.ts                 # Server type definitions
└── public/                          # Static assets
```

## Data Model

### Sticky (Library)
```typescript
{
  id: string;
  text: string;
  color: string;
  createdAt: number;
}
```

### Canvas Instance
```typescript
{
  id: string;
  stickyId: string;  // Reference to library sticky
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  overriddenText?: string;  // Optional local text override
}
```

## License

Proprietary
