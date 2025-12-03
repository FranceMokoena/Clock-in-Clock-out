# 🚨 Critical Data Quality Issue - Action Plan

## Problem Summary
**Impostor mean (67.78%) is HIGHER than genuine mean (62.37%)**

This means staff members are more similar to each other than they are to themselves across different images. This is a serious data quality issue that will cause:
- ❌ False positives (wrong person accepted)
- ❌ False negatives (correct person rejected)
- ❌ Unreliable matching

## Root Causes
1. **Low-quality registration images** (blurry, poor lighting)
2. **Similar appearances** (family members, similar features)
3. **Insufficient diversity** in registration images (same angle/lighting)
4. **Small sample size** (only 6 impostor pairs for calibration)

## Immediate Actions Required

### 1. ✅ Current System Status
- **Fusion/gap fixes are applied** - these will help with matching logic
- **Current thresholds (68-75%) are appropriate** - don't increase them yet
- **System will work but accuracy will be limited** by data quality

### 2. 🔄 Re-register All Staff (HIGH PRIORITY)

**For each staff member, capture 5 HIGH-QUALITY images:**

#### Image Quality Requirements:
- ✅ **Sharp & in-focus** - No blur, face clearly visible
- ✅ **Good lighting** - Face evenly lit, no shadows
- ✅ **High resolution** - At least 600px width (prefer 1200px+)
- ✅ **Neutral expression** - Natural, not smiling/frowning
- ✅ **Face centered** - Face in middle of frame
- ✅ **No obstructions** - No glasses, masks, or hands covering face

#### Diversity Requirements (5 different images):
1. **Front-facing** - Looking directly at camera
2. **Slight left** - Head turned ~15° left
3. **Slight right** - Head turned ~15° right
4. **Slight up** - Head tilted up ~10°
5. **Slight down** - Head tilted down ~10°

#### Lighting Requirements:
- ✅ **Natural or bright indoor lighting**
- ✅ **No backlighting** (don't stand in front of window)
- ✅ **No harsh shadows** on face
- ✅ **Consistent lighting** across all 5 images

### 3. 📊 After Re-registration

Run calibration again:
```bash
node scripts/calibrateThresholds.js
```

**Expected improvements:**
- Genuine mean should be **>75%** (currently 62.37%)
- Impostor mean should be **<50%** (currently 67.78%)
- Separation should be **>25%** (currently -5.41% - NEGATIVE!)

### 4. 🎯 Threshold Adjustment (After Data Quality Improves)

Once data quality improves:
- **If genuine mean > 75% and impostor mean < 50%:**
  - Daily threshold: 70-75% (current is good)
  - Enrollment threshold: 75-80% (current is good)

- **If separation is still poor (<15%):**
  - Keep current thresholds (68-75%)
  - Continue improving registration quality

## Testing Checklist

After re-registration, test with:
- [ ] Same person, different lighting
- [ ] Same person, different angle
- [ ] Different person (should be rejected)
- [ ] Edge cases (glasses, different expression)

## Monitoring

Watch for these in logs:
- ✅ **High baseSimilarity** (80%+) for correct matches
- ❌ **Low baseSimilarity** (<70%) for correct matches (indicates poor registration)
- ❌ **High similarity** (>70%) between different people (indicates poor separation)

## Current System Status

✅ **Fusion fixes applied** - Face scores won't be unfairly reduced
✅ **Gap rules improved** - Better handling of ambiguous matches
✅ **Thresholds appropriate** - 68-75% range is good for current data quality
⚠️ **Data quality limits accuracy** - Re-registration is critical

---

**Next Step:** Re-register all staff with high-quality, diverse images, then re-run calibration.

