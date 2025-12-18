import { useEffect, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { Library } from './components/Library';
import { Canvas } from './components/Canvas';
import { LoginScreen } from './components/LoginScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { useStore } from './store/useStore';
import { useCollaboration } from './hooks/useCollaboration';

// Generate board ID helper
const generateBoardId = () => `board-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

function App() {
  const { isAuthenticated, session, setBoardId, project } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

  // Initialize collaboration
  useCollaboration(currentBoardId);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsInitializing(false);
      return;
    }

    // Extract boardId from URL
    const params = new URLSearchParams(window.location.search);
    const urlBoardId = params.get('boardId');

    if (urlBoardId) {
      // Joining an existing board
      console.log('Joining existing board:', urlBoardId);
      setCurrentBoardId(urlBoardId);
      // Owner info will be set when board:sync event is received
    } else {
      // Creating a new board
      const newBoardId = project.boardId || generateBoardId();
      console.log('Creating new board:', newBoardId);

      if (!project.boardId && session) {
        // Set this user as owner for new board
        setBoardId(newBoardId, session.userId, session.username);
      }

      setCurrentBoardId(newBoardId);

      // Update URL without reload
      const newUrl = `${window.location.pathname}?boardId=${newBoardId}`;
      window.history.replaceState({}, '', newUrl);
    }

    setIsInitializing(false);
  }, [isAuthenticated, session?.userId]);

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          window.location.reload();
        }}
      />
    );
  }

  // Show loading screen while initializing
  if (isInitializing) {
    return <LoadingScreen />;
  }

  // Main app
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <Library />
        <Canvas />
      </div>
    </div>
  );
}

export default App;
