import { State, City } from 'country-state-city';

// Fetch all states of India
const rawStates = State.getStatesOfCountry('IN');

// Export an array of state names
export const INDIAN_STATES = rawStates.map((s) => s.name);

// Precompute a map of State Name -> Array of City Names
export const STATE_CITIES_MAP: Record<string, string[]> = {};

rawStates.forEach((state) => {
  // Use state.isoCode to get its cities
  const cities = City.getCitiesOfState('IN', state.isoCode);
  STATE_CITIES_MAP[state.name] = cities.map((c) => c.name);
});
