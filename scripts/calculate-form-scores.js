/**
 * Form scoring calculation utilities
 * These functions calculate scores for different form types (MOXFQ, AOFAS, EFAS)
 * Used by backend to initialize mock data with proper scoring structures
 */

/**
 * Calculate MOXFQ score from form data
 * @param {Object} data - Form data with question responses (may be nested in 'moxfq' section or flat)
 * @returns {Object} ScoringData structure
 */
function calculateMoxfqScore(data) {
  // Handle nested structure (e.g., { moxfq: { q1: 0, q2: 1, ... } })
  // Extract questions from 'moxfq' section if present, otherwise use data directly
  const questions = data.moxfq || data;

  // Define subscales according to MOXFQ standard
  const subscales = {
    walkingStanding: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"],
    pain: ["q9", "q11", "q12", "q15"],
    socialInteraction: ["q10", "q13", "q14", "q16"],
  };

  // Calculate subscale scores
  const calculateSubscaleScore = (questionKeys, subscaleName, subscaleDescription) => {
    const validAnswers = questionKeys
      .map((key) => questions[key])
      .filter((value) => value !== null && value !== undefined);

    if (validAnswers.length === 0) return null;

    const rawScore = validAnswers.reduce((sum, value) => sum + value, 0);
    const maxPossibleScore = questionKeys.length * 4;
    const completionRate = validAnswers.length / questionKeys.length;

    // Convert to 0-100 scale: (rawScore / maxPossibleScore) * 100
    const normalizedScore = (rawScore / maxPossibleScore) * 100;

    return {
      name: subscaleName,
      description: subscaleDescription,
      rawScore,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      maxPossibleScore,
      answeredQuestions: validAnswers.length,
      totalQuestions: questionKeys.length,
      completionPercentage: Math.round(completionRate * 100),
      isComplete: completionRate === 1,
    };
  };

  // Calculate individual subscale scores
  const walkingStandingScore = calculateSubscaleScore(
    subscales.walkingStanding,
    "Walking & Standing",
    "Assesses difficulties in walking and standing.",
  );
  const painScore = calculateSubscaleScore(subscales.pain, "Pain", "Evaluates pain levels and impact.");
  const socialInteractionScore = calculateSubscaleScore(
    subscales.socialInteraction,
    "Social Interaction",
    "Measures social engagement and interaction.",
  );

  // Calculate total score
  const allQuestions = [...subscales.walkingStanding, ...subscales.pain, ...subscales.socialInteraction];
  const totalScore = calculateSubscaleScore(allQuestions, "Total", "Measures overall health status.");

  return {
    rawData: data,
    subscales: {
      walkingStanding: walkingStandingScore,
      pain: painScore,
      socialInteraction: socialInteractionScore,
    },
    total: totalScore,
  };
}

/**
 * Calculate AOFAS score from form data
 * @param {Object} data - Form data with question responses (nested by section)
 * @returns {Object} ScoringData structure
 */
function calculateAofasScore(data) {
  // AOFAS has a single section but we need to handle nested structure
  const sectionKey = Object.keys(data)[0]; // e.g., 'vorfußfragebogen'
  const questions = data[sectionKey] || {};

  const questionKeys = Object.keys(questions);
  const validAnswers = questionKeys
    .map((key) => questions[key])
    .filter((value) => value !== null && value !== undefined);

  if (questionKeys.length === 0) {
    // No questions at all
    return {
      rawData: data,
      subscales: {},
      total: null,
    };
  }

  if (validAnswers.length === 0) {
    // Questions exist, but no valid answers
    return {
      rawData: data,
      subscales: {},
      total: {
        name: "AOFAS Total",
        description: "American Orthopedic Foot & Ankle Society Score",
        rawScore: null,
        normalizedScore: null,
        maxPossibleScore: 100,
        answeredQuestions: 0,
        totalQuestions: questionKeys.length,
        completionPercentage: 0,
        isComplete: false,
      },
    };
  }

  const rawScore = validAnswers.reduce((sum, value) => sum + value, 0);

  // AOFAS max score is 100 (based on clinical standard)
  // Each question has different max values, but total is always 100
  const maxPossibleScore = 100;
  const completionRate = validAnswers.length / questionKeys.length;
  const normalizedScore = (rawScore / maxPossibleScore) * 100;

  const totalScore = {
    name: "AOFAS Total",
    description: "American Orthopedic Foot & Ankle Society Score",
    rawScore,
    normalizedScore: Math.round(normalizedScore * 100) / 100,
    maxPossibleScore,
    answeredQuestions: validAnswers.length,
    totalQuestions: questionKeys.length,
    completionPercentage: Math.round(completionRate * 100),
    isComplete: completionRate === 1,
  };

  return {
    rawData: data,
    subscales: {}, // AOFAS doesn't have subscales
    total: totalScore,
  };
}

