import { Users } from 'lucide-react';
import { useStore } from '../store/useStore';

export const CollaborationStatus = () => {
  const { isConnectedToServer, connectedUsers, isOwner, project } = useStore();

  if (connectedUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-300">
      {/* Connection Status Indicator */}
      <div
        className={`w-2 h-2 rounded-full ${
          isConnectedToServer ? 'bg-green-500' : 'bg-red-500'
        }`}
        title={isConnectedToServer ? 'Connected' : 'Disconnected'}
      />

      {/* Users Icon and Count */}
      <Users size={16} className="text-gray-600" />
      <span className="text-sm font-medium text-gray-700">
        {connectedUsers.length}
      </span>

      {/* User List Tooltip on Hover */}
      <div className="relative group">
        <button
          className="text-xs text-gray-500 hover:text-gray-700 cursor-help"
          title="Click to see users"
        >
          {isOwner ? '(Owner)' : '(Collaborator)'}
        </button>

        {/* Tooltip */}
        <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-48">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Connected Users:
          </p>
          <ul className="space-y-1">
            {connectedUsers.map((user) => (
              <li
                key={user.userId}
                className="text-xs text-gray-600 flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>
                  {user.username}
                  {user.userId === project.ownerId && ' (Owner)'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
