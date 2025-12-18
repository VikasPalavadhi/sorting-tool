import { useState } from 'react';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  initializeOpenAI,
  isOpenAIInitialized,
  reviewStructure,
  type AIReview,
  type ReorganizationVersion,
} from '../services/aiService';
import { validateAndAdjustLayout } from '../utils/layoutValidator';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AIMode = 'context' | 'review';

export const AIModal = ({ isOpen, onClose }: AIModalProps) => {
  const { project, createSticky, updateCanvasInstance, createCanvasInstance } = useStore();
  const [mode, setMode] = useState<AIMode>('context');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || '');
  const [userContext, setUserContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [reviewResult, setReviewResult] = useState<AIReview | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ReorganizationVersion | null>(null);
  const [selectedMissingStickies, setSelectedMissingStickies] = useState<Set<number>>(new Set());

  const handleInitializeAI = () => {
    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key');
      return;
    }

    try {
      initializeOpenAI(apiKey.trim());
      setError('');
    } catch (err) {
      setError('Failed to initialize OpenAI');
    }
  };

  const handleReview = async () => {
    if (!isOpenAIInitialized()) {
      handleInitializeAI();
      if (!isOpenAIInitialized()) {
        setError('Please enter a valid OpenAI API key');
        return;
      }
    }

    if (project.stickies.length === 0) {
      setError('Please create some stickies in your library first.');
      return;
    }

    console.log('Starting AI review...');
    setLoading(true);
    setError('');

    try {
      console.log('Calling reviewStructure with:', {
        stickyCount: project.stickies.length,
        canvasInstanceCount: project.canvasInstances.length,
        hasContext: !!userContext.trim(),
      });

      const review = await reviewStructure(
        project,
        project.stickies,
        userContext.trim() || undefined
      );

      console.log('Review received:', review);
      setReviewResult(review);
      setMode('review'); // Switch to review mode after successful response

      // Auto-select recommended version
      const recommended = review.reorganizations?.find(v => v.isRecommended);
      if (recommended) {
        setSelectedVersion(recommended);
      }
    } catch (err: any) {
      console.error('Review error:', err);
      const errorMessage = err.message || 'Failed to review structure';
      setError(errorMessage + ' - Check console for details')
    } finally {
      setLoading(false);
    }
  };

  const toggleMissingSticky = (index: number) => {
    const newSet = new Set(selectedMissingStickies);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedMissingStickies(newSet);
  };

  const handleApplyVersionOnly = () => {
    if (!selectedVersion) {
      setError('Please select a reorganization version');
      return;
    }

    console.log('Applying version only:', selectedVersion.title);
    console.log('Original layout from AI:', selectedVersion.layout);

    // Validate and adjust layout to ensure professional appearance
    const adjustedLayout = validateAndAdjustLayout(selectedVersion.layout);
    console.log('Adjusted layout:', adjustedLayout);

    // Apply positions for existing stickies
    adjustedLayout.forEach((item) => {
      const canvasInstance = project.canvasInstances.find((ci) => {
        const sticky = project.stickies.find((s) => s.id === ci.stickyId);
        const stickyText = ci.overriddenText || sticky?.text || '';
        return stickyText.trim().toLowerCase() === item.stickyText.trim().toLowerCase();
      });

      if (canvasInstance) {
        updateCanvasInstance(canvasInstance.id, {
          x: item.x,
          y: item.y,
        });
      }
    });

    // Close modal after applying
    setTimeout(() => {
      handleClose();
    }, 500);
  };

  const handleApplyVersionWithStickies = () => {
    if (!selectedVersion) {
      setError('Please select a reorganization version');
      return;
    }

    if (!reviewResult) return;

    console.log('Applying version with new stickies:', selectedVersion.title);
    console.log('Original layout from AI:', selectedVersion.layout);

    // Validate and adjust layout to ensure professional appearance
    const adjustedLayout = validateAndAdjustLayout(selectedVersion.layout);
    console.log('Adjusted layout:', adjustedLayout);

    // First, create the selected missing stickies
    const newStickyIds: string[] = [];
    selectedMissingStickies.forEach((index) => {
      const missingSt = reviewResult.missingStickies[index];
      if (missingSt) {
        const stickyId = createSticky(missingSt.text, missingSt.color);
        newStickyIds.push(stickyId);
      }
    });

    // Give a tiny delay for stickies to be created
    setTimeout(() => {
      // Apply positions for existing and new stickies
      adjustedLayout.forEach((item) => {
        const canvasInstance = project.canvasInstances.find((ci) => {
          const sticky = project.stickies.find((s) => s.id === ci.stickyId);
          const stickyText = ci.overriddenText || sticky?.text || '';
          return stickyText.trim().toLowerCase() === item.stickyText.trim().toLowerCase();
        });

        if (canvasInstance) {
          // Update existing instance position
          updateCanvasInstance(canvasInstance.id, {
            x: item.x,
            y: item.y,
          });
        } else {
          // This might be a newly added sticky from missingStickies
          // Find it in the library
          const newSticky = project.stickies.find((s) =>
            s.text.trim().toLowerCase() === item.stickyText.trim().toLowerCase()
          );

          if (newSticky) {
            // Check if this sticky is already on canvas (prevent duplicates)
            const alreadyOnCanvas = project.canvasInstances.some((ci) => ci.stickyId === newSticky.id);

            if (!alreadyOnCanvas) {
              // Only create instance if not already on canvas
              createCanvasInstance(newSticky.id, item.x, item.y);
            }
          }
        }
      });

      // Close modal after applying
      setTimeout(() => {
        handleClose();
      }, 500);
    }, 100);
  };

  const handleClose = () => {
    setMode('context');
    setUserContext('');
    setReviewResult(null);
    setSelectedVersion(null);
    setSelectedMissingStickies(new Set());
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">AI Review</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* API Key Input (if not initialized and not in .env) */}
          {!isOpenAIInitialized() && !import.meta.env.VITE_OPENAI_API_KEY && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Your API key is stored in memory only and never saved. Alternatively, add it to a .env file as VITE_OPENAI_API_KEY.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Context Input Step */}
          {mode === 'context' && (
            <div className="space-y-4">
              {loading ? (
                /* Loading State */
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Analyzing Your Content...</h3>
                  <p className="text-sm text-gray-600 text-center max-w-md mb-4">
                    Our AI is reviewing your {project.stickies.length} stickies, analyzing the layout, and preparing personalized recommendations.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="animate-spin" size={14} />
                    <span>This may take 15-30 seconds...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      What are you planning to build?
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Describe your project purpose so AI can analyze your stickies, identify missing crucial content, and provide targeted reorganization suggestions.
                    </p>
                    <textarea
                      value={userContext}
                      onChange={(e) => setUserContext(e.target.value)}
                      placeholder="e.g., I am creating a home finance page for my website that will help users compare loan options and apply online. I want to provide the best experience to the end user."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      The more context you provide, the better AI can identify missing content and suggest improvements.
                    </p>
                  </div>

                  <button
                    onClick={handleReview}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles size={18} />
                    Review My Content & Structure
                  </button>

                  {userContext.trim() === '' && (
                    <p className="text-xs text-center text-gray-500">
                      Tip: Providing context helps AI identify missing crucial content blocks
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Review Result Display */}
          {mode === 'review' && reviewResult && (
            <div className="space-y-6">
              {/* Page Interpretation */}
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="font-semibold text-gray-800 mb-1">Page Interpretation</h3>
                <p className="text-gray-700">{reviewResult.pageInterpretation}</p>
              </div>

              {/* Working Well */}
              <div className="bg-green-50 p-4 rounded-md">
                <h3 className="font-semibold text-gray-800 mb-2">Working Well ✓</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {reviewResult.workingWell.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              {reviewResult.improvements.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Suggested Improvements</h3>
                  <div className="space-y-2">
                    {reviewResult.improvements.map((improvement, idx) => (
                      <div
                        key={idx}
                        className={`border-l-4 p-3 rounded ${
                          improvement.priority === 'high'
                            ? 'border-red-500 bg-red-50'
                            : improvement.priority === 'medium'
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-blue-500 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium text-gray-800">{improvement.suggestion}</p>
                          <span className="text-xs px-2 py-1 bg-white rounded">
                            {improvement.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 italic">{improvement.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Critical Stickies */}
              {reviewResult.missingStickies && reviewResult.missingStickies.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Missing Crucial Content Blocks
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Based on your context, AI recommends these additional content blocks. Select which ones to include:
                  </p>
                  <div className="space-y-2">
                    {reviewResult.missingStickies.map((sticky, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleMissingSticky(idx)}
                        className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                          selectedMissingStickies.has(idx)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                selectedMissingStickies.has(idx)
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'border-gray-300'
                              }`}
                            >
                              {selectedMissingStickies.has(idx) && (
                                <Check size={14} className="text-white" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="px-3 py-1 rounded text-sm font-medium"
                                style={{ backgroundColor: sticky.color }}
                              >
                                {sticky.text}
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  sticky.priority === 'critical'
                                    ? 'bg-red-100 text-red-700'
                                    : sticky.priority === 'high'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {sticky.priority}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{sticky.reasoning}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reorganization Versions */}
              {reviewResult.reorganizations && reviewResult.reorganizations.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Reorganization Versions
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select a version to apply to your canvas
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {reviewResult.reorganizations.map((version, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedVersion(version)}
                        className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                          selectedVersion?.title === version.title
                            ? version.isRecommended
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-blue-600 bg-blue-50'
                            : version.isRecommended
                            ? 'border-purple-300 bg-purple-50 hover:border-purple-500'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {/* Header */}
                        <div className="p-4 border-b bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-800">{version.title}</h4>
                            {version.isRecommended && (
                              <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{version.description}</p>
                          <p className="text-xs text-gray-600 italic">{version.reasoning}</p>
                        </div>

                        {/* Sticky Sequence */}
                        <div className="p-4 bg-gray-50 max-h-48 overflow-y-auto">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                            Content Order (Top to Bottom)
                          </h5>
                          <ol className="space-y-1">
                            {version.layout
                              .sort((a, b) => a.y - b.y)
                              .map((item, itemIdx) => (
                                <li key={itemIdx} className="text-xs text-gray-700 flex items-start">
                                  <span className="font-semibold text-blue-600 mr-2 min-w-[20px]">
                                    {itemIdx + 1}.
                                  </span>
                                  <span className="flex-1">{item.stickyText}</span>
                                </li>
                              ))}
                          </ol>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedVersion && (
                <div className="border-t pt-4 flex gap-3">
                  <button
                    onClick={handleApplyVersionOnly}
                    className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
                  >
                    Apply {selectedVersion.title} Only
                  </button>
                  {selectedMissingStickies.size > 0 && (
                    <button
                      onClick={handleApplyVersionWithStickies}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 transition-colors font-medium"
                    >
                      Apply {selectedVersion.title} + {selectedMissingStickies.size} New Sticky{selectedMissingStickies.size !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
