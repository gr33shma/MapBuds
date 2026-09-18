import { getPublicTransportRoute } from './routingService.js';

import {
  getTrainServiceAlerts,
  analyseJourneyDisruption,
  findBestUnaffectedAlternative,
  getJourneyTrainLines,
} from './disruptionService.js';

function getItineraries(routeData) {
  return routeData?.plan?.itineraries || [];
}


function getAffectedLines(disruptionResult) {
  return [
    ...new Set(
      (disruptionResult?.affectedSegments || [])
        .map((segment) => segment.Line)
        .filter(Boolean)
    ),
  ];
}


function getDurationMinutes(itinerary) {
  if (!itinerary?.duration) return null;
  return Math.round(itinerary.duration / 60);
}


function describeJourney(itinerary) {
  return (itinerary?.legs || [])
    .filter((leg) => leg.mode !== 'WALK')
    .map((leg) => {
      return (
        leg.routeShortName ||
        leg.route ||
        leg.routeLongName ||
        leg.mode
      );
    });
}


/**
 * Main MapBuds commuter decision engine.
 *
 * Combines:
 * - OneMap normal PT routing
 * - LTA train disruption data
 * - unaffected OneMap alternatives
 * - bus fallback if all normal alternatives are affected
 */
export async function getCommuterRecommendation({
  origin,
  destination,
  oneMapAccessToken,
  ltaAccountKey,
  departureTime = null,
}) {
  // 1. Get normal OneMap public-transport alternatives.
  const normalRouteData = await getPublicTransportRoute(
    origin,
    destination,
    oneMapAccessToken,
    'transit',
    departureTime
  );

  const normalItineraries = getItineraries(normalRouteData);

  if (!normalItineraries.length) {
    throw new Error(
      'No public transport routes were found for this journey.'
    );
  }

  // OneMap normally orders these by preference,
  // but explicitly choose the fastest for our baseline.
  const normalRoute = [...normalItineraries].sort(
    (a, b) => a.duration - b.duration
  )[0];

  // 2. Fetch current LTA train alerts.
  const alerts = await getTrainServiceAlerts(ltaAccountKey);

  // 3. Check whether this specific journey is affected.
  const disruption = analyseJourneyDisruption(
    normalRoute,
    alerts
  );

  // No relevant LTA issue: return normal journey.
  if (!disruption.affected && !disruption.advisoryRelevant) {
    return {
      affected: false,
      recommendationType: 'normal',
      route: normalRoute,

      normalDurationMinutes:
        getDurationMinutes(normalRoute),

      recommendedDurationMinutes:
        getDurationMinutes(normalRoute),

      extraMinutes: 0,

      journey: describeJourney(normalRoute),

      trainLines:
        getJourneyTrainLines(normalRoute),

      message:
        'Your route is operating normally.',
    };
  }


  // 4. Structured disruptions give us affected lines
  // that can be safely used for automatic rerouting.
  const affectedLines = getAffectedLines(disruption);

  if (affectedLines.length > 0) {
    // First see whether one of the normal OneMap
    // alternatives already avoids the disruption.
    const unaffectedAlternative =
      findBestUnaffectedAlternative(
        normalItineraries,
        affectedLines
      );

    if (unaffectedAlternative) {
      const normalMinutes =
        getDurationMinutes(normalRoute);

      const alternativeMinutes =
        getDurationMinutes(unaffectedAlternative);

      return {
        affected: true,
        recommendationType: 'alternative-transit',

        affectedLines,

        route: unaffectedAlternative,

        normalDurationMinutes: normalMinutes,

        recommendedDurationMinutes:
          alternativeMinutes,

        extraMinutes:
          alternativeMinutes - normalMinutes,

        journey:
          describeJourney(unaffectedAlternative),

        message:
          `Your usual route is affected. ` +
          `An unaffected alternative is available ` +
          `with about ${
            alternativeMinutes - normalMinutes
          } extra minutes.`,
      };
    }


    // 5. All normal PT alternatives still touch
    // the affected line. Deliberately request bus mode.
    const busRouteData =
      await getPublicTransportRoute(
        origin,
        destination,
        oneMapAccessToken,
        'bus',
        departureTime
      );

    const busItineraries =
      getItineraries(busRouteData);

    if (busItineraries.length > 0) {
      const bestBusRoute =
        [...busItineraries].sort(
          (a, b) => a.duration - b.duration
        )[0];

      const normalMinutes =
        getDurationMinutes(normalRoute);

      const busMinutes =
        getDurationMinutes(bestBusRoute);

      return {
        affected: true,
        recommendationType: 'bus-fallback',

        affectedLines,

        route: bestBusRoute,

        normalDurationMinutes: normalMinutes,

        recommendedDurationMinutes: busMinutes,

        extraMinutes:
          busMinutes - normalMinutes,

        journey:
          describeJourney(bestBusRoute),

        message:
          `Your rail route is affected. ` +
          `A bus alternative avoids the affected line ` +
          `and takes about ${busMinutes} minutes ` +
          `(${busMinutes - normalMinutes} minutes longer).`,
      };
    }
  }


  // Planned/advisory message is relevant, but we do
  // NOT automatically claim a reroute is required
  // until its date/station applicability is confirmed.
  return {
    affected: false,
    advisoryRelevant: true,
    requiresDateCheck: true,
    recommendationType: 'advisory',

    route: normalRoute,

    normalDurationMinutes:
      getDurationMinutes(normalRoute),

    recommendedDurationMinutes:
      getDurationMinutes(normalRoute),

    extraMinutes: 0,

    journey:
      describeJourney(normalRoute),

    advisories:
      disruption.relevantAdvisories || [],

    message:
      'LTA has issued an advisory relevant to this journey. Check the advisory before travelling.',
  };
}