// Background service worker for AI Review Detector
class ReviewAnalyzer {
  constructor() {
    this.initializeAI();
  }

  initializeAI() {
    // Initialize AI models and patterns
    this.suspiciousPatterns = {
      generic: [
        'great product', 'highly recommend', 'amazing quality',
        'perfect', 'excellent', 'outstanding', 'fantastic',
        'love it', 'best purchase', 'worth every penny'
      ],
      repetitive: /(.{10,})\1{2,}/gi,
      excessive: /[!]{3,}|[A-Z]{10,}|amazing|perfect|excellent|outstanding/gi,
      grammarIssues: /\b(it's|its|there|their|you're|your)\b/gi
    };

    this.sentimentWords = {
      positive: ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'recommend', 'quality', 'fast', 'easy'],
      negative: ['bad', 'terrible', 'awful', 'hate', 'slow', 'difficult', 'poor', 'waste', 'disappointed', 'broken']
    };
  }

  analyzeReview(review) {
    const suspiciousScore = this.calculateSuspiciousScore(review);
    const sentiment = this.analyzeSentiment(review);
    const confidence = this.calculateConfidence(review);
    
    return {
      text: review.text,
      author: review.author,
      date: review.date,
      rating: review.rating,
      isSuspicious: suspiciousScore > 0.6,
      suspiciousScore,
      sentiment,
      confidence,
      flags: this.getFlags(review, suspiciousScore)
    };
  }

  calculateSuspiciousScore(review) {
    let score = 0;
    const text = review.text.toLowerCase();

    // Check for generic phrases
    const genericMatches = this.suspiciousPatterns.generic.filter(phrase => 
      text.includes(phrase.toLowerCase())
    ).length;
    score += Math.min(genericMatches * 0.2, 0.4);

    // Check for repetitive content
    if (this.suspiciousPatterns.repetitive.test(text)) {
      score += 0.3;
    }

    // Check for excessive enthusiasm
    const excessiveMatches = (text.match(this.suspiciousPatterns.excessive) || []).length;
    score += Math.min(excessiveMatches * 0.1, 0.3);

    // Check review length (too short or too long)
    if (text.length < 20 || text.length > 1000) {
      score += 0.2;
    }

    // Check for new account patterns
    if (review.author && (review.author.includes('user') || review.author.length < 3)) {
      score += 0.2;
    }

    // Check rating vs sentiment alignment
    const sentimentScore = this.calculateSentimentScore(text);
    const ratingScore = (review.rating - 1) / 4; // Normalize to 0-1
    if (Math.abs(sentimentScore - ratingScore) > 0.4) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  analyzeSentiment(review) {
    const text = review.text.toLowerCase();
    const sentimentScore = this.calculateSentimentScore(text);
    
    if (sentimentScore > 0.6) return 'positive';
    if (sentimentScore < 0.4) return 'negative';
    return 'neutral';
  }

  calculateSentimentScore(text) {
    let score = 0.5; // Neutral baseline
    
    this.sentimentWords.positive.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = (text.match(regex) || []).length;
      score += matches * 0.1;
    });

    this.sentimentWords.negative.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = (text.match(regex) || []).length;
      score -= matches * 0.1;
    });

    return Math.max(0, Math.min(1, score));
  }

  calculateConfidence(review) {
    let confidence = 0.7; // Base confidence
    
    // Higher confidence for longer, detailed reviews
    if (review.text.length > 100) confidence += 0.1;
    if (review.text.length > 200) confidence += 0.1;
    
    // Lower confidence for very short reviews
    if (review.text.length < 30) confidence -= 0.2;
    
    return Math.max(0.1, Math.min(1, confidence));
  }

  getFlags(review, suspiciousScore) {
    const flags = [];
    const text = review.text.toLowerCase();

    if (suspiciousScore > 0.6) {
      if (this.suspiciousPatterns.generic.some(phrase => text.includes(phrase.toLowerCase()))) {
        flags.push('Generic Language');
      }
      if (this.suspiciousPatterns.repetitive.test(text)) {
        flags.push('Repetitive Content');
      }
      if ((text.match(this.suspiciousPatterns.excessive) || []).length > 3) {
        flags.push('Excessive Enthusiasm');
      }
      if (text.length < 20) {
        flags.push('Too Short');
      }
      if (review.author && review.author.length < 3) {
        flags.push('Suspicious Username');
      }
    }

    return flags;
  }

  analyzeAllReviews(reviews) {
    const analyzed = reviews.map(review => this.analyzeReview(review));
    const authentic = analyzed.filter(r => !r.isSuspicious);
    const suspicious = analyzed.filter(r => r.isSuspicious);

    const sentimentBreakdown = {
      positive: authentic.filter(r => r.sentiment === 'positive').length,
      negative: authentic.filter(r => r.sentiment === 'negative').length,
      neutral: authentic.filter(r => r.sentiment === 'neutral').length
    };

    const recommendation = this.generateRecommendation(authentic, suspicious);

    return {
      total: analyzed.length,
      authentic: authentic.length,
      suspicious: suspicious.length,
      fakePercentage: (suspicious.length / analyzed.length * 100).toFixed(1),
      sentimentBreakdown,
      recommendation,
      suspiciousReviews: suspicious,
      authenticReviews: authentic,
      overallConfidence: this.calculateOverallConfidence(analyzed)
    };
  }

  generateRecommendation(authentic, suspicious) {
    if (authentic.length === 0) {
      return {
        decision: 'proceed_with_caution',
        confidence: 0.3,
        reason: 'No authentic reviews found to analyze'
      };
    }

    const positiveRatio = authentic.filter(r => r.sentiment === 'positive').length / authentic.length;
    const fakeRatio = suspicious.length / (authentic.length + suspicious.length);

    let decision = 'proceed_with_caution';
    let confidence = 0.5;
    let reason = '';

    if (fakeRatio > 0.4) {
      decision = 'not_recommended';
      confidence = 0.8;
      reason = 'High percentage of fake reviews detected';
    } else if (positiveRatio > 0.7 && fakeRatio < 0.2) {
      decision = 'recommended';
      confidence = 0.9;
      reason = 'Mostly positive authentic reviews';
    } else if (positiveRatio < 0.3) {
      decision = 'not_recommended';
      confidence = 0.8;
      reason = 'Mostly negative authentic reviews';
    } else {
      reason = 'Mixed reviews, consider carefully';
    }

    return { decision, confidence, reason };
  }

  calculateOverallConfidence(analyzed) {
    const avgConfidence = analyzed.reduce((sum, r) => sum + r.confidence, 0) / analyzed.length;
    return Math.round(avgConfidence * 100);
  }
}

// Initialize analyzer
const analyzer = new ReviewAnalyzer();

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeReviews') {
    try {
      const analysis = analyzer.analyzeAllReviews(request.reviews);
      sendResponse({ success: true, analysis });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

// Storage management
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    analysisHistory: [],
    settings: {
      autoAnalyze: true,
      confidenceThreshold: 0.7
    }
  });
});