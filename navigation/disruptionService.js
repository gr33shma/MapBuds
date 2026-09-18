const LTA_TRAIN_ALERTS_URL =
  'https://datamall2.mytransport.sg/ltaodataservice/TrainServiceAlerts';

/**
 * Fetch current train service alerts from LTA DataMall.
 */
export async function getTrainServiceAlerts(accountKey) {
  if (!accountKey) {
    throw new Error('LTA Account Key is required');
  }

  const response = await fetch(LTA_TRAIN_ALERTS_URL, {
    method: 'GET',
    headers: {
      AccountKey: accountKey,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`LTA TrainServiceAlerts failed: ${response.status}`);
  }

  const data = await response.json();
  const alertData = data.value || {};

  return {
    status: alertData.Status,
    affectedSegments: alertData.AffectedSegments || [],
    messages: alertData.Message || [],
  };
}


/**
 * Canonicalise train line names so OneMap and LTA data
 * can be compared consistently.
 */
export function normaliseTrainLine(lineName) {
  if (!lineName) return null;

  const name = String(lineName).toUpperCase().trim();

  const lineMap = {
    'EAST WEST LINE': 'EWL',
    EWL: 'EWL',

    'NORTH SOUTH LINE': 'NSL',
    NSL: 'NSL',

    'NORTH EAST LINE': 'NEL',
    NEL: 'NEL',

    'CIRCLE LINE': 'CCL',
    CCL: 'CCL',

    'DOWNTOWN LINE': 'DTL',
    DTL: 'DTL',

    'THOMSON-EAST COAST LINE': 'TEL',
    'THOMSON EAST COAST LINE': 'TEL',
    TEL: 'TEL',

    'BUKIT PANJANG LRT': 'BPL',
    BPL: 'BPL',

    'SENGKANG LRT': 'SLRT',
    SLRT: 'SLRT',
    STL: 'SLRT',

    'PUNGGOL LRT': 'PLRT',
    PLRT: 'PLRT',
    PTL: 'PLRT',
  };

  return lineMap[name] || name;
}


/**
 * Extract the rail lines used by a OneMap PT itinerary.
 */
export function getJourneyTrainLines(itinerary) {
  const legs = itinerary?.legs || [];

  const lines = legs
    .filter((leg) =>
  ['RAIL', 'SUBWAY'].includes(
    String(leg.mode || '').toUpperCase()
  )
)
    .map((leg) => normaliseTrainLine(leg.route || leg.routeLongName))
    .filter(Boolean);

  return [...new Set(lines)];
}

/**
 * Check whether an itinerary uses a particular train line.
 */
export function itineraryUsesTrainLine(itinerary, affectedLine) {
  const journeyLines = getJourneyTrainLines(itinerary);
  const targetLine = normaliseTrainLine(affectedLine);

  return journeyLines.includes(targetLine);
}


/**
 * Find the fastest OneMap alternative that avoids
 * all affected train lines.
 */
export function findBestUnaffectedAlternative(
  itineraries = [],
  affectedLines = []
) {
  if (!itineraries.length || !affectedLines.length) {
    return null;
  }

  const normalisedAffectedLines = affectedLines
    .map(normaliseTrainLine)
    .filter(Boolean);

  const unaffectedRoutes = itineraries.filter((itinerary) => {
    const journeyLines = getJourneyTrainLines(itinerary);

    return !journeyLines.some((line) =>
      normalisedAffectedLines.includes(line)
    );
  });

  if (!unaffectedRoutes.length) {
    return null;
  }

  return unaffectedRoutes.reduce((best, current) => {
    if (!best) return current;

    return current.duration < best.duration
      ? current
      : best;
  }, null);
}

/**
 * Determine whether an LTA structured disruption affects
 * any rail line used by the user's journey.
 */
export function findAffectedJourneySegments(itinerary, affectedSegments = []) {
  const journeyLines = getJourneyTrainLines(itinerary);

  return affectedSegments.filter((segment) => {
    const affectedLine = normaliseTrainLine(segment.Line);
    return journeyLines.includes(affectedLine);
  });
}


/**
 * Produce a simple decision-support result for the app.
 */
export function analyseJourneyDisruption(itinerary, alerts) {
  const journeyLines = getJourneyTrainLines(itinerary);

  const affectedSegments = findAffectedJourneySegments(
    itinerary,
    alerts?.affectedSegments || []
  );

  const relevantAdvisories = findRelevantAdvisories(
    itinerary,
    alerts?.messages || []
  );

  if (affectedSegments.length > 0) {
    return {
      affected: true,
      source: 'structured-disruption',
      severity: 'disruption',
      journeyLines,
      affectedSegments,
      relevantAdvisories,
      recommendation:
        'Your planned journey is affected. Check an alternative route before leaving.',
    };
  }

  if (relevantAdvisories.length > 0) {
    return {
      affected: false,
      advisoryRelevant: true,
      requiresDateCheck: true,
      source: 'service-advisory',
      severity: 'advisory',
      journeyLines,
      affectedSegments: [],
      relevantAdvisories,
      recommendation:
        'An LTA service advisory is relevant to this route. Check the stated travel date and details before travelling.',
    };
  }

  return {
    affected: false,
    advisoryRelevant: false,
    requiresDateCheck: false,
    source: null,
    severity: 'normal',
    journeyLines,
    affectedSegments: [],
    relevantAdvisories: [],
    recommendation:
      'No current LTA train alert appears to affect your route.',
  };
}

/**
 * Find advisory/planned-event messages that mention
 * one of the train lines used by the journey.
 */
export function findRelevantAdvisories(itinerary, messages = []) {
  const journeyLines = getJourneyTrainLines(itinerary);

  const searchTerms = {
    EWL: ['EWL', 'EAST WEST LINE'],
    NSL: ['NSL', 'NORTH SOUTH LINE'],
    NEL: ['NEL', 'NORTH EAST LINE'],
    CCL: ['CCL', 'CIRCLE LINE'],
    DTL: ['DTL', 'DOWNTOWN LINE'],
    TEL: ['TEL', 'THOMSON-EAST COAST LINE', 'THOMSON EAST COAST LINE'],

    BPL: [
      'BPL',
      'BUKIT PANJANG LRT',
      'BUKIT PANJANG',
    ],

    SLRT: [
      'SLRT',
      'STL',
      'SENGKANG LRT',
      'SENGKANG WEST LRT',
      'SENGKANG EAST LRT',
    ],

    PLRT: [
      'PLRT',
      'PTL',
      'PUNGGOL LRT',
      'PUNGGOL WEST LRT',
      'PUNGGOL EAST LRT',
    ],
  };

  return messages.filter((message) => {
    const content = String(message.Content || '').toUpperCase();

    return journeyLines.some((line) => {
      const terms = searchTerms[line] || [line];
      return terms.some((term) => content.includes(term));
    });
  });
}