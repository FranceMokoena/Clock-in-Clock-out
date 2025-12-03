/**
 * Staff Cache - In-Memory Cache for Fast Staff Retrieval
 * 
 * This cache stores staff embeddings in memory to avoid database queries
 * on every clock-in request. This provides bank-level speed improvements.
 * 
 * Features:
 * - Automatic cache refresh every 5 minutes
 * - Manual cache invalidation on staff updates
 * - Fallback to database if cache miss
 * - Thread-safe (single instance)
 */

const Staff = require('../models/Staff');

class StaffCache {
  constructor() {
    this.data = null;
    this.lastUpdate = null;
    this.ttl = 2 * 60 * 1000; // 2 minutes TTL (reduced for fresher data in admin dashboard)
    this.isLoading = false;
    this.loadPromise = null;
  }

  /**
   * Get all active staff members (from cache or database)
   * @returns {Promise<Array>} Array of staff members with embeddings
   */
  async getStaff() {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.data && (now - this.lastUpdate) < this.ttl) {
      console.log('📦 Using cached staff data (fast path)');
      return this.data;
    }
    
    // If already loading, wait for that promise
    if (this.isLoading && this.loadPromise) {
      console.log('⏳ Waiting for ongoing staff cache load...');
      return await this.loadPromise;
    }
    
    // Load from database
    this.isLoading = true;
    this.loadPromise = this._loadFromDatabase();
    
    try {
      const result = await this.loadPromise;
      return result;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Load staff from database and prepare embeddings
   * @private
   */
  async _loadFromDatabase() {
    console.log('🔄 Loading staff from database (cache refresh)...');
    const startTime = Date.now();
    
    try {
      // Fetch all active staff
      const allStaff = await Staff.find({ isActive: true });
      
      // Process embeddings (support both old and new formats)
      const staffWithEmbeddings = allStaff.map(staff => {
        try {
          const staffObj = staff.toObject();
          
          // Support new format: multiple embeddings per person
          let faceEmbeddings = [];
          
          if (staffObj.faceEmbeddings && Array.isArray(staffObj.faceEmbeddings) && staffObj.faceEmbeddings.length > 0) {
            // Use multiple embeddings (new format)
            faceEmbeddings = staffObj.faceEmbeddings;
          } else {
            // Fall back to single embedding (old format)
            let decryptedEmbedding = staffObj.faceEmbedding;
            
            if (!decryptedEmbedding || !Array.isArray(decryptedEmbedding) || decryptedEmbedding.length === 0) {
              // Try to decrypt if faceEmbedding is not available
              if (staffObj.encryptedEmbedding) {
                decryptedEmbedding = Staff.decryptEmbedding(staffObj.encryptedEmbedding);
              }
            }
            
            if (decryptedEmbedding && Array.isArray(decryptedEmbedding) && decryptedEmbedding.length > 0) {
              faceEmbeddings = [decryptedEmbedding];
            }
          }
          
          if (faceEmbeddings.length === 0) {
            console.warn(`⚠️ No valid embeddings for ${staffObj.name}`);
            return null;
          }
          
          // CRITICAL: Only accept 512-d embeddings (ONNX ArcFace)
          // Reject 128-d embeddings (old face-api.js) - they must re-register
          const validEmbeddings = faceEmbeddings.filter(emb => {
            if (!Array.isArray(emb)) return false;
            if (emb.length === 128) {
              console.error(`❌ ${staffObj.name}: Found 128-d embedding (old face-api.js). This staff member must be deleted and re-registered with ONNX (512-d).`);
              return false;
            }
            return emb.length === 512;
          });
          
          if (validEmbeddings.length === 0) {
            console.error(`❌ ${staffObj.name}: No valid 512-d embeddings (found ${faceEmbeddings.length} embeddings, but none are 512-d ArcFace)`);
            console.error(`   ACTION REQUIRED: Delete and re-register this staff member.`);
            return null;
          }
          
          if (validEmbeddings.length < faceEmbeddings.length) {
            const rejected = faceEmbeddings.length - validEmbeddings.length;
            console.warn(`⚠️ ${staffObj.name}: Rejected ${rejected} invalid/old embedding(s) (must be 512-d ArcFace)`);
          }
          
          // Verify first embedding is normalized
          if (validEmbeddings[0] && validEmbeddings[0].length === 512) {
            const norm = Math.sqrt(validEmbeddings[0].reduce((sum, val) => sum + val * val, 0));
            if (Math.abs(norm - 1.0) > 0.1) {
              console.warn(`⚠️ ${staffObj.name}: First embedding not normalized (norm=${norm.toFixed(3)})`);
            }
          }
          
          return {
            ...staffObj,
            faceEmbeddings: validEmbeddings,
            decryptedEmbedding: validEmbeddings[0], // Keep for backward compatibility
            faceEmbedding: validEmbeddings[0] // Keep for backward compatibility
          };
        } catch (decryptError) {
          console.error(`⚠️ Error processing embeddings for ${staff.name}:`, decryptError?.message || decryptError);
          return null;
        }
      }).filter(staff => staff !== null && staff.faceEmbeddings && Array.isArray(staff.faceEmbeddings) && staff.faceEmbeddings.length > 0);
      
      // Update cache
      this.data = staffWithEmbeddings;
      this.lastUpdate = Date.now();
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Staff cache refreshed: ${staffWithEmbeddings.length} staff members loaded in ${loadTime}ms`);
      
      return staffWithEmbeddings;
    } catch (error) {
      console.error('❌ Error loading staff cache:', error);
      // Return cached data if available, even if expired
      if (this.data) {
        console.warn('⚠️ Using expired cache due to database error');
        return this.data;
      }
      throw error;
    }
  }

  /**
   * Invalidate cache (force refresh on next request)
   */
  invalidate() {
    console.log('🔄 Invalidating staff cache...');
    this.data = null;
    this.lastUpdate = null;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      hasData: !!this.data,
      staffCount: this.data ? this.data.length : 0,
      lastUpdate: this.lastUpdate ? new Date(this.lastUpdate).toISOString() : null,
      age: this.lastUpdate ? Date.now() - this.lastUpdate : null,
      isExpired: this.lastUpdate ? (Date.now() - this.lastUpdate) > this.ttl : true,
      ttl: this.ttl
    };
  }

  /**
   * Preload cache on server startup
   */
  async preload() {
    console.log('🚀 Preloading staff cache...');
    try {
      await this.getStaff();
      console.log('✅ Staff cache preloaded successfully');
    } catch (error) {
      console.error('⚠️ Failed to preload staff cache:', error.message);
      // Don't throw - server can still start, cache will load on first request
    }
  }

  /**
   * Start background refresh (auto-refresh every TTL)
   */
  startBackgroundRefresh() {
    // Refresh cache every TTL period
    setInterval(() => {
      if (this.data) {
        // Only refresh if cache exists (don't spam on startup)
        this.invalidate();
        this.getStaff().catch(err => {
          console.error('⚠️ Background cache refresh failed:', err.message);
        });
      }
    }, this.ttl);
    
    console.log(`🔄 Background cache refresh enabled (every ${this.ttl / 1000}s)`);
  }
}

// Export singleton instance
const staffCache = new StaffCache();

module.exports = staffCache;

