import { useEffect, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { Library } from './components/Library';
import { Canvas } from './components/Canvas';
import { LoginScreen } from './components/LoginScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { Dashboard } from './components/Dashboard';
import { useStore } from './store/useStore';
import { useCollaboration } from './hooks/useCollaboration';
import { apiGetAllBoards } from './services/apiService';

// Generate board ID helper
const generateBoardId = () => `board-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

function App() {
  const { isAuthenticated, session, setBoardId, project } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  // Initialize collaboration
  useCollaboration(currentBoardId);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsInitializing(false);
      return;
    }

    const initializeApp = async () => {
      // Extract boardId from URL
      const params = new URLSearchParams(window.location.search);
      const urlBoardId = params.get('boardId');

      if (urlBoardId) {
        // Joining an existing board via shared link
        console.log('Joining existing board:', urlBoardId);
        setCurrentBoardId(urlBoardId);
        // Owner info will be set when board:sync event is received
        setIsInitializing(false);
      } else {
        // No boardId in URL - check if user has existing boards
        try {
          const boards = await apiGetAllBoards();

          if (boards && boards.length > 0) {
            // User has existing boards - show dashboard
            console.log('User has existing boards, showing dashboard');
            setShowDashboard(true);
            setIsInitializing(false);
          } else {
            // No existing boards - create a new one
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
            setIsInitializing(false);
          }
        } catch (error) {
          console.error('Failed to check existing boards:', error);
          // Fallback: create new board
          const newBoardId = generateBoardId();
          setCurrentBoardId(newBoardId);
          if (session) {
            setBoardId(newBoardId, session.userId, session.username);
          }
          const newUrl = `${window.location.pathname}?boardId=${newBoardId}`;
          window.history.replaceState({}, '', newUrl);
          setIsInitializing(false);
        }
      }
    };

    initializeApp();
  }, [isAuthenticated, session?.userId]);

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          // Clear URL params to prevent joining previous user's board
          window.history.replaceState({}, '', window.location.pathname);
          window.location.reload();
        }}
      />
    );
  }

  // Show loading screen while initializing
  if (isInitializing) {
    return <LoadingScreen />;
  }

  // Show dashboard if user has boards but no boardId in URL
  if (showDashboard) {
    return (
      <Dashboard
        isOpen={true}
        showAsMainScreen={true}
        onClose={() => {
          // User closed dashboard without selecting - create new board
          const newBoardId = generateBoardId();
          setCurrentBoardId(newBoardId);
          if (session) {
            setBoardId(newBoardId, session.userId, session.username);
          }
          const newUrl = `${window.location.pathname}?boardId=${newBoardId}`;
          window.history.replaceState({}, '', newUrl);
          setShowDashboard(false);
        }}
        onNewProject={() => {
          // Create new board
          const newBoardId = generateBoardId();
          setCurrentBoardId(newBoardId);
          if (session) {
            setBoardId(newBoardId, session.userId, session.username);
          }
          const newUrl = `${window.location.pathname}?boardId=${newBoardId}`;
          window.history.replaceState({}, '', newUrl);
          setShowDashboard(false);
        }}
      />
    );
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
