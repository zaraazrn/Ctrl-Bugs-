// Content script for extracting and analyzing reviews
(function() {
  'use strict';
  
  // Prevent multiple initializations
  if (window.aiReviewDetectorInitialized) {
    console.log('CapSniffer already initialized, skipping...');
    return;
  }
  
  window.aiReviewDetectorInitialized = true;
  console.log('Initializing CapSniffer content script...');

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
      
      console.log('Extracting reviews for site type:', siteType);
      console.log('Using selectors:', selectors);
      
      const reviewElements = document.querySelectorAll(selectors.reviews);
      console.log('Found review elements:', reviewElements.length);
      const reviews = [];

      reviewElements.forEach((reviewEl, index) => {
        try {
          const textEl = reviewEl.querySelector(selectors.text);
          const authorEl = reviewEl.querySelector(selectors.author);
          const ratingEl = reviewEl.querySelector(selectors.rating);
          const dateEl = reviewEl.querySelector(selectors.date);

          console.log(`Review ${index}:`, {
            hasText: !!textEl,
            hasAuthor: !!authorEl,
            hasRating: !!ratingEl,
            hasDate: !!dateEl,
            textContent: textEl ? textEl.textContent.trim().substring(0, 50) + '...' : 'No text'
          });

          if (textEl && textEl.textContent.trim()) {
            reviews.push({
              id: index,
              text: textEl.textContent.trim(),
              author: authorEl ? authorEl.textContent.trim() : 'Anonymous',
              rating: this.extractRating(ratingEl),
              date: dateEl ? dateEl.textContent.trim() : 'Unknown',
              element: reviewEl
            });
          } else {
            console.log(`Skipping review ${index}: no text content`);
          }
        } catch (error) {
          console.error(`Error extracting review ${index}:`, error);
        }
      });

      console.log('Successfully extracted reviews:', reviews.length);
      return reviews;
    }

    extractRating(ratingElement) {
      if (!ratingElement) return 3; // Default neutral rating

      const text = (ratingElement.textContent || ratingElement.getAttribute('title') || ratingElement.getAttribute('aria-label') || '').toLowerCase();
      const match = text.match(/(\d+(?:\.\d+)?)/);
      
      if (match) {
        const rating = parseFloat(match[1]);
        // Ensure rating is within valid range (1-5)
        return Math.max(1, Math.min(5, rating));
      }

      // Check for star classes
      const starClasses = ratingElement.className;
      const starMatch = starClasses.match(/(\d+)-star|star-(\d+)|rating-(\d+)/);
      if (starMatch) {
        const rating = parseInt(starMatch[1] || starMatch[2] || starMatch[3]);
        return Math.max(1, Math.min(5, rating));
      }
      
      // Check for filled stars (count visible star elements)
      const stars = ratingElement.querySelectorAll('.star, [class*="star"]');
      if (stars.length > 0) {
        const filledStars = ratingElement.querySelectorAll('.star.filled, [class*="star"][class*="filled"], [class*="star"][class*="active"]');
        if (filledStars.length > 0) {
          return Math.max(1, Math.min(5, filledStars.length));
        }
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

        if (response && response.success) {
          this.lastAnalysis = response.analysis;
          this.highlightSuspiciousReviews(response.analysis.suspiciousReviews);
          console.log('Analysis successful:', response.analysis);
          
          // Store analysis in storage
          chrome.storage.local.set({
            [`analysis_${window.location.hostname}`]: response.analysis
          });
        } else {
          console.error('Analysis failed:', response ? response.error : 'No response');
        }

        this.isAnalyzing = false;
        return response && response.success ? response.analysis : { error: response ? response.error : 'No response from background script' };
      } catch (error) {
        console.error('Analysis error:', error);
        this.isAnalyzing = false;
        return { error: error.message };
      }
    }

    highlightSuspiciousReviews(suspiciousReviews) {
      if (!suspiciousReviews || suspiciousReviews.length === 0) {
        console.log('No suspicious reviews to highlight');
        return;
      }

      console.log('Highlighting suspicious reviews:', suspiciousReviews.length);
      
      suspiciousReviews.forEach(review => {
        try {
          const reviewElement = document.querySelectorAll(this.selectors[this.detectSite()].reviews)[review.id];
          if (reviewElement) {
            // Add CSS classes instead of inline styles
            reviewElement.classList.add('ai-review-detector-highlight');
            
            // Check if badge already exists
            if (!reviewElement.querySelector('.ai-review-detector-badge')) {
              const badge = document.createElement('div');
              badge.textContent = 'Suspicious';
              badge.className = 'ai-review-detector-badge';
              reviewElement.style.position = 'relative';
              reviewElement.appendChild(badge);
            }
            
            console.log(`Highlighted suspicious review ${review.id}`);
          } else {
            console.warn(`Could not find review element for ID ${review.id}`);
          }
        } catch (error) {
          console.error(`Error highlighting review ${review.id}:`, error);
        }
      });
    }

    getAnalysis() {
      return this.lastAnalysis;
    }
  }

  // Initialize extractor only if not already done
  if (!window.aiReviewExtractor) {
    window.aiReviewExtractor = new ReviewExtractor();
    console.log('ReviewExtractor initialized');
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'getAnalysis') {
      console.log('Getting analysis, cached:', !!window.aiReviewExtractor.getAnalysis());
      if (window.aiReviewExtractor.getAnalysis()) {
        console.log('Returning cached analysis');
        sendResponse({ analysis: window.aiReviewExtractor.getAnalysis() });
      } else {
        console.log('Starting new analysis');
        window.aiReviewExtractor.analyzeReviews().then(analysis => {
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
      window.aiReviewExtractor.lastAnalysis = null;
      window.aiReviewExtractor.analyzeReviews().then(analysis => {
        console.log('Refresh complete:', analysis);
        sendResponse({ analysis });
      }).catch(error => {
        console.error('Refresh error:', error);
        sendResponse({ analysis: { error: error.message } });
      });
      return true;
    }
    
    console.log('Unknown action received:', request.action);
    sendResponse({ error: 'Unknown action: ' + request.action });
    return true;
  });

  // Auto-analyze on page load with better timing
  function initializeAnalysis() {
    console.log('Initializing analysis...');
    console.log('Current URL:', window.location.href);
    console.log('Document ready state:', document.readyState);
    
    setTimeout(() => {
      const reviewElements = document.querySelectorAll('.review, [data-hook="review"], .review-item, .user-review, .customer-review, [class*="review"]');
      console.log('Found review elements:', reviewElements.length);
      
      if (reviewElements.length > 0) {
        console.log('Starting auto-analysis');
        window.aiReviewExtractor.analyzeReviews();
      } else {
        console.log('No review elements found for auto-analysis');
        // Try again with a longer delay for dynamic content
        setTimeout(() => {
          const retryElements = document.querySelectorAll('.review, [data-hook="review"], .review-item, .user-review, .customer-review, [class*="review"]');
          console.log('Retry found review elements:', retryElements.length);
          if (retryElements.length > 0) {
            console.log('Starting delayed auto-analysis');
            window.aiReviewExtractor.analyzeReviews();
          }
        }, 3000);
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

})();