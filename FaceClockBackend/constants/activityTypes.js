const ActivityTypes = {
  CLOCK_IN: 'CLOCK_IN',
  CLOCK_OUT: 'CLOCK_OUT',
  BREAK_START: 'BREAK_START',
  BREAK_END: 'BREAK_END',
  LUNCH_START: 'LUNCH_START',
  LUNCH_END: 'LUNCH_END',
};

const LegacyActivityTypeMap = {
  [ActivityTypes.CLOCK_IN]: 'in',
  [ActivityTypes.CLOCK_OUT]: 'out',
  [ActivityTypes.BREAK_START]: 'break_start',
  [ActivityTypes.BREAK_END]: 'break_end',
  [ActivityTypes.LUNCH_START]: 'lunch_start',
  [ActivityTypes.LUNCH_END]: 'lunch_end',
};

const LegacyToActivityType = Object.fromEntries(
  Object.entries(LegacyActivityTypeMap).map(([key, legacy]) => [legacy, key])
);

const ActivityStates = {
  OUT: 'OUT',
  IN: 'IN',
  BREAK: 'BREAK',
  LUNCH: 'LUNCH',
};

const ActivityTypeToState = {
  [ActivityTypes.CLOCK_IN]: ActivityStates.IN,
  [ActivityTypes.CLOCK_OUT]: ActivityStates.OUT,
  [ActivityTypes.BREAK_START]: ActivityStates.BREAK,
  [ActivityTypes.BREAK_END]: ActivityStates.IN,
  [ActivityTypes.LUNCH_START]: ActivityStates.LUNCH,
  [ActivityTypes.LUNCH_END]: ActivityStates.IN,
};

const ValidTransitions = {
  [ActivityStates.OUT]: new Set([ActivityTypes.CLOCK_IN]),
  [ActivityStates.IN]: new Set([
    ActivityTypes.CLOCK_OUT,
    ActivityTypes.BREAK_START,
    ActivityTypes.LUNCH_START,
  ]),
  [ActivityStates.BREAK]: new Set([ActivityTypes.BREAK_END]),
  [ActivityStates.LUNCH]: new Set([ActivityTypes.LUNCH_END]),
};

const deriveState = (activityType) => ActivityTypeToState[activityType] || ActivityStates.OUT;

const canTransitionFrom = (currentState, nextActivityType) => {
  const allowed = ValidTransitions[currentState] || new Set();
  return allowed.has(nextActivityType);
};

const activityTypeValues = Object.values(ActivityTypes);

module.exports = {
  ActivityTypes,
  ActivityStates,
  deriveState,
  canTransitionFrom,
  activityTypeValues,
  LegacyActivityTypeMap,
  LegacyToActivityType,
};
