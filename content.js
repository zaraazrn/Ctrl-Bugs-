// Content script for extracting and analyzing reviews
class ReviewExtractor {
  constructor() {
    this.selectors = {
      // Amazon
      amazon: {
        reviews: '[data-hook="review"], .review-item, .cr-original-review-item',
        text: '[data-hook="review-body"] span, .review-text, .cr-original-review-body',
        author: '[data-hook="review-author"], .review-author, .cr-original-review-author',
        rating: '[data-hook="review-star-rating"], .review-rating, .cr-original-review-rating',
        date: '[data-hook="review-date"], .review-date, .cr-original-review-date'
      },
      // Generic selectors for other sites
      generic: {
        reviews: '.review, .review-item, .user-review, .customer-review, [class*="review"]',
        text: '.review-text, .review-body, .review-content, .comment-text, p',
        author: '.review-author, .reviewer-name, .user-name, .author-name',
        rating: '.rating, .stars, .score, [class*="star"], [class*="rating"]',
        date: '.review-date, .date, .timestamp, [class*="date"]'
      }
    };
    
    this.isAnalyzing = false;
    this.lastAnalysis = null;
  }

  detectSite() {
    const hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes('amazon')) return 'amazon';
    return 'generic';
  }

  extractReviews() {
    const siteType = this.detectSite();
    const selectors = this.selectors[siteType];
    
    const reviewElements = document.querySelectorAll(selectors.reviews);
    const reviews = [];

    reviewElements.forEach((reviewEl, index) => {
      try {
        const textEl = reviewEl.querySelector(selectors.text);
        const authorEl = reviewEl.querySelector(selectors.author);
        const ratingEl = reviewEl.querySelector(selectors.rating);
        const dateEl = reviewEl.querySelector(selectors.date);

        if (textEl && textEl.textContent.trim()) {
          reviews.push({
            id: index,
            text: textEl.textContent.trim(),
            author: authorEl ? authorEl.textContent.trim() : 'Anonymous',
            rating: this.extractRating(ratingEl),
            date: dateEl ? dateEl.textContent.trim() : 'Unknown',
            element: reviewEl
          });
        }
      } catch (error) {
        console.log('Error extracting review:', error);
      }
    });

    return reviews;
  }

  extractRating(ratingElement) {
    if (!ratingElement) return 3; // Default neutral rating

    const text = ratingElement.textContent || ratingElement.getAttribute('title') || '';
    const match = text.match(/(\d+(?:\.\d+)?)/);
    
    if (match) {
      return parseFloat(match[1]);
    }

    // Check for star classes
    const starClasses = ratingElement.className;
    const starMatch = starClasses.match(/(\d+)-star|star-(\d+)|rating-(\d+)/);
    if (starMatch) {
      return parseInt(starMatch[1] || starMatch[2] || starMatch[3]);
    }

    return 3;
  }

  async analyzeReviews() {
    if (this.isAnalyzing) return this.lastAnalysis;

    this.isAnalyzing = true;
    console.log('Starting review analysis...');
    
    try {
      const reviews = this.extractReviews();
      console.log('Extracted reviews:', reviews.length);
      
      if (reviews.length === 0) {
        this.isAnalyzing = false;
        console.log('No reviews found');
        return { error: 'No reviews found on this page' };
      }

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Background script timeout'));
        }, 10000);
        
        chrome.runtime.sendMessage({
          action: 'analyzeReviews',
          reviews: reviews
        }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      if (response.success) {
        this.lastAnalysis = response.analysis;
        this.highlightSuspiciousReviews(response.analysis.suspiciousReviews);
        console.log('Analysis successful:', response.analysis);
        
        // Store analysis in storage
        chrome.storage.local.set({
          [`analysis_${window.location.hostname}`]: response.analysis
        });
      } else {
        console.error('Analysis failed:', response.error);
      }

      this.isAnalyzing = false;
      return response.success ? response.analysis : { error: response.error };
    } catch (error) {
      console.error('Analysis error:', error);
      this.isAnalyzing = false;
      return { error: error.message };
    }
  }

  highlightSuspiciousReviews(suspiciousReviews) {
    suspiciousReviews.forEach(review => {
      const reviewElement = document.querySelectorAll(this.selectors[this.detectSite()].reviews)[review.id];
      if (reviewElement) {
        reviewElement.style.border = '2px solid #ff6b6b';
        reviewElement.style.backgroundColor = '#fff5f5';
        reviewElement.style.borderRadius = '4px';
        
        // Add warning badge
        const badge = document.createElement('div');
        badge.textContent = 'Suspicious';
        badge.style.cssText = `
          position: absolute;
          top: 5px;
          right: 5px;
          background: #ff6b6b;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: bold;
          z-index: 1000;
        `;
        reviewElement.style.position = 'relative';
        reviewElement.appendChild(badge);
      }
    });
  }

  getAnalysis() {
    return this.lastAnalysis;
  }
}

// Initialize extractor
const extractor = new ReviewExtractor();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'getAnalysis') {
    if (extractor.getAnalysis()) {
      console.log('Returning cached analysis');
      sendResponse({ analysis: extractor.getAnalysis() });
    } else {
      console.log('Starting new analysis');
      extractor.analyzeReviews().then(analysis => {
        console.log('Analysis complete:', analysis);
        sendResponse({ analysis });
      }).catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ analysis: { error: error.message } });
      });
    }
    return true;
  }
  
  if (request.action === 'refreshAnalysis') {
    console.log('Refreshing analysis');
    extractor.lastAnalysis = null;
    extractor.analyzeReviews().then(analysis => {
      console.log('Refresh complete:', analysis);
      sendResponse({ analysis });
    }).catch(error => {
      console.error('Refresh error:', error);
      sendResponse({ analysis: { error: error.message } });
    });
    return true;
  }
  
  // Send response for unknown actions
  sendResponse({ error: 'Unknown action' });
  return true;
});

// Auto-analyze on page load with better timing
function initializeAnalysis() {
  console.log('Initializing analysis...');
  setTimeout(() => {
    const reviewElements = document.querySelectorAll('.review, [data-hook="review"], .review-item, .user-review, .customer-review, [class*="review"]');
    console.log('Found review elements:', reviewElements.length);
    
    if (reviewElements.length > 0) {
      console.log('Starting auto-analysis');
      extractor.analyzeReviews();
    } else {
      console.log('No review elements found for auto-analysis');
    }
  }, 2000);
}

// Multiple initialization triggers
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAnalysis);
} else {
  initializeAnalysis();
}

// Also try when page is fully loaded
window.addEventListener('load', () => {
  setTimeout(initializeAnalysis, 1000);
});