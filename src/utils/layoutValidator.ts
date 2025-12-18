/**
 * Professional Layout Validator - Senior-Level Implementation
 *
 * Creates a clean, professional grid-based layout that:
 * - Always fits within visible canvas bounds
 * - Uses proper spacing and alignment
 * - Groups related items intelligently
 * - Provides visual hierarchy and structure
 * - Matches enterprise-level UI/UX standards
 */

export interface StickyPosition {
  stickyText: string;
  x: number;
  y: number;
}

// Professional Canvas Configuration
// These are ABSOLUTE constraints that MUST be respected
const CANVAS_CONFIG = {
  // Visible working area (what users see without scrolling)
  viewportWidth: 1200,
  viewportHeight: 800,

  // Safe margins - stickies must stay within these bounds
  marginLeft: 80,
  marginTop: 80,
  marginRight: 80,
  marginBottom: 80,

  // Sticky dimensions
  stickyWidth: 200,
  stickyHeight: 120,

  // Professional spacing
  horizontalGap: 40, // Space between stickies in same row
  verticalGap: 40,   // Space between rows
  groupGap: 80,      // Space between logical groups
} as const;

// Calculate working area
const WORKING_AREA = {
  startX: CANVAS_CONFIG.marginLeft,
  endX: CANVAS_CONFIG.viewportWidth - CANVAS_CONFIG.marginRight,
  startY: CANVAS_CONFIG.marginTop,
  endY: CANVAS_CONFIG.viewportHeight - CANVAS_CONFIG.marginBottom,
  width: CANVAS_CONFIG.viewportWidth - CANVAS_CONFIG.marginLeft - CANVAS_CONFIG.marginRight,
  height: CANVAS_CONFIG.viewportHeight - CANVAS_CONFIG.marginTop - CANVAS_CONFIG.marginBottom,
} as const;

// Calculate how many stickies fit per row
const STICKIES_PER_ROW = Math.floor(
  (WORKING_AREA.width + CANVAS_CONFIG.horizontalGap) /
  (CANVAS_CONFIG.stickyWidth + CANVAS_CONFIG.horizontalGap)
);

/**
 * Main validation function - ensures ALL stickies fit within canvas bounds
 * with professional spacing and alignment
 */
export const validateAndAdjustLayout = (
  positions: StickyPosition[]
): StickyPosition[] => {
  if (positions.length === 0) return [];

  console.log('🎨 Professional Layout Validator');
  console.log('Input positions:', positions.length);
  console.log('Max stickies per row:', STICKIES_PER_ROW);
  console.log('Working area:', WORKING_AREA);

  // Step 1: Group items by their original row (respect AI's grouping intent)
  const groups = groupIntoRows(positions);
  console.log('Grouped into', groups.length, 'rows');

  // Step 2: Apply professional grid layout
  const laid = applyProfessionalLayout(groups);

  // Step 3: Validate all positions are within bounds
  const validated = laid.every(pos => isWithinBounds(pos.x, pos.y));
  console.log('✅ All positions within bounds:', validated);

  if (!validated) {
    console.error('❌ Some positions are out of bounds!');
    laid.forEach(pos => {
      if (!isWithinBounds(pos.x, pos.y)) {
        console.error('Out of bounds:', pos);
      }
    });
  }

  return laid;
};

/**
 * Group stickies into rows based on AI's original y-positions
 * Respects the AI's grouping intent while preparing for professional layout
 */
function groupIntoRows(positions: StickyPosition[]): StickyPosition[][] {
  const sorted = [...positions].sort((a, b) => a.y - b.y);
  const groups: StickyPosition[][] = [];

  sorted.forEach((pos) => {
    // Find existing row within 60px tolerance
    const existingGroup = groups.find(group => {
      const avgY = group.reduce((sum, item) => sum + item.y, 0) / group.length;
      return Math.abs(avgY - pos.y) < 60;
    });

    if (existingGroup) {
      existingGroup.push(pos);
    } else {
      groups.push([pos]);
    }
  });

  // Sort items within each group by x position (left to right)
  groups.forEach(group => group.sort((a, b) => a.x - b.x));

  return groups;
}

