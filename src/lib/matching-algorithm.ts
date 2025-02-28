import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';

// Type definitions
export type Participant = {
  id: string;
  name: string;
  email: string;
  barNumber?: string;
  practiceAreas: string[];
  experienceLevel: string;
  networkingGoals: string[];
  availability: string[];
  locations: string[];
  useSeparateLocations: boolean;
  weekdayLunchLocations?: string[];
  weekdayDinnerLocations?: string[];
  weekendLunchLocations?: string[];
  weekendDinnerLocations?: string[];
  submittedAt: any;
  status: 'pending' | 'matched' | 'emailed';
  matchGroup?: string;
};

export type MatchGroup = {
  id: string;
  participants: Participant[];
  meetingTime: string;
  meetingLocation: string;
  isFinalized: boolean;
  cycle: string;
};

/**
 * Runs the matching algorithm to create optimal networking groups
 * 
 * @param participants - List of participants to match
 * @param cycle - The current cycle (e.g., "March 2025")
 * @returns Promise resolving to array of match groups
 */
export async function runMatchingAlgorithm(
  participants: Participant[],
  cycle: string
): Promise<MatchGroup[]> {
  try {
    console.log(`Starting matching algorithm for ${participants.length} participants`);
    
    // Group participants by availability preferences
    const availabilityGroups = groupByAvailability(participants);
    
    // Create match groups for each availability slot
    const matchGroups: MatchGroup[] = [];
    
    // Process each availability type
    for (const [availability, availableParticipants] of Object.entries(availabilityGroups)) {
      if (availableParticipants.length < 2) continue;
      
      // Further group by location preferences
      const locationGroups = groupByLocation(availableParticipants, availability);
      
      // For each location, create optimal groups
      for (const [location, locationParticipants] of Object.entries(locationGroups)) {
        if (locationParticipants.length < 2) continue;
        
        // Create groups of 3-4 people (optimal for networking)
        const groups = createOptimalGroups(locationParticipants);
        
        // Add each group to match groups
        for (const group of groups) {
          if (group.length < 2) continue; // Skip groups with only 1 person
          
          const matchGroup: Omit<MatchGroup, 'id'> = {
            participants: group,
            meetingTime: availability,
            meetingLocation: location,
            isFinalized: false,
            cycle
          };
          
          // Save to Firestore and get ID
          const docRef = await addDoc(collection(db, 'match-groups'), matchGroup);
          
          matchGroups.push({
            ...matchGroup,
            id: docRef.id
          } as MatchGroup);
        }
      }
    }
    
    // Update participant statuses to 'matched'
    await updateParticipantStatuses(matchGroups);
    
    return matchGroups;
  } catch (error) {
    console.error('Error in matching algorithm:', error);
    throw new Error('Failed to run matching algorithm');
  }
}

/**
 * Groups participants by their availability preferences
 */
function groupByAvailability(
  participants: Participant[]
): Record<string, Participant[]> {
  const groups: Record<string, Participant[]> = {
    'Weekday Lunch': [],
    'Weekday Dinner': [],
    'Weekend Lunch': [],
    'Weekend Dinner': []
  };
  
  // First pass: Group participants by their first availability preference
  for (const participant of participants) {
    if (participant.availability.length > 0) {
      groups[participant.availability[0]].push(participant);
    }
  }
  
  // Second pass: For timeslots with few participants, add people who listed it as a secondary preference
  for (const [availability, group] of Object.entries(groups)) {
    if (group.length < 3) {
      for (const participant of participants) {
        // If they're not already in this group but have it as an availability option beyond their first choice
        if (
          !group.find(p => p.id === participant.id) && 
          participant.availability.includes(availability) && 
          participant.availability[0] !== availability
        ) {
          groups[availability].push(participant);
        }
      }
    }
  }
  
  return groups;
}

/**
 * Groups participants by their location preferences for a specific availability
 */