/**
 * Calculate EFAS score from form data
 * @param {Object} data - Form data with question responses (nested by section)
 * @returns {Object} ScoringData structure
 */
function calculateEfasScore(data) {
  // EFAS has two sections: standardfragebogen and sportfragebogen
  const sections = ["standardfragebogen", "sportfragebogen"];

  const subscaleScores = {};
  let allQuestions = [];

  sections.forEach((sectionKey) => {
    const questions = data[sectionKey] || {};
    const questionKeys = Object.keys(questions);
    allQuestions = [...allQuestions, ...questionKeys];

    const validAnswers = questionKeys
      .map((key) => questions[key])
      .filter((value) => value !== null && value !== undefined);

    if (questionKeys.length === 0) {
      // No questions in this section, set subscale to null
      subscaleScores[sectionKey] = null;
      return;
    }

    if (validAnswers.length > 0) {
      const rawScore = validAnswers.reduce((sum, value) => sum + value, 0);
      const maxPossibleScore = questionKeys.length * 5; // EFAS uses 0-5 scale
      const completionRate = validAnswers.length / questionKeys.length;
      const normalizedScore = (rawScore / maxPossibleScore) * 100;

      subscaleScores[sectionKey] = {
        name: sectionKey === "standardfragebogen" ? "Standard Questions" : "Sport Questions",
        description: sectionKey === "standardfragebogen" ? "Daily activity questions" : "Sports-specific questions",
        rawScore,
        normalizedScore: Math.round(normalizedScore * 100) / 100,
        maxPossibleScore,
        answeredQuestions: validAnswers.length,
        totalQuestions: questionKeys.length,
        completionPercentage: Math.round(completionRate * 100),
        isComplete: completionRate === 1,
      };
    } else {
      // No valid answers, but questions exist: fill with null or default structure
      subscaleScores[sectionKey] = {
        name: sectionKey === "standardfragebogen" ? "Standard Questions" : "Sport Questions",
        description: sectionKey === "standardfragebogen" ? "Daily activity questions" : "Sports-specific questions",
        rawScore: null,
        normalizedScore: null,
        maxPossibleScore: questionKeys.length * 4,
        answeredQuestions: 0,
        totalQuestions: questionKeys.length,
        completionPercentage: 0,
        isComplete: false,
      };
    }
  });

  // Calculate total across all sections
  const allValidAnswers = [];
  const allQuestionsList = [];

  sections.forEach((sectionKey) => {
    const questions = data[sectionKey] || {};
    const questionKeys = Object.keys(questions);
    allQuestionsList.push(...questionKeys);

    questionKeys.forEach((key) => {
      const value = questions[key];
      if (value !== null && value !== undefined) {
        allValidAnswers.push(value);
      }
    });
  });

  let totalScore = null;
  if (allValidAnswers.length > 0) {
    const rawScore = allValidAnswers.reduce((sum, value) => sum + value, 0);
    const maxPossibleScore = allQuestionsList.length * 5;
    const completionRate = allValidAnswers.length / allQuestionsList.length;
    const normalizedScore = (rawScore / maxPossibleScore) * 100;

    totalScore = {
      name: "EFAS Total",
      description: "European Foot and Ankle Society Score",
      rawScore,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      maxPossibleScore,
      answeredQuestions: allValidAnswers.length,
      totalQuestions: allQuestionsList.length,
      completionPercentage: Math.round(completionRate * 100),
      isComplete: completionRate === 1,
    };
  }

  return {
    rawData: data,
    subscales: subscaleScores,
    total: totalScore,
  };
}

// Export functions for use in Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateMoxfqScore,
    calculateAofasScore,
    calculateEfasScore,
  };
}
