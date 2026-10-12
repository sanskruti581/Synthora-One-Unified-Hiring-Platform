// Standard round order strictly enforces Aptitude -> Coding -> Technical Oral -> HR
export const STANDARD_ROUND_ORDER = ["Aptitude", "Coding", "Technical Oral", "HR"];

// Normalize round names - handles aliases like 'apti', 'coding round', 'technical round', 'HR Interview'
export function normalizeRoundName(name) {
  if (!name) return "Aptitude";
  const lower = String(name).toLowerCase().trim();
  if (lower === "apti" || lower === "aptitude") return "Aptitude";
  if (lower === "coding" || lower === "coding round") return "Coding";
  if (lower === "technical" || lower === "technical oral" || lower === "technical round" || lower === "oral" || lower === "technical oral round") return "Technical Oral";
  if (lower === "hr" || lower === "hr interview") return "HR";
  return name;
}

// Get the strictly ordered rounds for a drive: Aptitude -> Coding -> Technical Oral -> HR
export function getDriveRounds(drive) {
  const rawRounds = (Array.isArray(drive?.rounds) && drive.rounds.length > 0)
    ? drive.rounds
    : ["Aptitude", "Coding", "Technical Oral"];

  const normalized = Array.from(new Set(rawRounds.map(normalizeRoundName)));

  return normalized.sort((a, b) => {
    const idxA = STANDARD_ROUND_ORDER.indexOf(a);
    const idxB = STANDARD_ROUND_ORDER.indexOf(b);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });
}

// Get the first round
export function getFirstRound(drive) {
  const rounds = getDriveRounds(drive);
  return rounds.length > 0 ? rounds[0] : "Aptitude";
}

// Get the next round after a given round in strict sequence
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
// (all previous rounds in the pipeline must be completed)
export function canAccessRound(drive, student, roundName) {
  const rounds = getDriveRounds(drive);
  const targetIndex = rounds.indexOf(normalizeRoundName(roundName));
  if (targetIndex === -1) return false;
  if (targetIndex === 0) return true;
  
  // Check all previous rounds are completed
  for (let i = 0; i < targetIndex; i++) {
    const prevRound = rounds[i];
    const prevResult = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === prevRound);
    
    // Check fallback properties if roundResults entry not found
    let isCompleted = prevResult && prevResult.status === "Completed";
    if (!isCompleted) {
      if (prevRound === "Aptitude" && student.aptitudeScore !== null && student.aptitudeScore !== undefined) {
        isCompleted = true;
      } else if (prevRound === "Coding" && student.codingScore !== null && student.codingScore !== undefined) {
        isCompleted = true;
      } else if (prevRound === "Technical Oral" && student.technicalOralStatus === "Completed") {
        isCompleted = true;
      }
    }

    if (!isCompleted) return false;
  }
  return true;
}

// Get the current round the student should be on
export function getCurrentRound(drive, student) {
  const rounds = getDriveRounds(drive);
  for (const round of rounds) {
    const result = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === round);
    const isCompleted = result?.status === "Completed" || (
      round === "Aptitude" ? (student.aptitudeScore !== null && student.aptitudeScore !== undefined) :
      round === "Coding" ? (student.codingScore !== null && student.codingScore !== undefined) :
      round === "Technical Oral" ? (student.technicalOralStatus === "Completed") : false
    );

    if (!isCompleted) return round;
  }
  return null; // All rounds complete
}

// Check if all configured rounds are completed
export function allRoundsCompleted(drive, student) {
  return getCurrentRound(drive, student) === null;
}

// Calculate overall score with weights across Aptitude, Coding, and Technical Oral
export function calculateOverallScore(drive, student) {
  const rounds = getDriveRounds(drive);
  const weights = drive?.scoringWeights || { aptitude: 30, coding: 40, technical: 30 };
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const round of rounds) {
    const result = (student.roundResults || []).find(r => normalizeRoundName(r.roundName) === round);
    const scoreVal = result?.score ?? (
      round === "Aptitude" ? (student.aptitudeScore ?? student.score) :
      round === "Coding" ? student.codingScore :
      round === "Technical Oral" ? student.technicalOralScore : null
    );

    if (scoreVal === null || scoreVal === undefined) continue;

    const weight = round === "Aptitude" ? (weights.aptitude || 30) :
                   round === "Coding" ? (weights.coding || 40) :
                   round === "Technical Oral" ? (weights.technical || 30) : 10;

    const maxScore = result?.maxScore || 100;
    const percentage = maxScore > 0 ? (scoreVal / maxScore) * 100 : scoreVal;
    weightedScore += percentage * weight / 100;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? Math.round(weightedScore * 100 / totalWeight) : 0;
}

// Determine final result
export function determineFinalResult(drive, student) {
  // Check aptitude cutoff
  const aptScore = student.aptitudeScore ?? student.score;
  if (typeof aptScore === "number" && aptScore < Number(drive.aptitudeCutoff || 0)) {
    return "Rejected";
  }

  // Check coding cutoff if applicable
  if (drive.codingCutoff > 0 && typeof student.codingScore === "number" && student.codingScore < Number(drive.codingCutoff)) {
    return "Rejected";
  }

  // Check technical oral cutoff if applicable
  const oralCutoff = drive.technicalOralCutoff ?? 60;
  if (oralCutoff > 0 && typeof student.technicalOralScore === "number" && student.technicalOralScore < Number(oralCutoff)) {
    return "Rejected";
  }

  if (!allRoundsCompleted(drive, student)) {
    return "Pending";
  }

  return "Qualified";
}