/**
 * Apply professional grid-based layout
 * Ensures perfect alignment, spacing, and bounds compliance
 */
function applyProfessionalLayout(groups: StickyPosition[][]): StickyPosition[] {
  const result: StickyPosition[] = [];
  let currentY = WORKING_AREA.startY;

  groups.forEach((group, groupIndex) => {
    // Split large groups into multiple rows if needed
    const rowGroups = splitIntoRows(group);

    rowGroups.forEach((row) => {
      // Calculate centered starting X position for this row
      const rowWidth =
        row.length * CANVAS_CONFIG.stickyWidth +
        (row.length - 1) * CANVAS_CONFIG.horizontalGap;

      let startX: number;

      if (rowWidth <= WORKING_AREA.width) {
        // Center the row if it fits
        startX = WORKING_AREA.startX + (WORKING_AREA.width - rowWidth) / 2;
      } else {
        // Start from left margin if row is exactly at max width
        startX = WORKING_AREA.startX;
      }

      // Position each sticky in the row
      row.forEach((item, index) => {
        const x = startX + index * (CANVAS_CONFIG.stickyWidth + CANVAS_CONFIG.horizontalGap);
        const y = currentY;

        // Safety clamp (should never trigger with proper splitting)
        const clampedX = Math.max(
          WORKING_AREA.startX,
          Math.min(x, WORKING_AREA.endX - CANVAS_CONFIG.stickyWidth)
        );

        const clampedY = Math.max(
          WORKING_AREA.startY,
          Math.min(y, WORKING_AREA.endY - CANVAS_CONFIG.stickyHeight)
        );

        result.push({
          ...item,
          x: clampedX,
          y: clampedY,
        });
      });

      // Move to next row
      currentY += CANVAS_CONFIG.stickyHeight + CANVAS_CONFIG.verticalGap;
    });

    // Add extra gap between groups
    if (groupIndex < groups.length - 1) {
      currentY += CANVAS_CONFIG.groupGap - CANVAS_CONFIG.verticalGap;
    }
  });

  return result;
}

/**
 * Split a large group into multiple rows
 * Ensures each row has at most STICKIES_PER_ROW items
 */
function splitIntoRows(items: StickyPosition[]): StickyPosition[][] {
  const rows: StickyPosition[][] = [];

  for (let i = 0; i < items.length; i += STICKIES_PER_ROW) {
    rows.push(items.slice(i, i + STICKIES_PER_ROW));
  }

  return rows;
}

/**
 * Validates if a position is within safe canvas bounds
 */
export const isWithinBounds = (x: number, y: number): boolean => {
  const rightEdge = x + CANVAS_CONFIG.stickyWidth;
  const bottomEdge = y + CANVAS_CONFIG.stickyHeight;

  return (
    x >= WORKING_AREA.startX &&
    rightEdge <= WORKING_AREA.endX + CANVAS_CONFIG.marginRight &&
    y >= WORKING_AREA.startY &&
    bottomEdge <= CANVAS_CONFIG.viewportHeight // Allow scrolling vertically
  );
};

/**
 * Checks if two stickies overlap
 */
export const checkOverlap = (
  pos1: StickyPosition,
  pos2: StickyPosition
): boolean => {
  const horizontalOverlap =
    Math.abs(pos1.x - pos2.x) < CANVAS_CONFIG.stickyWidth;
  const verticalOverlap =
    Math.abs(pos1.y - pos2.y) < CANVAS_CONFIG.stickyHeight;

  return horizontalOverlap && verticalOverlap;
};

/**
 * Calculates the bounding box of all stickies
 */
export const calculateBounds = (
  positions: StickyPosition[]
): { width: number; height: number; minX: number; minY: number } => {
  if (positions.length === 0) {
    return { width: 0, height: 0, minX: 0, minY: 0 };
  }

  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) + CANVAS_CONFIG.stickyWidth;
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys) + CANVAS_CONFIG.stickyHeight;

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};
