import OpenAI from 'openai';
import type { Project, Sticky } from '../types';

let openaiClient: OpenAI | null = null;

export const initializeOpenAI = (apiKey: string) => {
  openaiClient = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
  });
};

export const isOpenAIInitialized = () => {
  return openaiClient !== null;
};

export interface AISuggestion {
  pageType: string;
  sections: {
    name: string;
    order: number;
    stickies: string[];
    reasoning: string;
  }[];
  generalRecommendations?: string[];
}

export interface ReorganizationVersion {
  title: string;
  description: string;
  reasoning: string;
  isRecommended: boolean;
  layout: {
    stickyText: string;
    x: number;
    y: number;
  }[];
}

export interface SuggestedSticky {
  text: string;
  color: string;
  reasoning: string;
  priority: 'critical' | 'high' | 'medium';
}

export interface AIReview {
  pageInterpretation: string;
  workingWell: string[];
  improvements: {
    suggestion: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  missingStickies: SuggestedSticky[];
  reorganizations: ReorganizationVersion[];
}

export const generateStructure = async (pageType?: string, userContext?: string): Promise<AISuggestion> => {
  if (!openaiClient) {
    throw new Error('OpenAI not initialized. Please provide your API key.');
  }

  const contextInfo = userContext
    ? `\n\nUser's Context/Purpose:\n"${userContext}"\n\nUse this context to make highly relevant suggestions tailored to their specific needs.`
    : '';

  const prompt = `You are a UX expert helping to plan a website page structure.

${pageType ? `The user wants to plan a "${pageType}" page.` : 'The user wants to plan a page but hasn\'t specified the type yet.'}${contextInfo}

Your task is to suggest:
1. What type of page this is (if not specified, make a reasonable assumption)
2. Logical sections for the page (in recommended top-to-bottom order)
3. Content blocks (stickies) for each section
4. Clear reasoning for the structure

Respond in JSON format:
{
  "pageType": "detected or assumed page type",
  "sections": [
    {
      "name": "Section Name",
      "order": 1,
      "stickies": ["Sticky 1", "Sticky 2"],
      "reasoning": "Why this section is placed here"
    }
  ],
  "generalRecommendations": ["tip 1", "tip 2"]
}

Guidelines:
- Keep sticky names short and clear (e.g., "Hero Banner", "Profit Rate")
- Order sections logically (hero first, CTA last, etc.)
- Explain placement decisions
- Focus on common web patterns for ${pageType || 'typical product pages'}`;

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful UX expert who structures web pages. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  return JSON.parse(content);
};

export const reviewStructure = async (
  project: Project,
  existingStickies: Sticky[],
  userContext?: string
): Promise<AIReview> => {
  if (!openaiClient) {
    throw new Error('OpenAI not initialized. Please provide your API key.');
  }

  console.log('reviewStructure called with:', {
    projectId: project.id,
    stickyCount: existingStickies.length,
    canvasInstanceCount: project.canvasInstances.length,
    hasContext: !!userContext,
  });

  // Build info about library stickies
  const libraryStickies = existingStickies.map(s => s.text);

  // Build context about the current canvas
  const canvasInfo = {
    stickyCount: project.canvasInstances.length,
    stickies: project.canvasInstances.map((instance) => {
      const sticky = existingStickies.find((s) => s.id === instance.stickyId);
      return {
        text: instance.overriddenText || sticky?.text || 'Unknown',
        x: Math.round(instance.x),
        y: Math.round(instance.y),
        zIndex: instance.zIndex,
      };
    }),
  };

  const contextInfo = userContext
    ? `\n\nUser's Context/Purpose:\n"${userContext}"\n\nUse this context to provide highly targeted feedback, identify missing critical content, and suggest reorganization strategies that align with their specific goals and target audience.`
    : '';

  const prompt = `You are a UX expert reviewing a page layout and content strategy.

The user has created these content blocks in their library:
${JSON.stringify(libraryStickies, null, 2)}

${canvasInfo.stickyCount > 0 ? `They have placed ${canvasInfo.stickyCount} blocks on their canvas:
${JSON.stringify(canvasInfo.stickies, null, 2)}

Each block has:
- "text": the content block name
- "x", "y": position on canvas (lower y = higher on page)
- "zIndex": layering order` : 'The canvas is currently empty.'}${contextInfo}

Your task is to:
1. Interpret what type of page this appears to be based on the context
2. Analyze existing stickies - identify what's working well
3. **Critically identify missing crucial content blocks** that would significantly improve user experience based on the context
4. Suggest layout improvements with clear reasoning
5. Provide 2-3 reorganization versions with actual x,y positions

Respond in JSON format:
{
  "pageInterpretation": "Your interpretation of what page this is",
  "workingWell": ["observation 1", "observation 2"],
  "improvements": [
    {
      "suggestion": "What to improve",
      "reason": "Why this matters",
      "priority": "high"
    }
  ],
  "missingStickies": [
    {
      "text": "Content block name (e.g., 'Testimonials', 'FAQ Section')",
      "color": "#FEF3C7",
      "reasoning": "Why this content is crucial for the user's context",
      "priority": "critical"
    }
  ],
  "reorganizations": [
    {
      "title": "Version name (e.g., 'Traditional Flow', 'Conversion Focused')",
      "description": "Brief description of this arrangement",
      "reasoning": "Why this arrangement works",
      "isRecommended": true,
      "layout": [
        {
          "stickyText": "exact text from the sticky",
          "x": 100,
          "y": 50
        }
      ]
    }
  ]
}

Guidelines for missingStickies:
- Be critical and identify content that is CRUCIAL for the user's specific context
- Only suggest stickies that would significantly improve user experience
- Prioritize: "critical" (must-have), "high" (strongly recommended), "medium" (nice-to-have)
- Use colors: yellow (#FEF3C7), blue (#DBEAFE), pink (#FCE7F3), green (#D1FAE5), purple (#E0E7FF), orange (#FED7AA)
- Provide clear reasoning why each is important for their context

Guidelines for reorganizations:
- Provide 2-3 distinct versions (mark one as recommended)
- Each version should include ALL existing stickies PLUS suggested missing stickies
- **CRITICAL Layout Rules for Clean, Non-Overlapping Design:**

  **Sticky Dimensions:**
  - Each sticky is EXACTLY 200px wide by 120px tall
  - Canvas viewport is approximately 1200px wide (safe area: 100px to 1100px)
  - Canvas can scroll vertically infinitely

  **Single Column Layout (Recommended for clarity):**
  - Center position: x=500 (this centers the 200px sticky in a 1200px canvas)
  - Vertical spacing: y values should be 200px apart (y: 50, 250, 450, 650, 850, etc.)
  - Example: First item y=50, second item y=250, third item y=450

  **Two Items Side-by-Side:**
  - Left sticky: x=300 (leaves 300px margin on left, 200px sticky width)
  - Right sticky: x=700 (leaves 200px gap between stickies, 200px sticky width, 300px margin on right)
  - Use SAME y value for both (e.g., both at y=50 or y=250)
  - Next row: y should be at least 200px more (if previous row was y=50, next row y=250)

  **Three Items Side-by-Side:**
  - Left: x=200
  - Center: x=500
  - Right: x=800
  - Use SAME y value for all three
  - Next row: y should be at least 200px more

  **STRICT RULES:**
  - NEVER use y values closer than 200px apart on different rows
  - NEVER use x values less than 100 or greater than 1000
  - For items on the same row (same y), ensure x values are at least 250px apart
  - Start first item at y=50 minimum

- **When to place items side-by-side:**
  - Related features/benefits that users compare (e.g., "Interest Rate" + "Loan Amount")
  - CTA buttons that offer choices (e.g., "Apply Now" + "Calculate EMI")
  - Trust indicators (e.g., "Security Badge" + "Customer Reviews")
  - Complementary information blocks
- Explain the strategy behind each version
- Version titles should be descriptive (e.g., "Sales-Driven", "Educational Flow", "Comparison-First")`;

  console.log('Sending request to OpenAI...');

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful UX expert who reviews page structures. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    console.log('OpenAI response received');

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from AI');
    }

    console.log('Parsing AI response...');
    const parsed = JSON.parse(content);
    console.log('AI response parsed successfully:', {
      hasPageInterpretation: !!parsed.pageInterpretation,
      workingWellCount: parsed.workingWell?.length,
      improvementsCount: parsed.improvements?.length,
      missingStickiesCount: parsed.missingStickies?.length,
      reorganizationsCount: parsed.reorganizations?.length,
    });

    return parsed;
  } catch (error: any) {
    console.error('Error in reviewStructure:', error);

    if (error.response) {
      // OpenAI API error
      throw new Error(`OpenAI API error: ${error.response.data?.error?.message || error.message}`);
    } else if (error instanceof SyntaxError) {
      // JSON parsing error
      throw new Error('Failed to parse AI response as JSON');
    } else {
      // Other errors
      throw new Error(`AI review failed: ${error.message || 'Unknown error'}`);
    }
  }
};
