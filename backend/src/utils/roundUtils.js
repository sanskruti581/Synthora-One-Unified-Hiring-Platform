// Normalize round names - treat "HR Interview" and "HR" as equivalent
export function normalizeRoundName(name) {
  if (!name) return "Aptitude";
  if (name === "HR Interview") return "HR";
  return name;
}

// Get the ordered rounds for a drive
export function getDriveRounds(drive) {
  return (drive.rounds || ["Aptitude"]).map(normalizeRoundName);
}

// Get the first round
export function getFirstRound(drive) {
  const rounds = getDriveRounds(drive);
  return rounds.length > 0 ? rounds[0] : "Aptitude";
}

// Get the next round after a given round
export function getNextRound(drive, currentRound) {
  const rounds = getDriveRounds(drive);
  const currentIndex = rounds.indexOf(normalizeRoundName(currentRound));
  if (currentIndex === -1 || currentIndex >= rounds.length - 1) return null;
  return rounds[currentIndex + 1];
}

// Check if a round is the final round
export function isFinalRound(drive, roundName) {
  const rounds = getDriveRounds(drive);
  return rounds.length > 0 && rounds[rounds.length - 1] === normalizeRoundName(roundName);
}

// Validate that the student can access a specific round
// (all previous rounds must be completed)
export function canAccessRound(drive, student, roundName) {
  const rounds = getDriveRounds(drive);
  const targetIndex = rounds.indexOf(normalizeRoundName(roundName));
  if (targetIndex === -1) return false;
  if (targetIndex === 0) return true;
  
  // Check all previous rounds are completed
  for (let i = 0; i < targetIndex; i++) {
    const prevResult = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === rounds[i]);
    if (!prevResult || prevResult.status !== "Completed") return false;
  }
  return true;
}

// Get the current round the student should be on
export function getCurrentRound(drive, student) {
  const rounds = getDriveRounds(drive);
  for (const round of rounds) {
    const result = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === round);
    if (!result || result.status !== "Completed") return round;
  }
  return null; // All rounds complete
}

// Check if all configured rounds are completed
export function allRoundsCompleted(drive, student) {
  return getCurrentRound(drive, student) === null;
}

// Calculate overall score with weights
export function calculateOverallScore(drive, student) {
  const rounds = getDriveRounds(drive);
  const weights = drive.scoringWeights || { aptitude: 40, coding: 60 };
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const round of rounds) {
    const result = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === round);
    if (!result || result.status !== "Completed" || result.score === null) continue;
    
    const weight = round === "Aptitude" ? (weights.aptitude || 0) : round === "Coding" ? (weights.coding || 0) : 0;
    const percentage = result.maxScore > 0 ? (result.score / result.maxScore) * 100 : 0;
    weightedScore += percentage * weight / 100;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? Math.round(weightedScore * 100 / totalWeight) : 0;
}

// Determine final result
export function determineFinalResult(drive, student) {
  if (!allRoundsCompleted(drive, student)) return "Pending";
  
  // Check aptitude cutoff
  const aptResult = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === "Aptitude");
  if (aptResult && aptResult.maxScore > 0) {
    const aptPercent = (aptResult.score / aptResult.maxScore) * 100;
    if (aptPercent < Number(drive.aptitudeCutoff || 0)) return "Rejected";
  }
  
  // Check coding cutoff if applicable
  const codingResult = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === "Coding");
  if (codingResult && drive.codingCutoff > 0 && codingResult.maxScore > 0) {
    const codPercent = (codingResult.score / codingResult.maxScore) * 100;
    if (codPercent < drive.codingCutoff) return "Rejected";
  }
  
  return "Qualified";
}