function groupByLocation(
  participants: Participant[],
  availability: string
): Record<string, Participant[]> {
  const locationGroups: Record<string, Participant[]> = {};
  
  for (const participant of participants) {
    let preferredLocations: string[] = [];
    
    // Get the appropriate locations based on availability and participant preferences
    if (participant.useSeparateLocations) {
      switch (availability) {
        case 'Weekday Lunch':
          preferredLocations = participant.weekdayLunchLocations || [];
          break;
        case 'Weekday Dinner':
          preferredLocations = participant.weekdayDinnerLocations || [];
          break;
        case 'Weekend Lunch':
          preferredLocations = participant.weekendLunchLocations || [];
          break;
        case 'Weekend Dinner':
          preferredLocations = participant.weekendDinnerLocations || [];
          break;
      }
    } else {
      preferredLocations = participant.locations;
    }
    
    // Use first location preference
    if (preferredLocations.length > 0) {
      const location = preferredLocations[0];
      if (!locationGroups[location]) {
        locationGroups[location] = [];
      }
      locationGroups[location].push(participant);
    }
  }
  
  return locationGroups;
}

/**
 * Creates optimal groups of participants based on diversity criteria
 */
function createOptimalGroups(participants: Participant[]): Participant[][] {
  // Sort participants by experience level to ensure diversity
  const experienceLevels = {
    '0-3 years': 1,
    '4-7 years': 2,
    '8-15 years': 3,
    '15+ years': 4,
    'Judicial Officer': 5
  };
  
  // Sort by experience (ensures distribution of experience levels)
  participants.sort((a, b) => {
    return experienceLevels[a.experienceLevel as keyof typeof experienceLevels] - 
           experienceLevels[b.experienceLevel as keyof typeof experienceLevels];
  });
  
  // Create a map of practice areas to ensure diversity
  const practiceAreaMap: Record<string, Participant[]> = {};
  for (const participant of participants) {
    const mainPracticeArea = participant.practiceAreas[0];
    if (!practiceAreaMap[mainPracticeArea]) {
      practiceAreaMap[mainPracticeArea] = [];
    }
    practiceAreaMap[mainPracticeArea].push(participant);
  }
  
  // Create groups with optimal size between 3-4 people
  const totalGroups = Math.ceil(participants.length / 4);
  const groups: Participant[][] = Array(totalGroups).fill(null).map(() => []);
  
  // Helper to find the group with the fewest participants
  const findSmallestGroup = () => {
    let smallestIndex = 0;
    let smallestSize = groups[0].length;
    
    for (let i = 1; i < groups.length; i++) {
      if (groups[i].length < smallestSize) {
        smallestSize = groups[i].length;
        smallestIndex = i;
      }
    }
    
    return smallestIndex;
  };
  
  // First, distribute by practice area to ensure diversity
  const practiceAreas = Object.keys(practiceAreaMap);
  let currentGroupIndex = 0;
  
  for (const area of practiceAreas) {
    const areaParticipants = practiceAreaMap[area];
    for (const participant of areaParticipants) {
      // Find group with fewest participants
      const targetGroupIndex = findSmallestGroup();
      
      // Add to group
      groups[targetGroupIndex].push(participant);
    }
  }
  
  // Distribute any remaining participants for balanced group sizes
  const allParticipantsAdded = new Set(
    groups.flatMap(group => group.map(p => p.id))
  );
  
  for (const participant of participants) {
    if (!allParticipantsAdded.has(participant.id)) {
      const targetGroupIndex = findSmallestGroup();
      groups[targetGroupIndex].push(participant);
    }
  }
  
  // Remove empty groups
  return groups.filter(group => group.length > 0);
}

/**
 * Updates participant statuses in Firestore
 */
async function updateParticipantStatuses(matchGroups: MatchGroup[]): Promise<void> {
  const batch = writeBatch(db);
  
  for (const group of matchGroups) {
    for (const participant of group.participants) {
      const participantRef = doc(db, 'survey-responses', participant.id);
      batch.update(participantRef, {
        status: 'matched',
        matchGroup: group.id
      });
    }
  }
  
  await batch.commit();
}
