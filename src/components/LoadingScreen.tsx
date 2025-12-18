export const LoadingScreen = () => {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        {/* Spinner */}
        <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />

        {/* Loading Text */}
        <p className="text-xl font-semibold text-gray-800">Loading...</p>
        <p className="text-sm text-gray-600 mt-2">Please wait</p>
      </div>
    </div>
  );
};
