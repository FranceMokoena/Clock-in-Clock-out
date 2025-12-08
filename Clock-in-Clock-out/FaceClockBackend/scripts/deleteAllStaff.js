/**
 * Staff Management Script
 * --------------------------------------
 * Supports:
 *   --view                View all staff
 *   --delete-all          Delete ALL staff
 *   --include-logs        (optional) also delete clock logs
 *   --delete-id <id>      Delete one staff by MongoDB _id
 *   --delete-name "<name>" Delete staff by partial name
 * 
 * Usage examples:
 *   node staffManager.js --view
 *   node staffManager.js --delete-all --include-logs
 *   node staffManager.js --delete-id 65ab12cd34ef
 *   node staffManager.js --delete-name "john"
 *   node FaceClockBackend/scripts/deleteAllStaff.js --view
 *   node scripts/deleteAllStaff.js --delete-all --include-logs
 *   node FaceClockBackend/scripts/deleteAllStaff.js --delete-id 65ab12cd34ef
 *   node FaceClockBackend/📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 73066 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=16.5, Sharpness=3.3%
   ✅ Image enhanced: sharpness improved from 3.3% to 23.0%
   📊 After: Variance=115.1, Sharpness=23.0%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.2%, Sharpness=23.0%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (268ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 76.9%, 69.4%, 56.3%, 47.0%, 46.2%, 41.8%, 40.6%, 29.0%, 25.6%, 18.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.573, 79.765, 64.415, 83.635])
   📊 Found 3 detections above threshold (50.0%)
   🔍 Detection 420: ✓ PASS - score=69.4%, size=434x635px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=76.9%, size=440x531px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=56.3%, size=342x541px (min: 85px)
   ✅ Found 3 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 72.9%, scores: 76.9% vs 69.4%)
   🔄 Suppressed duplicate detection (IoU: 56.9%, scores: 76.9% vs 56.3%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 76.9%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=440px, Quality=76.9%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2350ms, ready: true, quality: 76.9%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 77,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:43:14.806Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=22a50ab7-c775-4370-af64-d5b5e07be2c5',
  'content-length': '76018',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 75813 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=17.7, Sharpness=3.5%
   ✅ Image enhanced: sharpness improved from 3.5% to 24.4%
   📊 After: Variance=121.8, Sharpness=24.4%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=59.3%, Sharpness=24.4%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 59ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (287ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 71.7%, 71.6%, 69.5%, 69.0%, 37.9%, 36.4%, 32.6%, 31.3%, 27.5%, 23.3%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.603, 79.498, 64.544, 83.414])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 418: ✓ PASS - score=71.7%, size=496x683px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=71.6%, size=389x685px (min: 85px)
   🔍 Detection 458: ✓ PASS - score=69.0%, size=500x581px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=69.5%, size=392x587px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 58.4%, scores: 71.7% vs 71.6%)
   🔄 Suppressed duplicate detection (IoU: 46.9%, scores: 71.7% vs 69.5%)
   🔄 Suppressed duplicate detection (IoU: 75.2%, scores: 71.7% vs 69.0%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 71.7%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=496px, Quality=71.7%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2417ms, ready: true, quality: 71.7%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 72,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:43:17.753Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=c92cb9fb-228d-4fd5-bd31-04bb86e9d0f7',
  'content-length': '77169',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 76964 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=17.8, Sharpness=3.6%
   ✅ Image enhanced: sharpness improved from 3.6% to 24.6%
   📊 After: Variance=123.0, Sharpness=24.6%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=58.5%, Sharpness=24.6%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 61ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (262ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 75.2%, 61.9%, 60.3%, 53.8%, 48.1%, 39.4%, 37.2%, 23.8%, 23.7%, 20.5%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.417, 77.703, 62.673, 81.057])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=53.8%, size=484x751px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=75.2%, size=487x660px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=61.9%, size=379x662px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=60.3%, size=494x558px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 57.0%, scores: 75.2% vs 61.9%)
   🔄 Suppressed duplicate detection (IoU: 75.2%, scores: 75.2% vs 60.3%)
   🔄 Suppressed duplicate detection (IoU: 82.2%, scores: 75.2% vs 53.8%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 75.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=487px, Quality=75.2%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2393ms, ready: true, quality: 75.2%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 75,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:43:20.885Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=b8eae15e-1789-4d0a-9ee6-3d382d479989',
  'content-length': '78271',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 78066 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=17.2, Sharpness=3.4%
📥 2025-12-01T08:43:22.796Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=bdface1a-fdeb-417c-b3d6-4511bf87da8b',
  'content-length': '75935',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 75730 bytes
   ✅ Image enhanced: sharpness improved from 3.4% to 23.4%
   📊 After: Variance=117.2, Sharpness=23.4%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=57.6%, Sharpness=23.4%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 112ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (319ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 71.3%, 71.1%, 62.6%, 60.9%, 44.3%, 44.3%, 26.4%, 25.9%, 25.0%, 24.5%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.379, 77.688, 62.733, 81.349])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=71.3%, size=523x667px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=71.1%, size=407x666px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=60.9%, size=533x566px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=62.6%, size=420x569px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 58.4%, scores: 71.3% vs 71.1%)
   🔄 Suppressed duplicate detection (IoU: 45.7%, scores: 71.3% vs 62.6%)
   🔄 Suppressed duplicate detection (IoU: 74.1%, scores: 71.3% vs 60.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 71.3%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=523px, Quality=71.3%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2764ms, ready: true, quality: 71.3%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 71,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=16.7, Sharpness=3.3%
   ✅ Image enhanced: sharpness improved from 3.3% to 23.3%
   📊 After: Variance=116.6, Sharpness=23.3%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=57.4%, Sharpness=23.3%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 134ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (524ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 69.0%, 66.9%, 44.9%, 44.2%, 43.8%, 40.6%, 38.7%, 38.6%, 20.7%, 20.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [57.849, 77.052, 61.617, 80.089])
   📊 Found 2 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=66.9%, size=479x714px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=69.0%, size=488x606px (min: 85px)
   ✅ Found 2 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 76.3%, scores: 69.0% vs 66.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 69.0%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=488px, Quality=69.0%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 4007ms, ready: true, quality: 69.0%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 69,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:43:26.956Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=8747d056-9533-4ab5-8e61-574d955d18e9',
  'content-length': '73072',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 72867 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=13.9, Sharpness=2.8%
   ✅ Image enhanced: sharpness improved from 2.8% to 18.9%
   📊 After: Variance=94.3, Sharpness=18.9%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=57.7%, Sharpness=18.9%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 45ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (287ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 69.2%, 58.8%, 56.8%, 46.4%, 46.3%, 36.8%, 32.7%, 27.3%, 26.4%, 21.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [57.137, 75.252, 60.190, 77.897])
   📊 Found 3 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=58.8%, size=453x751px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=56.8%, size=573x647px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=69.2%, size=448x646px (min: 85px)
   ✅ Found 3 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 80.2%, scores: 69.2% vs 58.8%)
   🔄 Suppressed duplicate detection (IoU: 64.4%, scores: 69.2% vs 56.8%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 69.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=448px, Quality=69.2%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2484ms, ready: true, quality: 69.2%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 69,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:43:30.484Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=17bfa105-0789-476f-a8d7-fb9faabadb8d',
  'content-length': '76768',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 76563 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=14.7, Sharpness=2.9%
   ✅ Image enhanced: sharpness improved from 2.9% to 22.0%
   📊 After: Variance=109.8, Sharpness=22.0%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=60.0%, Sharpness=22.0%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 52ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (284ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.4%, 70.5%, 56.9%, 51.5%, 49.8%, 44.5%, 43.4%, 35.5%, 22.9%, 22.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.003, 79.245, 64.298, 83.196])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 416: ✓ PASS - score=56.9%, size=517x664px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=77.4%, size=421x668px (min: 85px)
   🔍 Detection 456: ✓ PASS - score=51.5%, size=519x572px (min: 85px)
   🔍 Detection 458: ✓ PASS - score=70.5%, size=421x569px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 76.3%, scores: 77.4% vs 70.5%)
   🔄 Suppressed duplicate detection (IoU: 66.4%, scores: 77.4% vs 56.9%)
   🔄 Suppressed duplicate detection (IoU: 57.4%, scores: 77.4% vs 51.5%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.4%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=421px, Quality=77.4%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2423ms, ready: true, quality: 77.4%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 77,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 150ms
📥 2025-12-01T08:43:33.712Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=a76089ac-c195-4dc2-b094-c72d3282bd96',
  'content-length': '80003',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 79798 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=18.5, Sharpness=3.7%
   ✅ Image enhanced: sharpness improved from 3.7% to 26.8%
   📊 After: Variance=133.8, Sharpness=26.8%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=59.8%, Sharpness=26.8%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (288ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 75.7%, 72.1%, 55.5%, 51.5%, 44.3%, 40.0%, 37.2%, 29.3%, 23.4%, 17.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.016, 80.437, 65.191, 84.283])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 382: ✓ PASS - score=72.1%, size=424x657px (min: 85px)
   🔍 Detection 384: ✓ PASS - score=51.5%, size=335x652px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=75.7%, size=424x556px (min: 85px)
   🔍 Detection 424: ✓ PASS - score=55.5%, size=332x558px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 73.7%, scores: 75.7% vs 72.1%)
   🔄 Suppressed duplicate detection (IoU: 57.0%, scores: 75.7% vs 55.5%)
   🔄 Suppressed duplicate detection (IoU: 47.3%, scores: 75.7% vs 51.5%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 75.7%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=424px, Quality=75.7%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2392ms, ready: true, quality: 75.7%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 76,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:43:36.894Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=88186808-108e-462c-969e-7fee4cdb0a9a',
  'content-length': '81372',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 81167 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=18.5, Sharpness=3.7%
   ✅ Image enhanced: sharpness improved from 3.7% to 26.6%
   📊 After: Variance=132.8, Sharpness=26.6%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=57.0%, Sharpness=26.6%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 51ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (305ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.0%, 73.7%, 66.9%, 62.1%, 39.8%, 32.6%, 32.2%, 31.9%, 31.7%, 24.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.897, 79.983, 64.681, 84.141])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 340: ✓ PASS - score=62.1%, size=505x678px (min: 85px)
   🔍 Detection 342: ✓ PASS - score=73.7%, size=403x682px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=66.9%, size=505x583px (min: 85px)
   🔍 Detection 382: ✓ PASS - score=77.0%, size=398x585px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 74.0%, scores: 77.0% vs 73.7%)
   🔄 Suppressed duplicate detection (IoU: 60.6%, scores: 77.0% vs 66.9%)
   🔄 Suppressed duplicate detection (IoU: 46.8%, scores: 77.0% vs 62.1%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.0%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=398px, Quality=77.0%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2438ms, ready: true, quality: 77.0%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 77,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:43:57.953Z - POST /api/staff/register
   📦 Body keys:
   📦 Files: none
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /register
📥 Full URL: /register
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=6db3e519-cd8f-45a4-8b5c-c104ef73274d',
  'content-length': '609635',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================

📦 [MULTER] Files parsed: 6 field(s)
📦 [MULTER] Field "image1": 1 file(s)
   📦 File 1: photo1.jpg, 98874 bytes, image/jpeg
📦 [MULTER] Field "image2": 1 file(s)
   📦 File 1: photo2.jpg, 100437 bytes, image/jpeg
📦 [MULTER] Field "image3": 1 file(s)
   📦 File 1: photo3.jpg, 101884 bytes, image/jpeg
📦 [MULTER] Field "image4": 1 file(s)
   📦 File 1: photo4.jpg, 104668 bytes, image/jpeg
📦 [MULTER] Field "image5": 1 file(s)
   📦 File 1: photo5.jpg, 106380 bytes, image/jpeg
📦 [MULTER] Field "idImage": 1 file(s)
   📦 File 1: id_document.jpg, 94861 bytes, image/jpeg
📦 [MULTER] req.body keys: name, surname, idNumber, phoneNumber, role, hostCompanyId, department, location, clockInTime, clockOutTime, breakStartTime, breakEndTime
🚀 ========== REGISTRATION ROUTE HANDLER CALLED ==========
🚀 This log should appear IMMEDIATELY when request arrives
🚀 ======================================================
🚀 ========== REGISTRATION REQUEST RECEIVED ==========
   📥 Request method: POST
   📥 Request URL: /register
   📥 Request body keys: [
  'name',           'surname',
  'idNumber',       'phoneNumber',
  'role',           'hostCompanyId',
  'department',     'location',
  'clockInTime',    'clockOutTime',
  'breakStartTime', 'breakEndTime'
]
   📥 Request files: [ 'image1', 'image2', 'image3', 'image4', 'image5', 'idImage' ]
   📥 Number of image files: 6
   📦 Detailed files info:
      image1: 1 file(s)
         File 1: photo1.jpg, 98874 bytes
      image2: 1 file(s)
         File 1: photo2.jpg, 100437 bytes
      image3: 1 file(s)
         File 1: photo3.jpg, 101884 bytes
      image4: 1 file(s)
         File 1: photo4.jpg, 104668 bytes
      image5: 1 file(s)
         File 1: photo5.jpg, 106380 bytes
      idImage: 1 file(s)
         File 1: id_document.jpg, 94861 bytes
   📋 Extracted form data: {
  name: 'France',
  surname: 'Mokoena',
  idNumber: '0212315697087',
  role: 'Intern',
  department: '6924083c5c89b172db1dc7bb',
  hostCompanyId: '692407cd5c89b172db1dc795',
  location: 'FERREIRA_STREET_MBOMBELA',
  customAddress: undefined,
  clockInTime: '07:30',
  clockOutTime: '04:30',
  breakStartTime: '13:00',
  breakEndTime: '14:00',
  extraHoursStartTime: undefined,
  extraHoursEndTime: undefined
}
✅ Location from dataset: 20 Ferreira Street, Mbombela (-25.475297, 30.982345)
   📸 Processing 5 images for registration (enterprise-grade accuracy)
📸 Processing registration for France Mokoena (ID: 0212315697087)
   Role: Intern, Phone: 0767789235, Location: 20 Ferreira Street, Mbombela
   Location coordinates: -25.475297, 30.982345
   ⚡ ENTERPRISE: Processing 5 face images SEQUENTIALLY (ONNX Runtime requires sequential inference)...
   📋 Validating 5 images before processing...
   📸 Image 1: buffer size = 98874 bytes, mimetype = image/jpeg
   📸 Image 2: buffer size = 100437 bytes, mimetype = image/jpeg
   📸 Image 3: buffer size = 101884 bytes, mimetype = image/jpeg
   📸 Image 4: buffer size = 104668 bytes, mimetype = image/jpeg
   📸 Image 5: buffer size = 106380 bytes, mimetype = image/jpeg
   ✅ All images validated
   ⚡ Processing image 1/5 (sequential)...
   📦 Image 1 buffer size: 98874 bytes
   🚀 Calling generateEmbedding for image 1...

📸 [REGISTER] Processing image 1/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 98874 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=58.9%, Sharpness=14.4%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 31ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (260ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.6%, 70.1%, 61.4%, 51.1%, 50.3%, 43.8%, 36.0%, 32.7%, 31.3%, 21.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.546, 79.450, 64.005, 82.905])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=51.1%, size=181x310px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=61.4%, size=227x272px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=77.6%, size=179x276px (min: 85px)
   🔍 Detection 458: ✓ PASS - score=50.3%, size=228x232px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=70.1%, size=182x232px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 74.4%, scores: 77.6% vs 70.1%)
   🔄 Suppressed duplicate detection (IoU: 62.4%, scores: 77.6% vs 61.4%)
   🔄 Suppressed duplicate detection (IoU: 82.3%, scores: 77.6% vs 51.1%)
   🔄 Suppressed duplicate detection (IoU: 55.4%, scores: 77.6% vs 50.3%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.6%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=179px, Quality=77.6%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 77.6%
   🏦 Cropping face: normalized (0.128, 0.234, 0.224, 0.259) → pixels (102, 249, 179, 275)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (14ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (286ms). Outputs: 683
✅ 512-d embedding generated in 828ms (0.8s)

✅ [REGISTER] Image 1 processed successfully
   ✅ Image 1 processed - Quality: 77.6%
   ⚡ Processing image 2/5 (sequential)...
   📦 Image 2 buffer size: 100437 bytes
   🚀 Calling generateEmbedding for image 2...

📸 [REGISTER] Processing image 2/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 100437 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=57.4%, Sharpness=17.4%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (271ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 70.7%, 68.5%, 66.4%, 66.0%, 40.7%, 38.2%, 31.8%, 31.5%, 26.9%, 23.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.229, 77.009, 61.563, 80.081])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=70.7%, size=214x285px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=68.5%, size=167x286px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=66.4%, size=216x241px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=66.0%, size=170x243px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 59.2%, scores: 70.7% vs 68.5%)
   🔄 Suppressed duplicate detection (IoU: 77.7%, scores: 70.7% vs 66.4%)
   🔄 Suppressed duplicate detection (IoU: 48.9%, scores: 70.7% vs 66.0%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 70.7%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=214px, Quality=70.7%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 70.7%
   🏦 Cropping face: normalized (0.077, 0.233, 0.267, 0.268) → pixels (61, 248, 213, 285)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (16ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (281ms). Outputs: 683
✅ 512-d embedding generated in 827ms (0.8s)

✅ [REGISTER] Image 2 processed successfully
   ✅ Image 2 processed - Quality: 70.7%
   ⚡ Processing image 3/5 (sequential)...
   📦 Image 3 buffer size: 101884 bytes
   🚀 Calling generateEmbedding for image 3...

📸 [REGISTER] Processing image 3/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 101884 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=57.0%, Sharpness=16.8%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 30ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (288ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 69.3%, 60.6%, 52.8%, 46.6%, 40.6%, 36.3%, 31.8%, 29.7%, 28.7%, 20.3%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [56.316, 73.644, 58.038, 75.457])
   📊 Found 3 detections above threshold (50.0%)
   🔍 Detection 338: ✓ PASS - score=60.6%, size=206x293px (min: 85px)
   🔍 Detection 378: ✓ PASS - score=69.3%, size=211x255px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=52.8%, size=166x255px (min: 85px)
   ✅ Found 3 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 76.2%, scores: 69.3% vs 60.6%)
   🔄 Suppressed duplicate detection (IoU: 65.1%, scores: 69.3% vs 52.8%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 69.3%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=211px, Quality=69.3%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 69.3%
   🏦 Cropping face: normalized (0.115, 0.267, 0.264, 0.239) → pixels (92, 284, 211, 254)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (13ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (264ms). Outputs: 683
✅ 512-d embedding generated in 821ms (0.8s)

✅ [REGISTER] Image 3 processed successfully
   ✅ Image 3 processed - Quality: 69.3%
   ⚡ Processing image 4/5 (sequential)...
   📦 Image 4 buffer size: 104668 bytes
   🚀 Calling generateEmbedding for image 4...

📸 [REGISTER] Processing image 4/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 104668 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=59.5%, Sharpness=20.8%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 30ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (311ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 80.7%, 69.7%, 64.8%, 55.1%, 50.2%, 43.5%, 40.3%, 26.6%, 19.1%, 17.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.012, 80.682, 65.175, 84.510])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=50.2%, size=199x276px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=64.8%, size=161x278px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=69.7%, size=202x239px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=80.7%, size=160x239px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=55.1%, size=162x199px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 61.2%, scores: 80.7% vs 69.7%)
   🔄 Suppressed duplicate detection (IoU: 75.2%, scores: 80.7% vs 64.8%)
   🔄 Suppressed duplicate detection (IoU: 77.1%, scores: 80.7% vs 55.1%)
   🔄 Suppressed duplicate detection (IoU: 50.6%, scores: 80.7% vs 50.2%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 80.7%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=160px, Quality=80.7%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 80.7%
   🏦 Cropping face: normalized (0.126, 0.249, 0.200, 0.224) → pixels (100, 264, 159, 238)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (14ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (266ms). Outputs: 683
✅ 512-d embedding generated in 843ms (0.8s)

✅ [REGISTER] Image 4 processed successfully
   ✅ Image 4 processed - Quality: 80.7%
   ⚡ Processing image 5/5 (sequential)...
   📦 Image 5 buffer size: 106380 bytes
   🚀 Calling generateEmbedding for image 5...

📸 [REGISTER] Processing image 5/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 106380 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=57.4%, Sharpness=18.9%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (275ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 74.4%, 70.7%, 61.1%, 54.5%, 43.4%, 41.4%, 37.9%, 34.3%, 29.0%, 23.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.163, 77.468, 61.935, 80.454])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 376: ✓ PASS - score=61.1%, size=224x267px (min: 85px)
   🔍 Detection 378: ✓ PASS - score=74.4%, size=180x273px (min: 85px)
   🔍 Detection 416: ✓ PASS - score=54.5%, size=227x229px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=70.7%, size=182x228px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 75.2%, scores: 74.4% vs 70.7%)
   🔄 Suppressed duplicate detection (IoU: 62.5%, scores: 74.4% vs 61.1%)
   🔄 Suppressed duplicate detection (IoU: 55.3%, scores: 74.4% vs 54.5%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 74.4%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=180px, Quality=74.4%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 74.4%
   🏦 Cropping face: normalized (0.130, 0.225, 0.225, 0.256) → pixels (103, 240, 180, 272)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (9ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (278ms). Outputs: 683
✅ 512-d embedding generated in 797ms (0.8s)

✅ [REGISTER] Image 5 processed successfully
   ✅ Image 5 processed - Quality: 74.4%
   ⚡⚡⚡ Sequential processing completed in 4160ms - 5 embeddings generated
   📊 Average face quality: 74.5% (Image 1: 77.6%, Image 2: 70.7%, Image 3: 69.3%, Image 4: 80.7%, Image 5: 74.4%)
   🏦 Centroid template computed from 5/5 embeddings (weights: 0.204, 0.190, 0.186, 0.218, 0.201, norm: 0.871)
   🏦 Centroid template computed from 5 embeddings
   🆔 Processing ID document image (94861 bytes)...

📸 [REGISTER] Processing ID document image (REQUIRED)
🆔 ====== EXTRACTING ID DOCUMENT EMBEDDING ======
   📦 ID image buffer size: 94861 bytes
🏦 Applying canonical preprocessing for ID document...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x600, Brightness=46.5%, Sharpness=47.3%
   🏦 Canonical preprocessing: 800x600 → 800x600 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x600 → 800x600
🔍 Detecting face in ID document (using relaxed threshold for ID photos)...
   🔧 Using relaxed detection threshold: 30% (instead of 50%) for ID document
   🔧 Resizing for SCRFD detection: 800x600 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=1.067, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 800x600 → 640x640 (square) in 30ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (275ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 5.1%, 4.9%, 4.6%, 4.6%, 4.5%, 4.3%, 4.3%, 4.3%, 4.2%, 4.2%
   🔍 Detection threshold: 30.0%
   🔍 Detected box format: pixel_center_size (first box values: [63.127, 85.147, 67.231, 90.759])
   📊 Found 0 detections above threshold (30.0%)
   ✅ Found 0 faces with score > 30% (threshold: 30%)
   🔍 After NMS filtering: 0 unique face(s)
❌ Error extracting ID embedding: Error: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
    at detectFaces (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2137:11)
    at async generateIDEmbedding (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2545:20)
    at async C:\Clock-in\FaceClockBackend\routes\staff.js:515:33
   ❌ Failed to process ID document image (REQUIRED): No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
📥 2025-12-01T08:44:19.770Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=e339861d-ba02-432b-9722-d4b392506c9c',
  'content-length': '146309',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 146103 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=5.8, Sharpness=1.2%
   ✅ Image enhanced: sharpness improved from 1.2% to 8.3%
   📊 After: Variance=41.6, Sharpness=8.3%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ⚠️ Image quality is marginal (variance: 41.6 < 60). Accuracy may be reduced.
   ✅ Quality gates passed: Size=3120x4160, Brightness=45.3%, Sharpness=8.3%
   🏦 Canonical preprocessing: 3120x4160 → 3120x4160 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 3120x4160 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.205, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 3120x4160 → 640x640 (square) in 79ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (611ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 7.4%, 6.5%, 6.1%, 6.1%, 5.9%, 5.6%, 4.0%, 4.0%, 3.8%, 3.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.509, 82.128, 67.954, 85.141])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T08:44:28.710Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=1181c162-b454-460d-9ed4-03d47f0afb25',
  'content-length': '128721',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 128515 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=3.6, Sharpness=0.7%
   ✅ Image enhanced: sharpness improved from 0.7% to 6.6%
   📊 After: Variance=32.9, Sharpness=6.6%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'blur' ],
  feedback: 'Image is too blurry. Hold still and ensure camera is focused.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T08:44:35.933Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=99455847-1b4b-41b5-a77d-7787167c38f2',
  'content-length': '107837',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 107631 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=2.1, Sharpness=0.4%
   ✅ Image enhanced: sharpness improved from 0.4% to 4.1%
   📊 After: Variance=20.5, Sharpness=4.1%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'blur' ],
  feedback: 'Image is too blurry. Hold still and ensure camera is focused.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T08:44:42.929Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=dea8d503-02b7-47b4-92cf-329506ae7186',
  'content-length': '118480',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 118274 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=2.7, Sharpness=0.5%
   ✅ Image enhanced: sharpness improved from 0.5% to 4.4%
   📊 After: Variance=22.0, Sharpness=4.4%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'blur' ],
  feedback: 'Image is too blurry. Hold still and ensure camera is focused.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T08:44:50.105Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=67f6ae38-2486-4722-9342-3ae8354893b9',
  'content-length': '157015',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 156809 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=5.3, Sharpness=1.1%
   ✅ Image enhanced: sharpness improved from 1.1% to 11.5%
   📊 After: Variance=57.6, Sharpness=11.5%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ⚠️ Image quality is marginal (variance: 57.6 < 60). Accuracy may be reduced.
   ✅ Quality gates passed: Size=3120x4160, Brightness=48.1%, Sharpness=11.5%
   🏦 Canonical preprocessing: 3120x4160 → 3120x4160 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 3120x4160 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.205, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 3120x4160 → 640x640 (square) in 90ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (274ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.7%, 3.3%, 3.2%, 3.0%, 3.0%, 2.8%, 2.8%, 2.7%, 2.2%, 2.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [64.369, 86.454, 70.079, 88.871])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T08:44:57.876Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=ae9f1cca-02ac-41a3-9bd4-134dc0594bf1',
  'content-length': '190038',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 189832 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=9.4, Sharpness=1.9%
   ✅ Image enhanced: sharpness improved from 1.9% to 19.7%
   📊 After: Variance=98.5, Sharpness=19.7%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=3120x4160, Brightness=49.1%, Sharpness=19.7%
   🏦 Canonical preprocessing: 3120x4160 → 3120x4160 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 3120x4160 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.205, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 3120x4160 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (291ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.4%, 3.1%, 2.9%, 2.9%, 2.8%, 2.7%, 2.7%, 2.7%, 1.9%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.906, 84.354, 67.751, 85.673])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T08:45:05.317Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=88f985b0-5514-4201-9687-e8829c4b7d24',
  'content-length': '198089',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 197883 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=10.1, Sharpness=2.0%
   ✅ Image enhanced: sharpness improved from 2.0% to 21.0%
   📊 After: Variance=104.9, Sharpness=21.0%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=3120x4160, Brightness=48.6%, Sharpness=21.0%
   🏦 Canonical preprocessing: 3120x4160 → 3120x4160 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 3120x4160 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.205, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 3120x4160 → 640x640 (square) in 39ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (291ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.1%, 3.0%, 3.0%, 2.9%, 2.8%, 2.8%, 2.8%, 2.8%, 1.8%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.489, 78.808, 61.934, 78.371])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T08:45:15.388Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=7fa056aa-0c5f-4531-aef6-b46fa2ded0b1',
  'content-length': '119167',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 118961 bytes
   🔧 Blurry image detected: Applying moderate enhancement...
   📊 Before: Variance=41.4, Sharpness=8.3%
   ✅ Image enhanced: sharpness improved from 8.3% to 57.2%
   📊 After: Variance=286.2, Sharpness=57.2%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=78.7%, Sharpness=57.2%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (265ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 65.2%, 58.4%, 55.8%, 49.7%, 45.5%, 36.4%, 35.3%, 21.8%, 18.6%, 12.3%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.827, 81.043, 64.126, 84.396])
   📊 Found 3 detections above threshold (50.0%)
   🔍 Detection 478: ✓ PASS - score=58.4%, size=503x663px (min: 85px)
   🔍 Detection 516: ✓ PASS - score=55.8%, size=597x556px (min: 85px)
   🔍 Detection 518: ✓ PASS - score=65.2%, size=508x572px (min: 85px)
   ✅ Found 3 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 75.5%, scores: 65.2% vs 58.4%)
   🔄 Suppressed duplicate detection (IoU: 62.5%, scores: 65.2% vs 55.8%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 65.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=508px, Quality=65.2%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2223ms, ready: true, quality: 65.2%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 65,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:45:18.405Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=73c36eec-c975-443a-95a1-3a72a91993dd',
  'content-length': '70558',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 70353 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=12.1, Sharpness=2.4%
   ✅ Image enhanced: sharpness improved from 2.4% to 17.5%
   📊 After: Variance=87.5, Sharpness=17.5%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=63.4%, Sharpness=17.5%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (299ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 74.3%, 70.0%, 60.2%, 54.7%, 44.9%, 42.3%, 40.0%, 31.2%, 29.9%, 21.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.643, 79.754, 64.200, 83.877])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 494: ✓ PASS - score=74.3%, size=469x669px (min: 85px)
   🔍 Detection 496: ✓ PASS - score=60.2%, size=370x661px (min: 85px)
   🔍 Detection 534: ✓ PASS - score=70.0%, size=478x567px (min: 85px)
   🔍 Detection 536: ✓ PASS - score=54.7%, size=382x573px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 71.0%, scores: 74.3% vs 70.0%)
   🔄 Suppressed duplicate detection (IoU: 57.9%, scores: 74.3% vs 60.2%)
   🔄 Suppressed duplicate detection (IoU: 47.4%, scores: 74.3% vs 54.7%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 74.3%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=469px, Quality=74.3%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2333ms, ready: true, quality: 74.3%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 74,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:45:21.495Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=e8d08614-bcf9-44f3-a124-962f5ca3f70e',
  'content-length': '81356',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 81151 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=18.1, Sharpness=3.6%
   ✅ Image enhanced: sharpness improved from 3.6% to 25.9%
   📊 After: Variance=129.4, Sharpness=25.9%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=60.6%, Sharpness=25.9%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (265ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 76.3%, 73.3%, 56.9%, 56.7%, 52.7%, 51.7%, 29.0%, 20.4%, 20.2%, 19.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.678, 79.975, 65.160, 84.089])
   📊 Found 6 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=51.7%, size=479x704px (min: 85px)
   🔍 Detection 382: ✓ PASS - score=56.7%, size=385x703px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=73.3%, size=485x618px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=76.3%, size=380x621px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=52.7%, size=486x522px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=56.9%, size=389x526px (min: 85px)
   ✅ Found 6 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 59.2%, scores: 76.3% vs 73.3%)
   🔄 Suppressed duplicate detection (IoU: 76.8%, scores: 76.3% vs 56.9%)
   🔄 Suppressed duplicate detection (IoU: 78.1%, scores: 76.3% vs 56.7%)
   🔄 Suppressed duplicate detection (IoU: 53.2%, scores: 76.3% vs 52.7%)
   🔄 Suppressed duplicate detection (IoU: 50.4%, scores: 76.3% vs 51.7%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 76.3%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=380px, Quality=76.3%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2425ms, ready: true, quality: 76.3%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 76,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:45:24.333Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=17255547-1ec7-45cf-b3fe-b0976fbe11b7',
  'content-length': '69049',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 68844 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=10.2, Sharpness=2.0%
   ✅ Image enhanced: sharpness improved from 2.0% to 14.5%
   📊 After: Variance=72.3, Sharpness=14.5%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=60.0%, Sharpness=14.5%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 25ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (270ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 64.8%, 63.0%, 50.1%, 47.7%, 46.1%, 35.3%, 35.0%, 32.6%, 32.0%, 25.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [57.537, 76.654, 61.424, 80.702])
   📊 Found 3 detections above threshold (50.0%)
   🔍 Detection 498: ✓ PASS - score=64.8%, size=493x719px (min: 85px)
   🔍 Detection 500: ✓ PASS - score=50.1%, size=393x712px (min: 85px)
   🔍 Detection 538: ✓ PASS - score=63.0%, size=497x618px (min: 85px)
   ✅ Found 3 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 81.3%, scores: 64.8% vs 63.0%)
   🔄 Suppressed duplicate detection (IoU: 59.0%, scores: 64.8% vs 50.1%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 64.8%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=493px, Quality=64.8%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 3323ms, ready: true, quality: 64.8%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 65,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T08:45:28.497Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=ba3fd708-b05d-48f7-b2de-ed1bcc935854',
  'content-length': '81334',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 81129 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=18.4, Sharpness=3.7%
   ✅ Image enhanced: sharpness improved from 3.7% to 25.9%
   📊 After: Variance=129.4, Sharpness=25.9%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=56.5%, Sharpness=25.9%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (288ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 54.3%, 47.8%, 40.4%, 36.7%, 29.5%, 29.0%, 27.0%, 26.8%, 26.6%, 17.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [55.603, 73.478, 58.123, 75.838])
   📊 Found 1 detections above threshold (50.0%)
   🔍 Detection 420: ✓ PASS - score=54.3%, size=514x662px (min: 85px)
   ✅ Found 1 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 54.3%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=514px, Quality=54.3%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2460ms, ready: true, quality: 54.3%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 54,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 167ms
📥 2025-12-01T08:45:58.206Z - POST /api/staff/register
   📦 Body keys:
   📦 Files: none
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /register
📥 Full URL: /register
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=15cec323-8b71-4fbf-b694-7960541ffdde',
  'content-length': '635053',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================

📦 [MULTER] Files parsed: 6 field(s)
📦 [MULTER] Field "image1": 1 file(s)
   📦 File 1: photo1.jpg, 100596 bytes, image/jpeg
📦 [MULTER] Field "image2": 1 file(s)
   📦 File 1: photo2.jpg, 100219 bytes, image/jpeg
📦 [MULTER] Field "image3": 1 file(s)
   📦 File 1: photo3.jpg, 104027 bytes, image/jpeg
📦 [MULTER] Field "image4": 1 file(s)
   📦 File 1: photo4.jpg, 95995 bytes, image/jpeg
📦 [MULTER] Field "image5": 1 file(s)
   📦 File 1: photo5.jpg, 103848 bytes, image/jpeg
📦 [MULTER] Field "idImage": 1 file(s)
   📦 File 1: id_document.jpg, 127836 bytes, image/jpeg
📦 [MULTER] req.body keys: name, surname, idNumber, phoneNumber, role, hostCompanyId, department, location, clockInTime, clockOutTime, breakStartTime, breakEndTime
🚀 ========== REGISTRATION ROUTE HANDLER CALLED ==========
🚀 This log should appear IMMEDIATELY when request arrives
🚀 ======================================================
🚀 ========== REGISTRATION REQUEST RECEIVED ==========
   📥 Request method: POST
   📥 Request URL: /register
   📥 Request body keys: [
  'name',           'surname',
  'idNumber',       'phoneNumber',
  'role',           'hostCompanyId',
  'department',     'location',
  'clockInTime',    'clockOutTime',
  'breakStartTime', 'breakEndTime'
]
   📥 Request files: [ 'image1', 'image2', 'image3', 'image4', 'image5', 'idImage' ]
   📥 Number of image files: 6
   📦 Detailed files info:
      image1: 1 file(s)
         File 1: photo1.jpg, 100596 bytes
      image2: 1 file(s)
         File 1: photo2.jpg, 100219 bytes
      image3: 1 file(s)
         File 1: photo3.jpg, 104027 bytes
      image4: 1 file(s)
         File 1: photo4.jpg, 95995 bytes
      image5: 1 file(s)
         File 1: photo5.jpg, 103848 bytes
      idImage: 1 file(s)
         File 1: id_document.jpg, 127836 bytes
   📋 Extracted form data: {
  name: 'France',
  surname: 'Mokoena',
  idNumber: '0212315697087',
  role: 'Intern',
  department: '6924083c5c89b172db1dc7bb',
  hostCompanyId: '692407cd5c89b172db1dc795',
  location: 'FERREIRA_STREET_MBOMBELA',
  customAddress: undefined,
  clockInTime: '07:30',
  clockOutTime: '04:30',
  breakStartTime: '13:00',
  breakEndTime: '14:00',
  extraHoursStartTime: undefined,
  extraHoursEndTime: undefined
}
✅ Location from dataset: 20 Ferreira Street, Mbombela (-25.475297, 30.982345)
   📸 Processing 5 images for registration (enterprise-grade accuracy)
📸 Processing registration for France Mokoena (ID: 0212315697087)
   Role: Intern, Phone: 0767789235, Location: 20 Ferreira Street, Mbombela
   Location coordinates: -25.475297, 30.982345
   ⚡ ENTERPRISE: Processing 5 face images SEQUENTIALLY (ONNX Runtime requires sequential inference)...
   📋 Validating 5 images before processing...
   📸 Image 1: buffer size = 100596 bytes, mimetype = image/jpeg
   📸 Image 2: buffer size = 100219 bytes, mimetype = image/jpeg
   📸 Image 3: buffer size = 104027 bytes, mimetype = image/jpeg
   📸 Image 4: buffer size = 95995 bytes, mimetype = image/jpeg
   📸 Image 5: buffer size = 103848 bytes, mimetype = image/jpeg
   ✅ All images validated
   ⚡ Processing image 1/5 (sequential)...
   📦 Image 1 buffer size: 100596 bytes
   🚀 Calling generateEmbedding for image 1...

📸 [REGISTER] Processing image 1/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 100596 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=61.0%, Sharpness=19.6%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 30ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (297ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 76.1%, 66.3%, 64.0%, 52.2%, 45.4%, 38.5%, 35.4%, 30.3%, 23.1%, 17.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.445, 79.530, 64.529, 83.580])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 420: ✓ PASS - score=66.3%, size=184x284px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=52.2%, size=146x281px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=76.1%, size=185x242px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=64.0%, size=144x243px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 74.9%, scores: 76.1% vs 66.3%)
   🔄 Suppressed duplicate detection (IoU: 56.9%, scores: 76.1% vs 64.0%)
   🔄 Suppressed duplicate detection (IoU: 47.7%, scores: 76.1% vs 52.2%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 76.1%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=185px, Quality=76.1%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 76.1%
   🏦 Cropping face: normalized (0.087, 0.258, 0.231, 0.227) → pixels (69, 275, 185, 241)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (13ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (256ms). Outputs: 683
✅ 512-d embedding generated in 816ms (0.8s)

✅ [REGISTER] Image 1 processed successfully
   ✅ Image 1 processed - Quality: 76.1%
   ⚡ Processing image 2/5 (sequential)...
   📦 Image 2 buffer size: 100219 bytes
   🚀 Calling generateEmbedding for image 2...

📸 [REGISTER] Processing image 2/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 100219 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=58.3%, Sharpness=15.9%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (267ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 64.1%, 63.4%, 54.8%, 53.8%, 47.0%, 41.5%, 24.6%, 23.5%, 22.3%, 18.3%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [57.298, 75.978, 60.385, 78.596])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=54.8%, size=217x297px (min: 85px)
   🔍 Detection 382: ✓ PASS - score=53.8%, size=174x299px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=63.4%, size=225x258px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=64.1%, size=177x261px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 61.4%, scores: 64.1% vs 63.4%)
   🔄 Suppressed duplicate detection (IoU: 54.5%, scores: 64.1% vs 54.8%)
   🔄 Suppressed duplicate detection (IoU: 82.2%, scores: 64.1% vs 53.8%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 64.1%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=177px, Quality=64.1%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 64.1%
   🏦 Cropping face: normalized (0.164, 0.258, 0.221, 0.245) → pixels (130, 274, 177, 261)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (14ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (261ms). Outputs: 683
✅ 512-d embedding generated in 794ms (0.8s)

✅ [REGISTER] Image 2 processed successfully
   ✅ Image 2 processed - Quality: 64.1%
   ⚡ Processing image 3/5 (sequential)...
   📦 Image 3 buffer size: 104027 bytes
   🚀 Calling generateEmbedding for image 3...

📸 [REGISTER] Processing image 3/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 104027 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=58.3%, Sharpness=17.0%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (271ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 68.7%, 64.6%, 47.3%, 44.8%, 42.2%, 40.5%, 40.2%, 30.7%, 22.5%, 22.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [55.910, 73.789, 58.594, 76.246])
   📊 Found 2 detections above threshold (50.0%)
   🔍 Detection 340: ✓ PASS - score=68.7%, size=194x288px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=64.6%, size=197x242px (min: 85px)
   ✅ Found 2 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 76.4%, scores: 68.7% vs 64.6%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 68.7%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=194px, Quality=68.7%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 68.7%
   🏦 Cropping face: normalized (0.125, 0.235, 0.242, 0.270) → pixels (99, 250, 193, 287)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (14ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (272ms). Outputs: 683
✅ 512-d embedding generated in 788ms (0.8s)

✅ [REGISTER] Image 3 processed successfully
   ✅ Image 3 processed - Quality: 68.7%
   ⚡ Processing image 4/5 (sequential)...
   📦 Image 4 buffer size: 95995 bytes
   🚀 Calling generateEmbedding for image 4...

📸 [REGISTER] Processing image 4/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 95995 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=62.1%, Sharpness=15.1%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (278ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 81.5%, 68.4%, 58.9%, 58.1%, 49.4%, 42.2%, 42.0%, 28.5%, 27.5%, 21.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.480, 81.069, 65.414, 84.776])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=68.4%, size=166x270px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=58.9%, size=208x226px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=81.5%, size=165x226px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=58.1%, size=126x226px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 75.0%, scores: 81.5% vs 68.4%)
   🔄 Suppressed duplicate detection (IoU: 63.9%, scores: 81.5% vs 58.9%)
   🔄 Suppressed duplicate detection (IoU: 54.5%, scores: 81.5% vs 58.1%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 81.5%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=165px, Quality=81.5%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 81.5%
   🏦 Cropping face: normalized (0.103, 0.249, 0.207, 0.212) → pixels (82, 265, 165, 225)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (25ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (274ms). Outputs: 683
✅ 512-d embedding generated in 807ms (0.8s)

✅ [REGISTER] Image 4 processed successfully
   ✅ Image 4 processed - Quality: 81.5%
   ⚡ Processing image 5/5 (sequential)...
   📦 Image 5 buffer size: 103848 bytes
   🚀 Calling generateEmbedding for image 5...

📸 [REGISTER] Processing image 5/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 103848 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=60.1%, Sharpness=19.6%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (272ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 76.6%, 72.9%, 65.0%, 61.1%, 46.6%, 42.7%, 27.9%, 21.7%, 20.2%, 18.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.302, 79.563, 64.087, 83.201])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=65.0%, size=185x276px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=61.1%, size=145x273px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=76.6%, size=187x235px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=72.9%, size=144x234px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 57.9%, scores: 76.6% vs 72.9%)
   🔄 Suppressed duplicate detection (IoU: 76.2%, scores: 76.6% vs 65.0%)
   🔄 Suppressed duplicate detection (IoU: 48.9%, scores: 76.6% vs 61.1%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 76.6%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=187px, Quality=76.6%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 76.6%
   🏦 Cropping face: normalized (0.071, 0.254, 0.234, 0.220) → pixels (56, 270, 187, 234)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (17ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (268ms). Outputs: 683
✅ 512-d embedding generated in 808ms (0.8s)

✅ [REGISTER] Image 5 processed successfully
   ✅ Image 5 processed - Quality: 76.6%
   ⚡⚡⚡ Sequential processing completed in 4056ms - 5 embeddings generated
   📊 Average face quality: 73.4% (Image 1: 76.1%, Image 2: 64.1%, Image 3: 68.7%, Image 4: 81.5%, Image 5: 76.6%)
   🏦 Centroid template computed from 5/5 embeddings (weights: 0.209, 0.175, 0.188, 0.218, 0.210, norm: 0.875)
   🏦 Centroid template computed from 5 embeddings
   🆔 Processing ID document image (127836 bytes)...

📸 [REGISTER] Processing ID document image (REQUIRED)
🆔 ====== EXTRACTING ID DOCUMENT EMBEDDING ======
   📦 ID image buffer size: 127836 bytes
🏦 Applying canonical preprocessing for ID document...
   🔧 Blurry image detected: Applying moderate enhancement...
   📊 Before: Variance=38.5, Sharpness=7.7%
   ✅ Image enhanced: sharpness improved from 7.7% to 82.3%
   📊 After: Variance=411.5, Sharpness=82.3%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=800x1066, Brightness=48.5%, Sharpness=82.3%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting face in ID document (using relaxed threshold for ID photos)...
   🔧 Using relaxed detection threshold: 30% (instead of 50%) for ID document
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (277ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.4%, 3.1%, 2.9%, 2.9%, 2.9%, 2.8%, 2.7%, 2.7%, 1.9%, 1.8%
   🔍 Detection threshold: 30.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.680, 82.409, 66.300, 83.570])
   📊 Found 0 detections above threshold (30.0%)
   ✅ Found 0 faces with score > 30% (threshold: 30%)
   🔍 After NMS filtering: 0 unique face(s)
❌ Error extracting ID embedding: Error: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
    at detectFaces (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2137:11)
    at async generateIDEmbedding (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2545:20)
    at async C:\Clock-in\FaceClockBackend\routes\staff.js:515:33
   ❌ Failed to process ID document image (REQUIRED): No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 289ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 165ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 142ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 146ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 167ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 128ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 179ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 271ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 451ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 165ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 736ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 241ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 283ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 306ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 227ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 234ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 161ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 138ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 134ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 1103ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 390ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 198ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 179ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 157ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 141ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 147ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 169ms
📥 2025-12-01T09:40:19.415Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=4fb8c582-5f89-4bbe-afcb-16eaeefd2f5c',
  'content-length': '98733',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 98528 bytes
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'lighting' ],
  feedback: 'Lighting issue detected. Please adjust lighting.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:40:21.271Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=08638af3-0807-4f9a-93ad-c4b86a30e7ef',
  'content-length': '99161',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 98956 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=1.6, Sharpness=0.3%
   ✅ Image enhanced: sharpness improved from 0.3% to 1.6%
   📊 After: Variance=8.0, Sharpness=1.6%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'blur' ],
  feedback: 'Image is too blurry. Hold still and ensure camera is focused.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:40:28.097Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=b6a22517-7b94-4135-88a5-ce2c0aa9652b',
  'content-length': '320330',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 320124 bytes
   🔧 Blurry image detected: Applying moderate enhancement...
   📊 Before: Variance=26.6, Sharpness=5.3%
   ✅ Image enhanced: sharpness improved from 5.3% to 34.0%
   📊 After: Variance=169.9, Sharpness=34.0%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=4160x3120, Brightness=46.7%, Sharpness=34.0%
   🏦 Canonical preprocessing: 4160x3120 → 4160x3120 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 4160x3120 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.205, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 4160x3120 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (288ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 5.7%, 5.0%, 4.8%, 4.8%, 4.5%, 4.3%, 4.2%, 4.2%, 4.1%, 3.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.514, 81.235, 62.111, 83.865])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:40:44.074Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=db7e3d10-3499-48bd-a23a-0940c5b63d40',
  'content-length': '68925',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 68720 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=6.8, Sharpness=1.4%
   ✅ Image enhanced: sharpness improved from 1.4% to 8.3%
   📊 After: Variance=41.7, Sharpness=8.3%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ⚠️ Image quality is marginal (variance: 41.7 < 60). Accuracy may be reduced.
   ✅ Quality gates passed: Size=1944x2592, Brightness=56.2%, Sharpness=8.3%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 54ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (266ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 71.7%, 70.6%, 64.4%, 59.9%, 30.4%, 30.3%, 30.3%, 29.5%, 26.7%, 20.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.158, 81.492, 65.845, 85.537])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 298: ✓ PASS - score=70.6%, size=375x512px (min: 85px)
   🔍 Detection 300: ✓ PASS - score=59.9%, size=279x514px (min: 85px)
   🔍 Detection 338: ✓ PASS - score=71.7%, size=380x425px (min: 85px)
   🔍 Detection 340: ✓ PASS - score=64.4%, size=284x428px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 63.9%, scores: 71.7% vs 70.6%)
   🔄 Suppressed duplicate detection (IoU: 53.4%, scores: 71.7% vs 64.4%)
   🔄 Suppressed duplicate detection (IoU: 39.8%, scores: 71.7% vs 59.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 71.7%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=380px, Quality=71.7%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2512ms, ready: true, quality: 71.7%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 72,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:40:47.545Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=52273af2-7b4e-4762-a9f0-85d982734921',
  'content-length': '76900',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 76695 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=12.6, Sharpness=2.5%
   ✅ Image enhanced: sharpness improved from 2.5% to 18.2%
   📊 After: Variance=91.2, Sharpness=18.2%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=58.4%, Sharpness=18.2%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 70ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (286ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 65.1%, 63.5%, 57.6%, 57.2%, 49.9%, 47.6%, 30.4%, 28.4%, 23.4%, 23.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [57.921, 77.670, 62.607, 81.878])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 418: ✓ PASS - score=57.2%, size=524x751px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=57.6%, size=420x742px (min: 85px)
   🔍 Detection 458: ✓ PASS - score=65.1%, size=526x665px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=63.5%, size=415x665px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 61.7%, scores: 65.1% vs 63.5%)
   🔄 Suppressed duplicate detection (IoU: 56.0%, scores: 65.1% vs 57.6%)
   🔄 Suppressed duplicate detection (IoU: 83.8%, scores: 65.1% vs 57.2%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 65.1%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=526px, Quality=65.1%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2484ms, ready: true, quality: 65.1%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 65,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:40:50.658Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=5eabee98-84f7-4134-a195-837b30ebaf79',
  'content-length': '75958',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 75753 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=16.9, Sharpness=3.4%
   ✅ Image enhanced: sharpness improved from 3.4% to 23.9%
   📊 After: Variance=119.3, Sharpness=23.9%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=60.7%, Sharpness=23.9%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (314ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 67.1%, 66.5%, 56.1%, 55.4%, 35.8%, 34.7%, 32.6%, 32.5%, 25.1%, 21.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [57.202, 75.571, 60.697, 78.884])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 456: ✓ PASS - score=56.1%, size=549x720px (min: 85px)
   🔍 Detection 458: ✓ PASS - score=66.5%, size=434x728px (min: 85px)
   🔍 Detection 496: ✓ PASS - score=55.4%, size=555x625px (min: 85px)
   🔍 Detection 498: ✓ PASS - score=67.1%, size=433x619px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 76.2%, scores: 67.1% vs 66.5%)
   🔄 Suppressed duplicate detection (IoU: 52.9%, scores: 67.1% vs 56.1%)
   🔄 Suppressed duplicate detection (IoU: 64.5%, scores: 67.1% vs 55.4%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 67.1%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=433px, Quality=67.1%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2423ms, ready: true, quality: 67.1%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 67,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:40:54.511Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=496f33ad-1364-4d87-b3fb-203eed83516f',
  'content-length': '73082',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 72877 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=12.4, Sharpness=2.5%
   ✅ Image enhanced: sharpness improved from 2.5% to 18.2%
   📊 After: Variance=90.9, Sharpness=18.2%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=59.8%, Sharpness=18.2%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (297ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 70.3%, 67.6%, 53.8%, 53.3%, 39.5%, 37.6%, 37.2%, 35.0%, 23.3%, 21.5%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.384, 77.555, 61.798, 80.880])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 420: ✓ PASS - score=53.3%, size=571x706px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=67.6%, size=449x716px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=53.8%, size=583x611px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=70.3%, size=456x606px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 74.8%, scores: 70.3% vs 67.6%)
   🔄 Suppressed duplicate detection (IoU: 64.4%, scores: 70.3% vs 53.8%)
   🔄 Suppressed duplicate detection (IoU: 52.2%, scores: 70.3% vs 53.3%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 70.3%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=456px, Quality=70.3%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2398ms, ready: true, quality: 70.3%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 70,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:40:57.539Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=9901f5c2-78f5-4ecc-b94b-6229657dda2b',
  'content-length': '78919',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 78714 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=17.1, Sharpness=3.4%
   ✅ Image enhanced: sharpness improved from 3.4% to 24.6%
   📊 After: Variance=122.8, Sharpness=24.6%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=59.8%, Sharpness=24.6%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (279ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 78.0%, 61.0%, 59.5%, 56.1%, 52.9%, 40.9%, 36.1%, 35.5%, 30.7%, 22.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.961, 78.202, 62.870, 81.787])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=61.0%, size=461x735px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=52.9%, size=560x622px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=78.0%, size=457x629px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=59.5%, size=363x629px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=56.1%, size=466x532px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 78.2%, scores: 78.0% vs 61.0%)
   🔄 Suppressed duplicate detection (IoU: 54.3%, scores: 78.0% vs 59.5%)
   🔄 Suppressed duplicate detection (IoU: 69.8%, scores: 78.0% vs 56.1%)
   🔄 Suppressed duplicate detection (IoU: 64.3%, scores: 78.0% vs 52.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 78.0%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=457px, Quality=78.0%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2428ms, ready: true, quality: 78.0%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 78,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:41:15.404Z - POST /api/staff/register
   📦 Body keys:
   📦 Files: none
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /register
📥 Full URL: /register
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=64cd7600-557f-4016-a908-dca2f8c037be',
  'content-length': '645915',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================

📦 [MULTER] Files parsed: 6 field(s)
📦 [MULTER] Field "image1": 1 file(s)
   📦 File 1: photo1.jpg, 106150 bytes, image/jpeg
📦 [MULTER] Field "image2": 1 file(s)
   📦 File 1: photo2.jpg, 109490 bytes, image/jpeg
📦 [MULTER] Field "image3": 1 file(s)
   📦 File 1: photo3.jpg, 109603 bytes, image/jpeg
📦 [MULTER] Field "image4": 1 file(s)
   📦 File 1: photo4.jpg, 110229 bytes, image/jpeg
📦 [MULTER] Field "image5": 1 file(s)
   📦 File 1: photo5.jpg, 101575 bytes, image/jpeg
📦 [MULTER] Field "idImage": 1 file(s)
   📦 File 1: id_document.jpg, 106335 bytes, image/jpeg
📦 [MULTER] req.body keys: name, surname, idNumber, phoneNumber, role, hostCompanyId, department, location, clockInTime, clockOutTime, breakStartTime, breakEndTime
🚀 ========== REGISTRATION ROUTE HANDLER CALLED ==========
🚀 This log should appear IMMEDIATELY when request arrives
🚀 ======================================================
🚀 ========== REGISTRATION REQUEST RECEIVED ==========
   📥 Request method: POST
   📥 Request URL: /register
   📥 Request body keys: [
  'name',           'surname',
  'idNumber',       'phoneNumber',
  'role',           'hostCompanyId',
  'department',     'location',
  'clockInTime',    'clockOutTime',
  'breakStartTime', 'breakEndTime'
]
   📥 Request files: [ 'image1', 'image2', 'image3', 'image4', 'image5', 'idImage' ]
   📥 Number of image files: 6
   📦 Detailed files info:
      image1: 1 file(s)
         File 1: photo1.jpg, 106150 bytes
      image2: 1 file(s)
         File 1: photo2.jpg, 109490 bytes
      image3: 1 file(s)
         File 1: photo3.jpg, 109603 bytes
      image4: 1 file(s)
         File 1: photo4.jpg, 110229 bytes
      image5: 1 file(s)
         File 1: photo5.jpg, 101575 bytes
      idImage: 1 file(s)
         File 1: id_document.jpg, 106335 bytes
   📋 Extracted form data: {
  name: 'France',
  surname: 'Mokoena',
  idNumber: '0212315697087',
  role: 'Intern',
  department: '6924083c5c89b172db1dc7bb',
  hostCompanyId: '692407cd5c89b172db1dc795',
  location: 'FERREIRA_STREET_MBOMBELA',
  customAddress: undefined,
  clockInTime: '07:30',
  clockOutTime: '04:30',
  breakStartTime: '13:00',
  breakEndTime: '14:00',
  extraHoursStartTime: undefined,
  extraHoursEndTime: undefined
}
✅ Location from dataset: 20 Ferreira Street, Mbombela (-25.475297, 30.982345)
   📸 Processing 5 images for registration (enterprise-grade accuracy)
📸 Processing registration for France Mokoena (ID: 0212315697087)
   Role: Intern, Phone: 0767789235, Location: 20 Ferreira Street, Mbombela
   Location coordinates: -25.475297, 30.982345
   ⚡ ENTERPRISE: Processing 5 face images SEQUENTIALLY (ONNX Runtime requires sequential inference)...
   📋 Validating 5 images before processing...
   📸 Image 1: buffer size = 106150 bytes, mimetype = image/jpeg
   📸 Image 2: buffer size = 109490 bytes, mimetype = image/jpeg
   📸 Image 3: buffer size = 109603 bytes, mimetype = image/jpeg
   📸 Image 4: buffer size = 110229 bytes, mimetype = image/jpeg
   📸 Image 5: buffer size = 101575 bytes, mimetype = image/jpeg
   ✅ All images validated
   ⚡ Processing image 1/5 (sequential)...
   📦 Image 1 buffer size: 106150 bytes
   🚀 Calling generateEmbedding for image 1...

📸 [REGISTER] Processing image 1/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 106150 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=59.1%, Sharpness=20.8%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 31ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (291ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 69.0%, 67.7%, 45.9%, 45.4%, 43.3%, 40.9%, 39.2%, 36.1%, 21.1%, 21.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [56.836, 75.300, 59.789, 78.058])
   📊 Found 2 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=69.0%, size=194x288px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=67.7%, size=198x245px (min: 85px)
   ✅ Found 2 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 76.1%, scores: 69.0% vs 67.7%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 69.0%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=194px, Quality=69.0%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 69.0%
   🏦 Cropping face: normalized (0.118, 0.228, 0.242, 0.270) → pixels (94, 243, 193, 287)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (9ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (268ms). Outputs: 683
✅ 512-d embedding generated in 810ms (0.8s)

✅ [REGISTER] Image 1 processed successfully
   ✅ Image 1 processed - Quality: 69.0%
   ⚡ Processing image 2/5 (sequential)...
   📦 Image 2 buffer size: 109490 bytes
   🚀 Calling generateEmbedding for image 2...

📸 [REGISTER] Processing image 2/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 109490 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=59.0%, Sharpness=19.2%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 30ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (274ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 70.7%, 68.2%, 56.5%, 54.1%, 50.9%, 47.1%, 28.0%, 21.9%, 19.9%, 19.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.323, 77.673, 62.449, 81.235])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=56.5%, size=211x301px (min: 85px)
   🔍 Detection 382: ✓ PASS - score=54.1%, size=165x298px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=70.7%, size=214x259px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=68.2%, size=165x260px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=50.9%, size=217x221px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 56.7%, scores: 70.7% vs 68.2%)
   🔄 Suppressed duplicate detection (IoU: 79.4%, scores: 70.7% vs 56.5%)
   🔄 Suppressed duplicate detection (IoU: 50.6%, scores: 70.7% vs 54.1%)
   🔄 Suppressed duplicate detection (IoU: 70.9%, scores: 70.7% vs 50.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 70.7%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=214px, Quality=70.7%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 70.7%
   🏦 Cropping face: normalized (0.077, 0.253, 0.268, 0.243) → pixels (61, 269, 214, 258)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (16ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (252ms). Outputs: 683
✅ 512-d embedding generated in 793ms (0.8s)

✅ [REGISTER] Image 2 processed successfully
   ✅ Image 2 processed - Quality: 70.7%
   ⚡ Processing image 3/5 (sequential)...
   📦 Image 3 buffer size: 109603 bytes
   🚀 Calling generateEmbedding for image 3...

📸 [REGISTER] Processing image 3/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 109603 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=60.6%, Sharpness=19.7%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (272ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 76.6%, 65.7%, 54.2%, 51.4%, 48.9%, 43.7%, 37.5%, 27.3%, 26.9%, 25.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.197, 77.887, 62.393, 81.748])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 376: ✓ PASS - score=51.4%, size=224x252px (min: 85px)
   🔍 Detection 378: ✓ PASS - score=76.6%, size=179x258px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=54.2%, size=142x259px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=65.7%, size=183x218px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 71.7%, scores: 76.6% vs 65.7%)
   🔄 Suppressed duplicate detection (IoU: 56.7%, scores: 76.6% vs 54.2%)
   🔄 Suppressed duplicate detection (IoU: 65.3%, scores: 76.6% vs 51.4%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 76.6%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=179px, Quality=76.6%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 76.6%
   🏦 Cropping face: normalized (0.108, 0.228, 0.223, 0.242) → pixels (86, 243, 178, 257)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (6ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (273ms). Outputs: 683
✅ 512-d embedding generated in 805ms (0.8s)

✅ [REGISTER] Image 3 processed successfully
   ✅ Image 3 processed - Quality: 76.6%
   ⚡ Processing image 4/5 (sequential)...
   📦 Image 4 buffer size: 110229 bytes
   🚀 Calling generateEmbedding for image 4...

📸 [REGISTER] Processing image 4/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 110229 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=59.9%, Sharpness=19.4%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 32ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (413ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 72.1%, 71.1%, 64.6%, 64.1%, 38.0%, 36.1%, 33.5%, 33.4%, 29.8%, 29.3%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.250, 79.031, 63.071, 82.809])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=71.1%, size=201x270px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=64.1%, size=157x271px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=72.1%, size=204x227px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=64.6%, size=160x230px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 75.5%, scores: 72.1% vs 71.1%)
   🔄 Suppressed duplicate detection (IoU: 59.7%, scores: 72.1% vs 64.6%)
   🔄 Suppressed duplicate detection (IoU: 50.3%, scores: 72.1% vs 64.1%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 72.1%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=204px, Quality=72.1%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 72.1%
   🏦 Cropping face: normalized (0.087, 0.268, 0.255, 0.213) → pixels (69, 286, 203, 226)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (15ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (301ms). Outputs: 683
✅ 512-d embedding generated in 998ms (1.0s)

✅ [REGISTER] Image 4 processed successfully
   ✅ Image 4 processed - Quality: 72.1%
   ⚡ Processing image 5/5 (sequential)...
   📦 Image 5 buffer size: 101575 bytes
   🚀 Calling generateEmbedding for image 5...

📸 [REGISTER] Processing image 5/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 101575 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=60.9%, Sharpness=17.1%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 31ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (296ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.8%, 64.0%, 63.1%, 53.4%, 45.2%, 43.7%, 35.8%, 32.0%, 26.0%, 22.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.529, 77.979, 62.620, 81.030])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 340: ✓ PASS - score=53.4%, size=171x297px (min: 85px)
   🔍 Detection 378: ✓ PASS - score=63.1%, size=218x257px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=77.8%, size=171x261px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=64.0%, size=175x218px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 74.7%, scores: 77.8% vs 64.0%)
   🔄 Suppressed duplicate detection (IoU: 61.8%, scores: 77.8% vs 63.1%)
   🔄 Suppressed duplicate detection (IoU: 79.8%, scores: 77.8% vs 53.4%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.8%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=171px, Quality=77.8%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 77.8%
   🏦 Cropping face: normalized (0.126, 0.236, 0.214, 0.244) → pixels (100, 251, 171, 260)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (19ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (259ms). Outputs: 683
✅ 512-d embedding generated in 867ms (0.9s)

✅ [REGISTER] Image 5 processed successfully
   ✅ Image 5 processed - Quality: 77.8%
   ⚡⚡⚡ Sequential processing completed in 4332ms - 5 embeddings generated
   📊 Average face quality: 73.2% (Image 1: 69.0%, Image 2: 70.7%, Image 3: 76.6%, Image 4: 72.1%, Image 5: 77.8%)
   🏦 Centroid template computed from 5/5 embeddings (weights: 0.191, 0.194, 0.209, 0.197, 0.209, norm: 0.898)
   🏦 Centroid template computed from 5 embeddings
   🆔 Processing ID document image (106335 bytes)...

📸 [REGISTER] Processing ID document image (REQUIRED)
🆔 ====== EXTRACTING ID DOCUMENT EMBEDDING ======
   📦 ID image buffer size: 106335 bytes
🏦 Applying canonical preprocessing for ID document...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x600, Brightness=47.2%, Sharpness=48.7%
   🏦 Canonical preprocessing: 800x600 → 800x600 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x600 → 800x600
🔍 Detecting face in ID document (using relaxed threshold for ID photos)...
   🔧 Using relaxed detection threshold: 30% (instead of 50%) for ID document
   🔧 Resizing for SCRFD detection: 800x600 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=1.067, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 800x600 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (348ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 7.7%, 6.6%, 6.2%, 5.8%, 5.8%, 5.2%, 5.1%, 4.9%, 4.5%, 4.4%
   🔍 Detection threshold: 30.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.966, 82.066, 63.076, 84.648])
   📊 Found 0 detections above threshold (30.0%)
   ✅ Found 0 faces with score > 30% (threshold: 30%)
   🔍 After NMS filtering: 0 unique face(s)
❌ Error extracting ID embedding: Error: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
    at detectFaces (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2137:11)
    at async generateIDEmbedding (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2545:20)
    at async C:\Clock-in\FaceClockBackend\routes\staff.js:515:33
   ❌ Failed to process ID document image (REQUIRED): No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 147ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 140ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 123ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 121ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 3248ms
📥 2025-12-01T09:50:13.839Z - POST /api/staff/login
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /login
📥 Full URL: /login
📥 Headers: {
  'content-type': 'application/json',
  'content-length': '42',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: username, password
📥 Files: none
📥 ===================================================
🔐 ========== LOGIN REQUEST RECEIVED ==========
🔐 Path: /login
🔐 Method: POST
🔐 Body: { username: 'admin', hasPassword: true }
🔐 Validating credentials for: admin
🔐 ✅ Admin login successful
📥 2025-12-01T09:50:14.122Z - GET /api/staff/admin/stats
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: GET
📥 Path: /admin/stats
📥 Full URL: /admin/stats
📥 Headers: {
  'content-type': undefined,
  'content-length': undefined,
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
⚡ Admin stats fetched in 94ms
📥 2025-12-01T09:50:18.306Z - GET /api/staff/admin/host-companies
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: GET
📥 Path: /admin/host-companies
📥 Full URL: /admin/host-companies
📥 Headers: {
  'content-type': undefined,
  'content-length': undefined,
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
📥 2025-12-01T09:50:18.555Z - GET /api/staff/admin/departments/all
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: GET
📥 Path: /admin/departments/all
📥 Full URL: /admin/departments/all
📥 Headers: {
  'content-type': undefined,
  'content-length': undefined,
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
📥 2025-12-01T09:50:18.623Z - GET /api/locations/all
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 127ms
📥 2025-12-01T09:51:58.581Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=197c114f-c63c-49e5-b90c-6587815eb0e7',
  'content-length': '284663',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 284457 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=39.3%, Sharpness=31.7%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 59ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (278ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 7.4%, 7.1%, 7.0%, 6.7%, 6.7%, 6.6%, 6.3%, 6.3%, 6.3%, 6.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [65.201, 88.766, 73.044, 95.218])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:01.315Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=184f0986-534f-48bc-aa7d-591517c5904e',
  'content-length': '192614',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 192408 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=37.6%, Sharpness=76.7%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 72ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (283ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 5.5%, 5.1%, 4.6%, 4.4%, 4.2%, 4.2%, 4.1%, 4.1%, 4.1%, 3.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [68.136, 92.164, 76.962, 98.030])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:03.478Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=fbdcf824-8a50-4eca-95f5-49bfd6209353',
  'content-length': '93643',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 93438 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=52.6%, Sharpness=16.9%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (258ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 5.7%, 4.6%, 4.5%, 4.4%, 4.2%, 4.2%, 4.2%, 3.9%, 3.8%, 3.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.082, 80.083, 63.517, 82.066])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:05.409Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=3d00eb74-ef22-4f7a-b57d-51387eb789bf',
  'content-length': '71758',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 71553 bytes
   🔧 Blurry image detected: Applying moderate enhancement...
   📊 Before: Variance=33.4, Sharpness=6.7%
   ✅ Image enhanced: sharpness improved from 6.7% to 40.7%
   📊 After: Variance=203.6, Sharpness=40.7%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=2592x1944, Brightness=49.1%, Sharpness=40.7%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (274ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 5.6%, 4.8%, 4.7%, 4.7%, 4.4%, 4.3%, 4.3%, 4.2%, 4.1%, 4.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [66.353, 89.201, 74.728, 97.364])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:08.834Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=ffb615ca-5272-4d94-b30c-822d77b655f5',
  'content-length': '74826',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 74621 bytes
   🔧 Blurry image detected: Applying moderate enhancement...
   📊 Before: Variance=22.3, Sharpness=4.5%
   ✅ Image enhanced: sharpness improved from 4.5% to 24.2%
   📊 After: Variance=121.0, Sharpness=24.2%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=2592x1944, Brightness=41.7%, Sharpness=24.2%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (274ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 5.2%, 4.9%, 4.7%, 4.5%, 4.4%, 4.3%, 4.3%, 4.3%, 4.2%, 4.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [63.384, 86.432, 69.774, 89.909])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:12.578Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=ee4596f8-9392-4e6d-b43e-11484521a749',
  'content-length': '197033',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 196827 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=41.8%, Sharpness=29.9%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (270ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 4.3%, 3.9%, 3.5%, 2.9%, 2.9%, 2.8%, 2.7%, 2.7%, 2.7%, 2.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [67.934, 92.875, 77.337, 99.558])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:14.479Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=40429f12-8390-423c-9f47-649134572a4d',
  'content-length': '166326',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 166120 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=53.9%, Sharpness=26.0%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (267ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 4.0%, 3.6%, 3.5%, 3.3%, 3.1%, 3.1%, 3.0%, 2.9%, 2.8%, 2.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [66.546, 90.443, 76.093, 95.591])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:16.427Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=1d604e60-0bed-4366-a769-cd4d9766754d',
  'content-length': '183645',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 183439 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=59.0%, Sharpness=19.8%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (265ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.4%, 3.2%, 3.1%, 3.1%, 2.9%, 2.9%, 2.7%, 2.6%, 2.0%, 1.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [63.734, 85.540, 70.078, 87.452])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:18.635Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=aa3c30fc-80ab-4349-b278-4262f1581aba',
  'content-length': '143844',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 143638 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=63.7%, Sharpness=14.1%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (292ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.7%, 3.5%, 3.4%, 2.9%, 2.9%, 2.8%, 2.7%, 2.6%, 2.5%, 2.3%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [65.330, 87.966, 72.090, 91.724])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:20.496Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=9326c3b1-047d-4812-b19d-452258e4c8f3',
  'content-length': '218009',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 217803 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=56.2%, Sharpness=29.8%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (270ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 6.2%, 5.9%, 5.7%, 5.6%, 5.5%, 5.5%, 5.4%, 5.3%, 5.3%, 5.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [67.689, 92.860, 77.221, 99.045])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:22.445Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=17882719-697a-4f61-aa95-bd4a680a2fe1',
  'content-length': '243073',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 242867 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=59.3%, Sharpness=25.7%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 64ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (284ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 9.8%, 9.7%, 9.5%, 9.5%, 7.8%, 7.6%, 7.4%, 7.2%, 6.0%, 6.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [68.561, 94.112, 77.675, 100.572])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:24.605Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=c76df2e6-d44d-4e35-8396-1f85b9aafc29',
  'content-length': '148223',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 148017 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=47.9%, Sharpness=12.7%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (289ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 5.3%, 5.1%, 5.1%, 5.0%, 4.9%, 4.8%, 4.8%, 4.7%, 4.7%, 4.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.263, 83.490, 67.741, 87.767])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:26.818Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=08bd60ec-5f16-4928-a936-a3bcf0bad75f',
  'content-length': '140011',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 139805 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=43.9%, Sharpness=14.8%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (292ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 8.4%, 7.5%, 7.2%, 6.8%, 6.7%, 6.3%, 5.9%, 5.8%, 5.5%, 5.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.529, 83.993, 64.968, 86.081])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:28.988Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=196f9acf-e9f5-4586-9467-b4b69f3a1cdc',
  'content-length': '166572',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 166366 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=59.8%, Sharpness=14.1%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (284ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 4.4%, 3.4%, 3.4%, 3.3%, 3.0%, 3.0%, 2.9%, 2.9%, 2.8%, 2.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.836, 84.837, 67.050, 85.931])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:31.195Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=a690a15c-fc61-4c4d-880e-18a031905895',
  'content-length': '168099',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 167893 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=60.0%, Sharpness=14.1%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (282ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.8%, 3.4%, 3.1%, 2.9%, 2.9%, 2.8%, 2.8%, 2.8%, 2.5%, 2.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.897, 83.622, 67.041, 84.575])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:33.487Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=e4ed2bbf-ff36-4a59-a388-e3ac2d04aa90',
  'content-length': '197648',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 197442 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=57.2%, Sharpness=20.9%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (288ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.6%, 3.2%, 3.0%, 3.0%, 2.9%, 2.8%, 2.8%, 2.6%, 2.1%, 2.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [64.121, 86.912, 70.301, 89.583])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:35.607Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=aa83db56-5ce8-453b-b5c9-e90a20bcc05f',
  'content-length': '190925',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 190719 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=57.3%, Sharpness=19.9%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (287ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.4%, 3.2%, 3.0%, 3.0%, 3.0%, 2.9%, 2.8%, 2.7%, 1.9%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.574, 84.140, 68.142, 85.415])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:37.545Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=5a0f28b0-14f5-406c-a20e-3909e905d83a',
  'content-length': '189338',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 189132 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=59.3%, Sharpness=20.1%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (259ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.5%, 3.2%, 3.0%, 3.0%, 3.0%, 3.0%, 2.9%, 2.7%, 2.0%, 1.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.644, 84.328, 68.805, 86.257])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:39.752Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=29566f87-b7e1-4d83-ba32-bf5eda16ac1c',
  'content-length': '178887',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 178681 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=58.8%, Sharpness=17.5%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (260ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.1%, 3.1%, 3.0%, 3.0%, 3.0%, 2.9%, 2.9%, 2.9%, 2.1%, 2.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.543, 78.682, 62.666, 78.774])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:41.921Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=dc2bbdd3-9b14-4412-8379-26c95646bc67',
  'content-length': '194472',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 194266 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=56.9%, Sharpness=22.6%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (293ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.0%, 3.0%, 3.0%, 3.0%, 2.9%, 2.9%, 2.9%, 2.9%, 2.0%, 2.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.917, 78.980, 62.413, 78.889])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:44.223Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=57a13671-761e-4ead-9701-47416e99299f',
  'content-length': '164857',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 164651 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=52.1%, Sharpness=17.6%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (291ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.1%, 3.1%, 3.0%, 2.9%, 2.9%, 2.8%, 2.8%, 2.8%, 1.9%, 1.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.653, 81.540, 64.537, 82.691])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:46.685Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=d870d817-9967-4ceb-abec-9fd1198c80fc',
  'content-length': '192751',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 192545 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=51.0%, Sharpness=21.7%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (285ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.0%, 3.0%, 3.0%, 2.9%, 2.8%, 2.8%, 2.8%, 2.6%, 1.9%, 1.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.690, 83.178, 66.547, 85.196])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:49.256Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=9dfbd8b1-f274-4bdf-9093-d40167918234',
  'content-length': '191431',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 191225 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=46.2%, Sharpness=25.8%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (308ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.1%, 3.1%, 3.0%, 3.0%, 2.9%, 2.8%, 2.8%, 2.8%, 1.8%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.864, 80.728, 63.787, 81.070])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:51.684Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=4ff3ab63-1e6d-4b59-9e2a-6a63ef76ed48',
  'content-length': '181538',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 181332 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=60.0%, Sharpness=23.0%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 34ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (260ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 4.2%, 4.0%, 3.9%, 3.4%, 3.1%, 3.1%, 3.1%, 3.0%, 3.0%, 2.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.598, 84.739, 66.824, 88.547])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:53.571Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=8a6bad67-1f87-4f1f-9732-98f88c916528',
  'content-length': '209095',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 208889 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=50.3%, Sharpness=33.7%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (296ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 4.6%, 3.9%, 3.4%, 3.0%, 2.9%, 2.8%, 2.7%, 2.7%, 2.6%, 2.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [65.681, 90.048, 74.405, 93.801])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:55.794Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=d2e26e12-fc23-4cb4-b4f3-6b6d944aa062',
  'content-length': '141713',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 141507 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=63.8%, Sharpness=19.4%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (276ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 6.4%, 5.6%, 5.4%, 4.8%, 4.7%, 4.6%, 4.5%, 3.5%, 3.4%, 3.3%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.175, 81.826, 64.865, 83.283])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:52:57.771Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=d38f68a4-1d89-407a-ada4-d57d6ab0b023',
  'content-length': '176835',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 176629 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=45.8%, Sharpness=21.1%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (300ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 4.9%, 4.5%, 4.4%, 4.2%, 4.0%, 3.9%, 3.8%, 3.6%, 3.4%, 3.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [68.092, 90.855, 73.987, 97.881])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:00.091Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=eedfd5a6-9fcd-4455-ae52-dff14e23e3a0',
  'content-length': '173099',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 172893 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=53.2%, Sharpness=32.5%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (286ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.7%, 3.4%, 3.4%, 3.3%, 3.0%, 3.0%, 2.9%, 2.9%, 2.7%, 2.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [56.466, 73.049, 58.045, 73.736])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:02.051Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=532910c5-ad19-4c97-904b-c8d59bd4920b',
  'content-length': '152629',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 152423 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=46.3%, Sharpness=18.4%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (285ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.2%, 3.0%, 2.9%, 2.8%, 2.6%, 2.6%, 2.5%, 2.5%, 2.3%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.312, 83.264, 66.234, 85.373])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:03.963Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=3aec843a-2a89-4e47-926d-bc21fdf8e00e',
  'content-length': '181109',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 180903 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=46.0%, Sharpness=28.5%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (280ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 6.7%, 4.5%, 4.5%, 3.7%, 3.6%, 3.4%, 3.1%, 3.0%, 3.0%, 3.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [68.846, 95.553, 82.075, 106.447])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:05.877Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=5d08a4b4-4850-4065-a595-5486e598d5d6',
  'content-length': '134254',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 134048 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=40.9%, Sharpness=15.2%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 31ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (262ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.6%, 3.3%, 3.1%, 3.1%, 2.9%, 2.8%, 2.6%, 2.4%, 2.1%, 2.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.493, 81.436, 64.566, 82.800])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:07.833Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=6eaebd17-f9eb-4d29-b85e-c920f51d048d',
  'content-length': '133721',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 133515 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=47.1%, Sharpness=12.6%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 32ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (260ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.9%, 3.9%, 3.7%, 3.0%, 2.7%, 2.7%, 2.7%, 2.5%, 2.5%, 2.5%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [65.821, 88.301, 71.336, 93.181])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:09.763Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=d5a291ec-502a-4cb6-9860-8380620fcd15',
  'content-length': '198339',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 198133 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=46.6%, Sharpness=20.2%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (273ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 4.1%, 3.4%, 3.4%, 2.8%, 2.8%, 2.7%, 2.7%, 2.6%, 2.5%, 2.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.816, 84.641, 68.763, 87.205])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:11.909Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=4d361f16-9566-4207-9eae-2b090db2f3a4',
  'content-length': '140501',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 140295 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=44.1%, Sharpness=14.2%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (276ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.1%, 3.0%, 2.8%, 2.8%, 2.7%, 2.7%, 2.5%, 1.8%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.214, 80.763, 64.971, 82.144])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:13.740Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=cbb0ca2e-129b-4745-adb9-855283687515',
  'content-length': '152419',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 152213 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=43.1%, Sharpness=14.2%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (309ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.3%, 3.2%, 3.0%, 2.8%, 2.8%, 2.6%, 2.6%, 2.0%, 2.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [63.732, 85.534, 69.192, 88.603])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:15.740Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=159467f9-0cf5-4866-98c4-8b26529c9654',
  'content-length': '153555',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 153349 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=47.1%, Sharpness=16.3%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 33ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (300ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.9%, 3.6%, 3.2%, 2.9%, 2.9%, 2.9%, 2.8%, 2.8%, 2.8%, 2.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [63.843, 84.791, 69.121, 89.071])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:17.878Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=cc88bf3f-9c66-4d71-b609-4ffeb4c8185c',
  'content-length': '214865',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 214659 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=46.8%, Sharpness=24.5%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (273ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.4%, 3.1%, 3.0%, 3.0%, 2.9%, 2.8%, 2.7%, 2.5%, 2.0%, 1.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.312, 81.248, 64.175, 81.978])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:20.107Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=d9e2745a-ccbe-42be-8e33-d0fa94b22254',
  'content-length': '189618',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 189412 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=46.3%, Sharpness=19.2%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (264ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.5%, 3.4%, 3.2%, 2.8%, 2.8%, 2.7%, 2.7%, 2.6%, 2.1%, 2.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [64.855, 86.161, 69.197, 89.518])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:21.999Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=6ad8f7f2-f56f-4087-ae35-0111adb92c73',
  'content-length': '128203',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 127997 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=40.6%, Sharpness=24.9%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (285ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 7.1%, 5.5%, 4.9%, 4.8%, 4.5%, 4.4%, 4.2%, 4.2%, 4.2%, 3.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [66.814, 89.019, 72.805, 98.705])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:24.526Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=4e5e7e36-2b8a-4af1-9155-c8c51a7f17e7',
  'content-length': '89723',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 89518 bytes
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'lighting' ],
  feedback: 'Lighting issue detected. Please adjust lighting.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:25.997Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=a07249b5-23b9-4ec1-9e5b-9ba9953142fe',
  'content-length': '105475',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 105269 bytes
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'lighting' ],
  feedback: 'Lighting issue detected. Please adjust lighting.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:27.590Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=b3e312f2-90a2-4568-a580-df2c2be663da',
  'content-length': '103466',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 103260 bytes
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'lighting' ],
  feedback: 'Lighting issue detected. Please adjust lighting.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:29.093Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=6cfcd76c-48ed-4cdc-83bb-59bf6b0c91ea',
  'content-length': '102992',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 102786 bytes
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'lighting' ],
  feedback: 'Lighting issue detected. Please adjust lighting.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:30.394Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=8fd54396-f44d-4772-8cc7-e8f10e842d46',
  'content-length': '104730',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 104524 bytes
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'lighting' ],
  feedback: 'Lighting issue detected. Please adjust lighting.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:31.918Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=c993ae8e-58cd-4b28-bd4e-f726fadeda57',
  'content-length': '76814',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 76609 bytes
   🔧 Blurry image detected: Applying moderate enhancement...
   📊 Before: Variance=21.0, Sharpness=4.2%
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 153ms
   ✅ Image enhanced: sharpness improved from 4.2% to 23.8%
   📊 After: Variance=119.1, Sharpness=23.8%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=48.9%, Sharpness=23.8%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (282ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 10.1%, 10.0%, 9.0%, 8.3%, 7.8%, 7.7%, 7.0%, 6.7%, 6.3%, 6.3%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [68.526, 93.342, 77.252, 102.143])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:36.423Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=35eadf47-a6e2-4e64-b981-9b4e21f34f59',
  'content-length': '125757',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 125551 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=54.1%, Sharpness=16.6%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 25ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (289ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 5.8%, 5.5%, 5.4%, 5.2%, 4.9%, 4.8%, 4.7%, 4.7%, 4.7%, 4.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.221, 82.372, 63.536, 85.284])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:38.360Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=b33c72d1-6e66-434d-b091-aac0bbc18ae5',
  'content-length': '143265',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 143059 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=61.8%, Sharpness=24.8%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (262ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 11.9%, 10.3%, 9.9%, 9.8%, 9.7%, 9.1%, 9.0%, 8.9%, 8.5%, 8.3%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.967, 82.499, 63.546, 84.845])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:40.508Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=fa6ab739-f0b6-4678-88b1-47a8f1a3d8ff',
  'content-length': '198612',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 198406 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=53.5%, Sharpness=37.1%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (276ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 9.9%, 9.6%, 8.4%, 7.7%, 7.5%, 7.0%, 6.8%, 6.7%, 6.6%, 6.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.949, 86.145, 67.470, 90.420])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:42.699Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=c846ba24-a860-4d93-8c0c-36ea75920da7',
  'content-length': '254941',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 254735 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=60.0%, Sharpness=35.4%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (293ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 7.5%, 7.2%, 6.3%, 5.9%, 5.7%, 5.3%, 5.1%, 4.9%, 4.8%, 4.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.057, 81.940, 63.732, 85.416])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:53:44.800Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=f3f1dc9a-a75e-40c8-886b-f837f19ee8ee',
  'content-length': '255475',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 255269 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=2592x1944, Brightness=61.3%, Sharpness=34.5%
   🏦 Canonical preprocessing: 2592x1944 → 2592x1944 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 2592x1944 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 2592x1944 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (295ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 8.1%, 6.5%, 6.3%, 6.1%, 5.5%, 5.5%, 5.5%, 5.2%, 4.6%, 4.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.466, 80.687, 63.216, 84.276])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 142ms
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 131ms
📥 2025-12-01T09:58:29.844Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=39a27ef8-2267-4327-a9d5-6fdaea9c3b10',
  'content-length': '64697',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 64492 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=10.4, Sharpness=2.1%
   ✅ Image enhanced: sharpness improved from 2.1% to 15.8%
   📊 After: Variance=79.0, Sharpness=15.8%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=86.0%, Sharpness=15.8%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 25ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (278ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 75.2%, 66.4%, 63.9%, 55.0%, 52.1%, 40.9%, 40.1%, 30.8%, 29.3%, 22.5%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.371, 83.144, 67.125, 87.475])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 422: ✓ PASS - score=52.1%, size=361x698px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=66.4%, size=461x624px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=75.2%, size=357x636px (min: 85px)
   🔍 Detection 500: ✓ PASS - score=55.0%, size=469x546px (min: 85px)
   🔍 Detection 502: ✓ PASS - score=63.9%, size=364x545px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 62.3%, scores: 75.2% vs 66.4%)
   🔄 Suppressed duplicate detection (IoU: 75.7%, scores: 75.2% vs 63.9%)
   🔄 Suppressed duplicate detection (IoU: 56.4%, scores: 75.2% vs 55.0%)
   🔄 Suppressed duplicate detection (IoU: 78.1%, scores: 75.2% vs 52.1%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 75.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=357px, Quality=75.2%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2068ms, ready: true, quality: 75.2%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 75,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:58:33.229Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=5da9ec43-7ad9-4dd9-a878-d3f857c398c4',
  'content-length': '85992',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 85787 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=14.6, Sharpness=2.9%
   ✅ Image enhanced: sharpness improved from 2.9% to 25.5%
   📊 After: Variance=127.3, Sharpness=25.5%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=82.5%, Sharpness=25.5%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (261ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 76.8%, 72.3%, 63.3%, 57.1%, 55.8%, 49.8%, 28.2%, 22.0%, 21.0%, 20.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.120, 80.390, 64.978, 84.398])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=57.1%, size=480x707px (min: 85px)
   🔍 Detection 382: ✓ PASS - score=63.3%, size=385x706px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=72.3%, size=485x628px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=76.8%, size=380x629px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=55.8%, size=385x537px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 60.9%, scores: 76.8% vs 72.3%)
   🔄 Suppressed duplicate detection (IoU: 77.1%, scores: 76.8% vs 63.3%)
   🔄 Suppressed duplicate detection (IoU: 50.9%, scores: 76.8% vs 57.1%)
   🔄 Suppressed duplicate detection (IoU: 80.4%, scores: 76.8% vs 55.8%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 76.8%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=380px, Quality=76.8%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2900ms, ready: true, quality: 76.8%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 77,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:58:37.248Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=4ceb6f3e-bcad-4149-ac55-5192df6aa2c3',
  'content-length': '84451',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 84246 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=17.0, Sharpness=3.4%
   ✅ Image enhanced: sharpness improved from 3.4% to 29.4%
   📊 After: Variance=146.8, Sharpness=29.4%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=84.8%, Sharpness=29.4%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (285ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 79.3%, 68.9%, 67.3%, 55.5%, 50.1%, 37.9%, 36.9%, 26.5%, 26.1%, 20.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.208, 80.392, 65.039, 84.257])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 420: ✓ PASS - score=50.1%, size=409x687px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=79.3%, size=411x614px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=68.9%, size=311x606px (min: 85px)
   🔍 Detection 500: ✓ PASS - score=67.3%, size=415x519px (min: 85px)
   🔍 Detection 502: ✓ PASS - score=55.5%, size=315x517px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 54.5%, scores: 79.3% vs 68.9%)
   🔄 Suppressed duplicate detection (IoU: 73.1%, scores: 79.3% vs 67.3%)
   🔄 Suppressed duplicate detection (IoU: 46.6%, scores: 79.3% vs 55.5%)
   🔄 Suppressed duplicate detection (IoU: 74.7%, scores: 79.3% vs 50.1%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 79.3%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=411px, Quality=79.3%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2115ms, ready: true, quality: 79.3%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 79,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:58:39.812Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=e9e6d7a2-0095-4646-9b6e-7efc67422bd3',
  'content-length': '68468',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 68263 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=8.8, Sharpness=1.8%
   ✅ Image enhanced: sharpness improved from 1.8% to 14.6%
   📊 After: Variance=72.9, Sharpness=14.6%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=85.5%, Sharpness=14.6%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (281ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 75.7%, 75.1%, 58.2%, 56.5%, 42.5%, 41.9%, 30.9%, 25.4%, 18.4%, 16.5%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.814, 80.205, 64.684, 84.585])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 418: ✓ PASS - score=75.1%, size=454x568px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=75.7%, size=353x574px (min: 85px)
   🔍 Detection 458: ✓ PASS - score=58.2%, size=454x480px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=56.5%, size=357x480px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 58.5%, scores: 75.7% vs 75.1%)
   🔄 Suppressed duplicate detection (IoU: 48.4%, scores: 75.7% vs 58.2%)
   🔄 Suppressed duplicate detection (IoU: 69.4%, scores: 75.7% vs 56.5%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 75.7%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=353px, Quality=75.7%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2062ms, ready: true, quality: 75.7%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 76,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:58:42.984Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=eb279be0-c38c-4a94-8653-cd7f294594d2',
  'content-length': '90861',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 90656 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=18.2, Sharpness=3.6%
   ✅ Image enhanced: sharpness improved from 3.6% to 32.1%
   📊 After: Variance=160.5, Sharpness=32.1%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=82.7%, Sharpness=32.1%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 25ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (272ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 74.0%, 66.1%, 66.1%, 56.9%, 45.7%, 36.0%, 35.4%, 28.3%, 26.9%, 20.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.115, 77.231, 61.851, 80.596])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=56.9%, size=521x687px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=66.1%, size=412x694px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=66.1%, size=532x601px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=74.0%, size=412x601px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 61.6%, scores: 74.0% vs 66.1%)
   🔄 Suppressed duplicate detection (IoU: 75.0%, scores: 74.0% vs 66.1%)
   🔄 Suppressed duplicate detection (IoU: 49.5%, scores: 74.0% vs 56.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 74.0%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=412px, Quality=74.0%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2177ms, ready: true, quality: 74.0%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 74,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:58:45.797Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=42c86d4e-d453-4193-8221-702ab499ee58',
  'content-length': '111953',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 111747 bytes
   🔧 Blurry image detected: Applying moderate enhancement...
   📊 Before: Variance=28.8, Sharpness=5.8%
   ✅ Image enhanced: sharpness improved from 5.8% to 40.8%
   📊 After: Variance=203.9, Sharpness=40.8%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=81.1%, Sharpness=40.8%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 25ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (280ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 72.6%, 64.9%, 64.5%, 55.8%, 46.9%, 38.9%, 29.9%, 27.1%, 23.5%, 22.5%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.186, 78.524, 63.452, 82.160])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=55.8%, size=509x722px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=64.9%, size=405x720px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=64.5%, size=511x640px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=72.6%, size=400x636px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 77.0%, scores: 72.6% vs 64.9%)
   🔄 Suppressed duplicate detection (IoU: 63.4%, scores: 72.6% vs 64.5%)
   🔄 Suppressed duplicate detection (IoU: 52.2%, scores: 72.6% vs 55.8%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 72.6%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=400px, Quality=72.6%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2208ms, ready: true, quality: 72.6%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 73,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:58:50.228Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=0a58d289-427d-4d4e-8d65-fa65755432d4',
  'content-length': '77019',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 76814 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=12.2, Sharpness=2.4%
   ✅ Image enhanced: sharpness improved from 2.4% to 20.2%
   📊 After: Variance=101.0, Sharpness=20.2%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=84.2%, Sharpness=20.2%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (286ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 78.9%, 72.8%, 65.9%, 54.5%, 48.2%, 42.0%, 36.2%, 26.1%, 18.8%, 16.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.210, 80.389, 64.685, 84.412])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=65.9%, size=420x670px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=54.5%, size=324x663px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=78.9%, size=425x571px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=72.8%, size=319x565px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 57.4%, scores: 78.9% vs 72.8%)
   🔄 Suppressed duplicate detection (IoU: 73.1%, scores: 78.9% vs 65.9%)
   🔄 Suppressed duplicate detection (IoU: 46.7%, scores: 78.9% vs 54.5%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 78.9%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=425px, Quality=78.9%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2117ms, ready: true, quality: 78.9%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 79,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:58:54.746Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=e79dc169-d22e-4952-ac14-387ce05c2f9c',
  'content-length': '81715',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 81510 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=14.3, Sharpness=2.9%
   ✅ Image enhanced: sharpness improved from 2.9% to 24.8%
   📊 After: Variance=124.1, Sharpness=24.8%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=83.9%, Sharpness=24.8%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 24ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (267ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 78.9%, 73.4%, 61.6%, 55.4%, 45.1%, 36.8%, 31.8%, 18.6%, 18.6%, 18.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.118, 79.055, 63.340, 82.742])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 376: ✓ PASS - score=78.9%, size=429x562px (min: 85px)
   🔍 Detection 378: ✓ PASS - score=73.4%, size=329x566px (min: 85px)
   🔍 Detection 416: ✓ PASS - score=61.6%, size=436x472px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=55.4%, size=339x475px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 55.4%, scores: 78.9% vs 73.4%)
   🔄 Suppressed duplicate detection (IoU: 66.8%, scores: 78.9% vs 61.6%)
   🔄 Suppressed duplicate detection (IoU: 42.0%, scores: 78.9% vs 55.4%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 78.9%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=429px, Quality=78.9%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2100ms, ready: true, quality: 78.9%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 79,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:58:57.877Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=e4b9b49f-c071-45d2-946b-080e29d89d5d',
  'content-length': '89898',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 89693 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=19.1, Sharpness=3.8%
   ✅ Image enhanced: sharpness improved from 3.8% to 33.8%
   📊 After: Variance=169.2, Sharpness=33.8%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=84.5%, Sharpness=33.8%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (337ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 82.9%, 59.6%, 58.2%, 57.5%, 57.3%, 34.4%, 32.1%, 31.9%, 30.8%, 14.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.717, 79.744, 64.184, 83.449])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 340: ✓ PASS - score=58.2%, size=391x645px (min: 85px)
   🔍 Detection 378: ✓ PASS - score=59.6%, size=500x549px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=82.9%, size=392x548px (min: 85px)
   🔍 Detection 382: ✓ PASS - score=57.3%, size=299x547px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=57.5%, size=399x457px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 63.2%, scores: 82.9% vs 59.6%)
   🔄 Suppressed duplicate detection (IoU: 74.6%, scores: 82.9% vs 58.2%)
   🔄 Suppressed duplicate detection (IoU: 66.2%, scores: 82.9% vs 57.5%)
   🔄 Suppressed duplicate detection (IoU: 57.5%, scores: 82.9% vs 57.3%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 82.9%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=392px, Quality=82.9%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2214ms, ready: true, quality: 82.9%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 83,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T09:59:11.307Z - POST /api/staff/register
   📦 Body keys:
   📦 Files: none
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /register
📥 Full URL: /register
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=b466fbed-3251-441a-b2fa-a98f7d19cf30',
  'content-length': '641107',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================

📦 [MULTER] Files parsed: 6 field(s)
📦 [MULTER] Field "image1": 1 file(s)
   📦 File 1: photo1.jpg, 97021 bytes, image/jpeg
📦 [MULTER] Field "image2": 1 file(s)
   📦 File 1: photo2.jpg, 93721 bytes, image/jpeg
📦 [MULTER] Field "image3": 1 file(s)
   📦 File 1: photo3.jpg, 118412 bytes, image/jpeg
📦 [MULTER] Field "image4": 1 file(s)
   📦 File 1: photo4.jpg, 105192 bytes, image/jpeg
📦 [MULTER] Field "image5": 1 file(s)
   📦 File 1: photo5.jpg, 98186 bytes, image/jpeg
📦 [MULTER] Field "idImage": 1 file(s)
   📦 File 1: id_document.jpg, 126036 bytes, image/jpeg
📦 [MULTER] req.body keys: name, surname, idNumber, phoneNumber, role, hostCompanyId, department, location, clockInTime, clockOutTime, breakStartTime, breakEndTime
🚀 ========== REGISTRATION ROUTE HANDLER CALLED ==========
🚀 This log should appear IMMEDIATELY when request arrives
🚀 ======================================================
🚀 ========== REGISTRATION REQUEST RECEIVED ==========
   📥 Request method: POST
   📥 Request URL: /register
   📥 Request body keys: [
  'name',           'surname',
  'idNumber',       'phoneNumber',
  'role',           'hostCompanyId',
  'department',     'location',
  'clockInTime',    'clockOutTime',
  'breakStartTime', 'breakEndTime'
]
   📥 Request files: [ 'image1', 'image2', 'image3', 'image4', 'image5', 'idImage' ]
   📥 Number of image files: 6
   📦 Detailed files info:
      image1: 1 file(s)
         File 1: photo1.jpg, 97021 bytes
      image2: 1 file(s)
         File 1: photo2.jpg, 93721 bytes
      image3: 1 file(s)
         File 1: photo3.jpg, 118412 bytes
      image4: 1 file(s)
         File 1: photo4.jpg, 105192 bytes
      image5: 1 file(s)
         File 1: photo5.jpg, 98186 bytes
      idImage: 1 file(s)
         File 1: id_document.jpg, 126036 bytes
   📋 Extracted form data: {
  name: 'France Witness',
  surname: 'Mokoena',
  idNumber: '0212315697087',
  role: 'Intern',
  department: '69232b9486294f1572e54fff',
  hostCompanyId: '6922e68dbfdc65105e5c5bcf',
  location: 'FERREIRA_STREET_MBOMBELA',
  customAddress: undefined,
  clockInTime: '07:29',
  clockOutTime: '04:30',
  breakStartTime: '13:00',
  breakEndTime: '14:00',
  extraHoursStartTime: undefined,
  extraHoursEndTime: undefined
}
✅ Location from dataset: 20 Ferreira Street, Mbombela (-25.475297, 30.982345)
   📸 Processing 5 images for registration (enterprise-grade accuracy)
📸 Processing registration for France Witness Mokoena (ID: 0212315697087)
   Role: Intern, Phone: 0767789235, Location: 20 Ferreira Street, Mbombela
   Location coordinates: -25.475297, 30.982345
   ⚡ ENTERPRISE: Processing 5 face images SEQUENTIALLY (ONNX Runtime requires sequential inference)...
   📋 Validating 5 images before processing...
   📸 Image 1: buffer size = 97021 bytes, mimetype = image/jpeg
   📸 Image 2: buffer size = 93721 bytes, mimetype = image/jpeg
   📸 Image 3: buffer size = 118412 bytes, mimetype = image/jpeg
   📸 Image 4: buffer size = 105192 bytes, mimetype = image/jpeg
   📸 Image 5: buffer size = 98186 bytes, mimetype = image/jpeg
   ✅ All images validated
   ⚡ Processing image 1/5 (sequential)...
   📦 Image 1 buffer size: 97021 bytes
   🚀 Calling generateEmbedding for image 1...

📸 [REGISTER] Processing image 1/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 97021 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=84.3%, Sharpness=26.2%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (280ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.1%, 76.5%, 58.7%, 57.4%, 51.2%, 51.2%, 23.5%, 21.6%, 17.0%, 16.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.048, 79.944, 64.540, 83.654])
   📊 Found 6 detections above threshold (50.0%)
   🔍 Detection 420: ✓ PASS - score=58.7%, size=178x276px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=57.4%, size=137x274px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=77.1%, size=180x243px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=76.5%, size=138x243px (min: 85px)
   🔍 Detection 500: ✓ PASS - score=51.2%, size=182x206px (min: 85px)
   🔍 Detection 502: ✓ PASS - score=51.2%, size=142x206px (min: 85px)
   ✅ Found 6 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 57.7%, scores: 77.1% vs 76.5%)
   🔄 Suppressed duplicate detection (IoU: 74.6%, scores: 77.1% vs 58.7%)
   🔄 Suppressed duplicate detection (IoU: 46.9%, scores: 77.1% vs 57.4%)
   🔄 Suppressed duplicate detection (IoU: 47.4%, scores: 77.1% vs 51.2%)
   🔄 Suppressed duplicate detection (IoU: 76.5%, scores: 77.1% vs 51.2%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.1%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=180px, Quality=77.1%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 77.1%
   🏦 Cropping face: normalized (0.060, 0.245, 0.225, 0.228) → pixels (48, 261, 180, 242)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (27ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (274ms). Outputs: 683
✅ 512-d embedding generated in 815ms (0.8s)

✅ [REGISTER] Image 1 processed successfully
   ✅ Image 1 processed - Quality: 77.1%
   ⚡ Processing image 2/5 (sequential)...
   📦 Image 2 buffer size: 93721 bytes
   🚀 Calling generateEmbedding for image 2...

📸 [REGISTER] Processing image 2/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 93721 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=82.5%, Sharpness=19.6%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 36ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (266ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.2%, 63.4%, 61.7%, 51.4%, 47.8%, 40.3%, 38.0%, 25.5%, 21.1%, 18.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.342, 77.303, 61.898, 80.624])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=61.7%, size=195x298px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=77.2%, size=197x258px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=63.4%, size=155x261px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=51.4%, size=199x221px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 59.3%, scores: 77.2% vs 63.4%)
   🔄 Suppressed duplicate detection (IoU: 77.5%, scores: 77.2% vs 61.7%)
   🔄 Suppressed duplicate detection (IoU: 73.8%, scores: 77.2% vs 51.4%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=197px, Quality=77.2%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 77.2%
   🏦 Cropping face: normalized (0.095, 0.254, 0.246, 0.242) → pixels (76, 270, 196, 258)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (14ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (270ms). Outputs: 683
✅ 512-d embedding generated in 790ms (0.8s)

✅ [REGISTER] Image 2 processed successfully
   ✅ Image 2 processed - Quality: 77.2%
   ⚡ Processing image 3/5 (sequential)...
   📦 Image 3 buffer size: 118412 bytes
   🚀 Calling generateEmbedding for image 3...

📸 [REGISTER] Processing image 3/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 118412 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=80.9%, Sharpness=35.8%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (302ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.2%, 61.5%, 61.4%, 53.7%, 52.9%, 36.1%, 36.1%, 35.5%, 35.3%, 22.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.819, 79.616, 64.263, 83.278])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=61.5%, size=186x308px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=52.9%, size=225x271px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=77.2%, size=182x274px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=53.7%, size=142x268px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=61.4%, size=183x233px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 77.7%, scores: 77.2% vs 61.5%)
   🔄 Suppressed duplicate detection (IoU: 75.7%, scores: 77.2% vs 61.4%)
   🔄 Suppressed duplicate detection (IoU: 54.0%, scores: 77.2% vs 53.7%)
   🔄 Suppressed duplicate detection (IoU: 66.7%, scores: 77.2% vs 52.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=182px, Quality=77.2%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 77.2%
   🏦 Cropping face: normalized (0.110, 0.252, 0.227, 0.257) → pixels (88, 268, 181, 273)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (7ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (260ms). Outputs: 683
✅ 512-d embedding generated in 783ms (0.8s)

✅ [REGISTER] Image 3 processed successfully
   ✅ Image 3 processed - Quality: 77.2%
   ⚡ Processing image 4/5 (sequential)...
   📦 Image 4 buffer size: 105192 bytes
   🚀 Calling generateEmbedding for image 4...

📸 [REGISTER] Processing image 4/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 105192 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=83.7%, Sharpness=28.4%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (290ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 81.1%, 73.5%, 60.0%, 58.6%, 51.2%, 50.0%, 31.5%, 19.6%, 17.2%, 17.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.071, 80.302, 65.028, 84.274])
   📊 Found 6 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=50.0%, size=186x277px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=58.6%, size=147x278px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=73.5%, size=191x246px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=81.1%, size=147x246px (min: 85px)
   🔍 Detection 458: ✓ PASS - score=51.2%, size=189x208px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=60.0%, size=148x208px (min: 85px)
   ✅ Found 6 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 60.4%, scores: 81.1% vs 73.5%)
   🔄 Suppressed duplicate detection (IoU: 75.5%, scores: 81.1% vs 60.0%)
   🔄 Suppressed duplicate detection (IoU: 73.3%, scores: 81.1% vs 58.6%)
   🔄 Suppressed duplicate detection (IoU: 52.0%, scores: 81.1% vs 51.2%)
   🔄 Suppressed duplicate detection (IoU: 47.2%, scores: 81.1% vs 50.0%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 81.1%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=147px, Quality=81.1%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 81.1%
   🏦 Cropping face: normalized (0.129, 0.243, 0.183, 0.231) → pixels (103, 258, 146, 246)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (13ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (276ms). Outputs: 683
✅ 512-d embedding generated in 813ms (0.8s)

✅ [REGISTER] Image 4 processed successfully
   ✅ Image 4 processed - Quality: 81.1%
   ⚡ Processing image 5/5 (sequential)...
   📦 Image 5 buffer size: 98186 bytes
   🚀 Calling generateEmbedding for image 5...

📸 [REGISTER] Processing image 5/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 98186 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=84.3%, Sharpness=25.5%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (269ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.8%, 69.8%, 63.0%, 52.3%, 45.1%, 43.7%, 33.2%, 27.8%, 25.0%, 17.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.670, 79.553, 63.987, 83.164])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=77.8%, size=169x247px (min: 85px)
   🔍 Detection 382: ✓ PASS - score=63.0%, size=131x249px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=69.8%, size=172x209px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=52.3%, size=134x212px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 68.0%, scores: 77.8% vs 69.8%)
   🔄 Suppressed duplicate detection (IoU: 55.1%, scores: 77.8% vs 63.0%)
   🔄 Suppressed duplicate detection (IoU: 45.2%, scores: 77.8% vs 52.3%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.8%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=169px, Quality=77.8%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 77.8%
   🏦 Cropping face: normalized (0.092, 0.216, 0.211, 0.232) → pixels (73, 229, 168, 247)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (12ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (269ms). Outputs: 683
✅ 512-d embedding generated in 773ms (0.8s)

✅ [REGISTER] Image 5 processed successfully
   ✅ Image 5 processed - Quality: 77.8%
   ⚡⚡⚡ Sequential processing completed in 4041ms - 5 embeddings generated
   📊 Average face quality: 78.1% (Image 1: 77.1%, Image 2: 77.2%, Image 3: 77.2%, Image 4: 81.1%, Image 5: 77.8%)
   🏦 Centroid template computed from 5/5 embeddings (weights: 0.197, 0.191, 0.206, 0.208, 0.198, norm: 0.961)
   🏦 Centroid template computed from 5 embeddings
   🆔 Processing ID document image (126036 bytes)...

📸 [REGISTER] Processing ID document image (REQUIRED)
🆔 ====== EXTRACTING ID DOCUMENT EMBEDDING ======
   📦 ID image buffer size: 126036 bytes
🏦 Applying canonical preprocessing for ID document...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x600, Brightness=60.4%, Sharpness=71.8%
   🏦 Canonical preprocessing: 800x600 → 800x600 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x600 → 800x600
🔍 Detecting face in ID document (using relaxed threshold for ID photos)...
   🔧 Using relaxed detection threshold: 30% (instead of 50%) for ID document
   🔧 Resizing for SCRFD detection: 800x600 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=1.067, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 800x600 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (259ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 8.3%, 7.2%, 6.7%, 6.7%, 6.4%, 6.4%, 6.4%, 6.3%, 6.0%, 5.8%
   🔍 Detection threshold: 30.0%
   🔍 Detected box format: pixel_center_size (first box values: [65.547, 90.923, 74.403, 98.771])
   📊 Found 0 detections above threshold (30.0%)
   ✅ Found 0 faces with score > 30% (threshold: 30%)
   🔍 After NMS filtering: 0 unique face(s)
❌ Error extracting ID embedding: Error: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
    at detectFaces (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2137:11)
    at async generateIDEmbedding (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2545:20)
    at async C:\Clock-in\FaceClockBackend\routes\staff.js:515:33
   ❌ Failed to process ID document image (REQUIRED): No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 144ms
📥 2025-12-01T09:59:47.105Z - POST /api/staff/register
   📦 Body keys:
   📦 Files: none
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /register
📥 Full URL: /register
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=db7e4732-f403-4ff1-9574-443c5f1ee235',
  'content-length': '657550',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================

📦 [MULTER] Files parsed: 6 field(s)
📦 [MULTER] Field "image1": 1 file(s)
   📦 File 1: photo1.jpg, 97021 bytes, image/jpeg
📦 [MULTER] Field "image2": 1 file(s)
   📦 File 1: photo2.jpg, 93721 bytes, image/jpeg
📦 [MULTER] Field "image3": 1 file(s)
   📦 File 1: photo3.jpg, 118412 bytes, image/jpeg
📦 [MULTER] Field "image4": 1 file(s)
   📦 File 1: photo4.jpg, 105192 bytes, image/jpeg
📦 [MULTER] Field "image5": 1 file(s)
   📦 File 1: photo5.jpg, 114628 bytes, image/jpeg
📦 [MULTER] Field "idImage": 1 file(s)
   📦 File 1: id_document.jpg, 126036 bytes, image/jpeg
📦 [MULTER] req.body keys: name, surname, idNumber, phoneNumber, role, hostCompanyId, department, location, clockInTime, clockOutTime, breakStartTime, breakEndTime
🚀 ========== REGISTRATION ROUTE HANDLER CALLED ==========
🚀 This log should appear IMMEDIATELY when request arrives
🚀 ======================================================
🚀 ========== REGISTRATION REQUEST RECEIVED ==========
   📥 Request method: POST
   📥 Request URL: /register
   📥 Request body keys: [
  'name',           'surname',
  'idNumber',       'phoneNumber',
  'role',           'hostCompanyId',
  'department',     'location',
  'clockInTime',    'clockOutTime',
  'breakStartTime', 'breakEndTime'
]
   📥 Request files: [ 'image1', 'image2', 'image3', 'image4', 'image5', 'idImage' ]
   📥 Number of image files: 6
   📦 Detailed files info:
      image1: 1 file(s)
         File 1: photo1.jpg, 97021 bytes
      image2: 1 file(s)
         File 1: photo2.jpg, 93721 bytes
      image3: 1 file(s)
         File 1: photo3.jpg, 118412 bytes
      image4: 1 file(s)
         File 1: photo4.jpg, 105192 bytes
      image5: 1 file(s)
         File 1: photo5.jpg, 114628 bytes
      idImage: 1 file(s)
         File 1: id_document.jpg, 126036 bytes
   📋 Extracted form data: {
  name: 'France Witness',
  surname: 'Mokoena',
  idNumber: '0212315697087',
  role: 'Intern',
  department: '69232b9486294f1572e54fff',
  hostCompanyId: '6922e68dbfdc65105e5c5bcf',
  location: 'FERREIRA_STREET_MBOMBELA',
  customAddress: undefined,
  clockInTime: '07:29',
  clockOutTime: '04:30',
  breakStartTime: '13:00',
  breakEndTime: '14:00',
  extraHoursStartTime: undefined,
  extraHoursEndTime: undefined
}
✅ Location from dataset: 20 Ferreira Street, Mbombela (-25.475297, 30.982345)
   📸 Processing 5 images for registration (enterprise-grade accuracy)
📸 Processing registration for France Witness Mokoena (ID: 0212315697087)
   Role: Intern, Phone: 0767789235, Location: 20 Ferreira Street, Mbombela
   Location coordinates: -25.475297, 30.982345
   ⚡ ENTERPRISE: Processing 5 face images SEQUENTIALLY (ONNX Runtime requires sequential inference)...
   📋 Validating 5 images before processing...
   📸 Image 1: buffer size = 97021 bytes, mimetype = image/jpeg
   📸 Image 2: buffer size = 93721 bytes, mimetype = image/jpeg
   📸 Image 3: buffer size = 118412 bytes, mimetype = image/jpeg
   📸 Image 4: buffer size = 105192 bytes, mimetype = image/jpeg
   📸 Image 5: buffer size = 114628 bytes, mimetype = image/jpeg
   ✅ All images validated
   ⚡ Processing image 1/5 (sequential)...
   📦 Image 1 buffer size: 97021 bytes
   🚀 Calling generateEmbedding for image 1...

📸 [REGISTER] Processing image 1/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 97021 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=84.3%, Sharpness=26.2%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (294ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.1%, 76.5%, 58.7%, 57.4%, 51.2%, 51.2%, 23.5%, 21.6%, 17.0%, 16.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.048, 79.944, 64.540, 83.654])
   📊 Found 6 detections above threshold (50.0%)
   🔍 Detection 420: ✓ PASS - score=58.7%, size=178x276px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=57.4%, size=137x274px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=77.1%, size=180x243px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=76.5%, size=138x243px (min: 85px)
   🔍 Detection 500: ✓ PASS - score=51.2%, size=182x206px (min: 85px)
   🔍 Detection 502: ✓ PASS - score=51.2%, size=142x206px (min: 85px)
   ✅ Found 6 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 57.7%, scores: 77.1% vs 76.5%)
   🔄 Suppressed duplicate detection (IoU: 74.6%, scores: 77.1% vs 58.7%)
   🔄 Suppressed duplicate detection (IoU: 46.9%, scores: 77.1% vs 57.4%)
   🔄 Suppressed duplicate detection (IoU: 47.4%, scores: 77.1% vs 51.2%)
   🔄 Suppressed duplicate detection (IoU: 76.5%, scores: 77.1% vs 51.2%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.1%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=180px, Quality=77.1%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 77.1%
   🏦 Cropping face: normalized (0.060, 0.245, 0.225, 0.228) → pixels (48, 261, 180, 242)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (13ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (255ms). Outputs: 683
✅ 512-d embedding generated in 809ms (0.8s)

✅ [REGISTER] Image 1 processed successfully
   ✅ Image 1 processed - Quality: 77.1%
   ⚡ Processing image 2/5 (sequential)...
   📦 Image 2 buffer size: 93721 bytes
   🚀 Calling generateEmbedding for image 2...

📸 [REGISTER] Processing image 2/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 93721 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=82.5%, Sharpness=19.6%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 29ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (273ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.2%, 63.4%, 61.7%, 51.4%, 47.8%, 40.3%, 38.0%, 25.5%, 21.1%, 18.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.342, 77.303, 61.898, 80.624])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=61.7%, size=195x298px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=77.2%, size=197x258px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=63.4%, size=155x261px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=51.4%, size=199x221px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 59.3%, scores: 77.2% vs 63.4%)
   🔄 Suppressed duplicate detection (IoU: 77.5%, scores: 77.2% vs 61.7%)
   🔄 Suppressed duplicate detection (IoU: 73.8%, scores: 77.2% vs 51.4%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=197px, Quality=77.2%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 77.2%
   🏦 Cropping face: normalized (0.095, 0.254, 0.246, 0.242) → pixels (76, 270, 196, 258)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (8ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (255ms). Outputs: 683
✅ 512-d embedding generated in 756ms (0.8s)

✅ [REGISTER] Image 2 processed successfully
   ✅ Image 2 processed - Quality: 77.2%
   ⚡ Processing image 3/5 (sequential)...
   📦 Image 3 buffer size: 118412 bytes
   🚀 Calling generateEmbedding for image 3...

📸 [REGISTER] Processing image 3/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 118412 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=80.9%, Sharpness=35.8%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (288ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.2%, 61.5%, 61.4%, 53.7%, 52.9%, 36.1%, 36.1%, 35.5%, 35.3%, 22.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.819, 79.616, 64.263, 83.278])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=61.5%, size=186x308px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=52.9%, size=225x271px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=77.2%, size=182x274px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=53.7%, size=142x268px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=61.4%, size=183x233px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 77.7%, scores: 77.2% vs 61.5%)
   🔄 Suppressed duplicate detection (IoU: 75.7%, scores: 77.2% vs 61.4%)
   🔄 Suppressed duplicate detection (IoU: 54.0%, scores: 77.2% vs 53.7%)
   🔄 Suppressed duplicate detection (IoU: 66.7%, scores: 77.2% vs 52.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=182px, Quality=77.2%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 77.2%
   🏦 Cropping face: normalized (0.110, 0.252, 0.227, 0.257) → pixels (88, 268, 181, 273)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (12ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (249ms). Outputs: 683
✅ 512-d embedding generated in 802ms (0.8s)

✅ [REGISTER] Image 3 processed successfully
   ✅ Image 3 processed - Quality: 77.2%
   ⚡ Processing image 4/5 (sequential)...
   📦 Image 4 buffer size: 105192 bytes
   🚀 Calling generateEmbedding for image 4...

📸 [REGISTER] Processing image 4/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 105192 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=83.7%, Sharpness=28.4%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 25ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (295ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 81.1%, 73.5%, 60.0%, 58.6%, 51.2%, 50.0%, 31.5%, 19.6%, 17.2%, 17.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.071, 80.302, 65.028, 84.274])
   📊 Found 6 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=50.0%, size=186x277px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=58.6%, size=147x278px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=73.5%, size=191x246px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=81.1%, size=147x246px (min: 85px)
   🔍 Detection 458: ✓ PASS - score=51.2%, size=189x208px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=60.0%, size=148x208px (min: 85px)
   ✅ Found 6 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 60.4%, scores: 81.1% vs 73.5%)
   🔄 Suppressed duplicate detection (IoU: 75.5%, scores: 81.1% vs 60.0%)
   🔄 Suppressed duplicate detection (IoU: 73.3%, scores: 81.1% vs 58.6%)
   🔄 Suppressed duplicate detection (IoU: 52.0%, scores: 81.1% vs 51.2%)
   🔄 Suppressed duplicate detection (IoU: 47.2%, scores: 81.1% vs 50.0%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 81.1%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=147px, Quality=81.1%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 81.1%
   🏦 Cropping face: normalized (0.129, 0.243, 0.183, 0.231) → pixels (103, 258, 146, 246)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (13ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (256ms). Outputs: 683
✅ 512-d embedding generated in 800ms (0.8s)

✅ [REGISTER] Image 4 processed successfully
   ✅ Image 4 processed - Quality: 81.1%
   ⚡ Processing image 5/5 (sequential)...
   📦 Image 5 buffer size: 114628 bytes
   🚀 Calling generateEmbedding for image 5...

📸 [REGISTER] Processing image 5/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 114628 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=82.9%, Sharpness=45.9%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (282ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 83.5%, 66.1%, 64.2%, 58.3%, 55.2%, 42.5%, 35.7%, 34.5%, 30.2%, 19.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.928, 81.297, 65.267, 85.070])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=66.1%, size=165x275px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=64.2%, size=207x234px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=83.5%, size=163x236px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=55.2%, size=124x234px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=58.3%, size=167x198px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 73.3%, scores: 83.5% vs 66.1%)
   🔄 Suppressed duplicate detection (IoU: 64.0%, scores: 83.5% vs 64.2%)
   🔄 Suppressed duplicate detection (IoU: 71.9%, scores: 83.5% vs 58.3%)
   🔄 Suppressed duplicate detection (IoU: 55.2%, scores: 83.5% vs 55.2%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 83.5%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=163px, Quality=83.5%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 83.5%
   🏦 Cropping face: normalized (0.110, 0.244, 0.204, 0.221) → pixels (87, 259, 163, 235)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (13ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (249ms). Outputs: 683
✅ 512-d embedding generated in 778ms (0.8s)

✅ [REGISTER] Image 5 processed successfully
   ✅ Image 5 processed - Quality: 83.5%
   ⚡⚡⚡ Sequential processing completed in 3995ms - 5 embeddings generated
   📊 Average face quality: 79.2% (Image 1: 77.1%, Image 2: 77.2%, Image 3: 77.2%, Image 4: 81.1%, Image 5: 83.5%)
   🏦 Centroid template computed from 5/5 embeddings (weights: 0.191, 0.185, 0.200, 0.201, 0.223, norm: 0.965)
   🏦 Centroid template computed from 5 embeddings
   🆔 Processing ID document image (126036 bytes)...

📸 [REGISTER] Processing ID document image (REQUIRED)
🆔 ====== EXTRACTING ID DOCUMENT EMBEDDING ======
   📦 ID image buffer size: 126036 bytes
🏦 Applying canonical preprocessing for ID document...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x600, Brightness=60.4%, Sharpness=71.8%
   🏦 Canonical preprocessing: 800x600 → 800x600 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x600 → 800x600
🔍 Detecting face in ID document (using relaxed threshold for ID photos)...
   🔧 Using relaxed detection threshold: 30% (instead of 50%) for ID document
   🔧 Resizing for SCRFD detection: 800x600 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=1.067, cropOffset=(106.7, 0.0)
   ✅ Detection preprocessing complete: 800x600 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (276ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 8.3%, 7.2%, 6.7%, 6.7%, 6.4%, 6.4%, 6.4%, 6.3%, 6.0%, 5.8%
   🔍 Detection threshold: 30.0%
   🔍 Detected box format: pixel_center_size (first box values: [65.547, 90.923, 74.403, 98.771])
   📊 Found 0 detections above threshold (30.0%)
   ✅ Found 0 faces with score > 30% (threshold: 30%)
   🔍 After NMS filtering: 0 unique face(s)
❌ Error extracting ID embedding: Error: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
    at detectFaces (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2137:11)
    at async generateIDEmbedding (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2545:20)
    at async C:\Clock-in\FaceClockBackend\routes\staff.js:515:33
   ❌ Failed to process ID document image (REQUIRED): No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
📥 2025-12-01T09:59:53.031Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=900d4c46-554d-464a-9dd6-a4a7b54679ad',
  'content-length': '173688',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 173482 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.2%, Sharpness=22.6%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (294ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.6%, 3.1%, 3.1%, 2.9%, 2.9%, 2.8%, 2.7%, 2.7%, 2.0%, 2.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.998, 84.883, 68.794, 86.743])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:59:55.021Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=c6936bed-4551-45b3-9db2-5b8d16874a8a',
  'content-length': '178441',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 178235 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=65.3%, Sharpness=20.3%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (278ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 4.0%, 3.9%, 3.6%, 3.4%, 3.3%, 3.0%, 3.0%, 2.9%, 2.9%, 2.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [64.053, 86.818, 70.436, 89.790])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:59:57.061Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=138c7c01-8db2-41cc-b60e-bdbc36843212',
  'content-length': '176028',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 175822 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=61.2%, Sharpness=24.1%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (267ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.2%, 3.2%, 3.1%, 3.1%, 2.9%, 2.7%, 2.6%, 1.9%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.977, 78.366, 61.310, 77.566])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T09:59:58.997Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=5f39eda7-b63d-4dd5-8755-9127d1eb8e19',
  'content-length': '263772',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 263566 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=61.7%, Sharpness=36.7%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (296ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.2%, 3.1%, 3.0%, 2.9%, 2.8%, 2.8%, 2.7%, 2.7%, 1.9%, 1.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.549, 82.594, 64.186, 83.136])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:00:01.408Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=79147869-c4eb-4130-b041-a4f559e3c712',
  'content-length': '256406',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 256200 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.4%, Sharpness=34.7%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (280ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.1%, 2.9%, 2.9%, 2.9%, 2.8%, 2.8%, 2.6%, 1.8%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.159, 81.996, 64.651, 82.036])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:00:03.967Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=afe6b695-f3ed-4641-9c93-4dc720dbb439',
  'content-length': '265668',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 265462 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.6%, Sharpness=37.5%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (288ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.3%, 3.0%, 2.9%, 2.9%, 2.9%, 2.8%, 2.7%, 1.8%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.714, 79.984, 62.800, 79.771])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:00:06.173Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=1bc3254f-9521-4ab9-a5ac-7ff1b41a90fb',
  'content-length': '243122',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 242916 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.5%, Sharpness=32.9%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 44ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (271ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.2%, 3.1%, 2.9%, 2.9%, 2.9%, 2.8%, 2.7%, 2.1%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.132, 77.526, 61.533, 76.963])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:00:08.345Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=53d4c44e-0868-4d21-a4c9-caf14d97f0b4',
  'content-length': '241961',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 241755 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.1%, Sharpness=34.8%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (284ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.5%, 3.2%, 3.2%, 3.0%, 3.0%, 3.0%, 3.0%, 2.9%, 2.9%, 2.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [55.846, 73.130, 56.531, 71.592])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:00:10.570Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=7bc32319-201d-4dcf-a7b8-355fc9aea606',
  'content-length': '183854',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 183648 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=60.5%, Sharpness=25.3%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 45ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (273ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.2%, 3.1%, 2.9%, 2.9%, 2.8%, 2.8%, 2.7%, 2.7%, 2.5%, 2.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.161, 79.220, 62.933, 78.583])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:00:12.775Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=9a98c215-c086-4aeb-8547-1ff286646643',
  'content-length': '176388',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 176182 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=61.1%, Sharpness=25.6%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (294ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 34.2%, 31.7%, 31.2%, 25.6%, 25.5%, 19.6%, 15.6%, 11.7%, 6.9%, 6.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [63.553, 84.543, 68.766, 86.691])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:00:14.751Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=110f6729-ae6a-4466-baf8-d3559c960baf',
  'content-length': '253680',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 253474 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=60.5%, Sharpness=32.9%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (283ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.2%, 3.2%, 3.1%, 3.1%, 3.0%, 2.9%, 2.8%, 2.8%, 2.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.760, 84.338, 67.432, 85.007])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
🔄 Invalidating staff cache...
🔄 Loading staff from database (cache refresh)...
✅ Staff cache refreshed: 1 staff members loaded in 310ms
📥 2025-12-01T10:01:39.125Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=59913d26-6a62-4ee4-ac6d-27eb11689224',
  'content-length': '30688',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 30483 bytes
   ⚠️ Suboptimal brightness: 100.0%. Auto-correcting...
   ✅ Brightness auto-corrected: 100.0% → ~50%
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=0.0, Sharpness=0.0%
   ⚠️ Enhancement didn't improve sharpness (0.0 vs 0.0), using original image
   ⚠️ Very blurry image: Using lenient threshold (30)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'blur' ],
  feedback: 'Image is too blurry. Hold still and ensure camera is focused.',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:01:41.149Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=278cdd52-e458-4c2c-ba4e-92823aee18a8',
  'content-length': '159290',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 159084 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=63.6%, Sharpness=16.7%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 25ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (267ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.4%, 3.2%, 3.1%, 3.1%, 3.1%, 3.1%, 3.1%, 2.7%, 2.7%, 2.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.622, 79.633, 62.672, 79.764])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:01:43.100Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=796dfc64-9a75-48e0-b277-e3c3e6a01f9e',
  'content-length': '178184',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 177978 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=61.3%, Sharpness=20.1%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 32ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (302ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.4%, 3.0%, 3.0%, 2.9%, 2.9%, 2.8%, 2.7%, 2.6%, 1.9%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [64.010, 86.023, 69.191, 87.758])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:01:45.237Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=068fbf96-9ff6-4b35-87ed-b326d2a899c9',
  'content-length': '275238',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 275032 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=59.3%, Sharpness=34.9%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (274ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.3%, 3.0%, 2.9%, 2.9%, 2.9%, 2.8%, 2.6%, 1.8%, 1.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.411, 81.706, 65.539, 82.407])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:01:47.466Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=95c09010-07ed-4266-a4c6-15f1a03bb5b6',
  'content-length': '239291',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 239085 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=60.5%, Sharpness=33.4%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (277ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.2%, 3.1%, 3.0%, 2.9%, 2.9%, 2.7%, 2.6%, 2.5%, 1.7%, 1.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.316, 79.011, 62.485, 78.211])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:01:49.605Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=e783713c-e1e0-4f40-8758-42c5e10be29d',
  'content-length': '222137',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 221931 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.3%, Sharpness=30.3%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 45ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (330ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.1%, 3.0%, 2.9%, 2.9%, 2.9%, 2.8%, 2.8%, 2.7%, 2.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.136, 81.591, 63.024, 81.547])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:01:51.779Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=822d35c0-a92c-4f1d-9eff-716cae95cc2b',
  'content-length': '280220',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 280014 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=61.8%, Sharpness=40.2%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (267ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.1%, 3.0%, 2.8%, 2.7%, 2.7%, 2.7%, 2.7%, 2.3%, 2.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [62.856, 84.517, 65.648, 85.654])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:01:53.793Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=bcd11afd-7e90-491b-9295-b821bbd7e473',
  'content-length': '260072',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 259866 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.5%, Sharpness=34.7%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 45ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (264ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.2%, 3.2%, 3.1%, 2.9%, 2.9%, 2.9%, 2.7%, 2.6%, 1.8%, 1.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.913, 81.761, 65.810, 81.900])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:01:55.911Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=20a25b25-7560-457a-9bf5-e23fd531e5b3',
  'content-length': '276218',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 276012 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.6%, Sharpness=39.5%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (347ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.5%, 3.2%, 3.0%, 2.9%, 2.9%, 2.9%, 2.8%, 2.7%, 2.2%, 2.0%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.462, 81.918, 65.440, 81.801])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:01:58.150Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=6842c005-226f-450f-b136-1fca134f6ab5',
  'content-length': '240241',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 240035 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.3%, Sharpness=33.1%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 40ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (315ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.3%, 3.0%, 3.0%, 3.0%, 2.9%, 2.8%, 2.6%, 2.6%, 2.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.023, 80.027, 63.400, 79.733])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:02:00.300Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=0938a89a-8b45-4092-b8f3-de23639e83de',
  'content-length': '279223',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 279017 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=62.6%, Sharpness=40.0%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (271ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 3.3%, 3.2%, 3.1%, 3.0%, 3.0%, 3.0%, 2.8%, 2.7%, 2.7%, 2.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.778, 78.127, 62.477, 77.702])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
   ✅ Preview validation complete: {
  ready: false,
  quality: 0,
  issues: [ 'no_face' ],
  feedback: 'Position your face in the circle',
  gender: 'NOT_FOUND',
  genderConfidence: 'NOT_FOUND'
}
📥 2025-12-01T10:02:02.545Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=1eda2256-c3b4-4605-a618-14c713a4156f',
  'content-length': '185354',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 185148 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=63.7%, Sharpness=29.5%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (275ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 52.2%, 48.5%, 45.5%, 42.6%, 39.1%, 29.8%, 21.1%, 19.6%, 14.5%, 7.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.312, 81.038, 63.933, 81.591])
   📊 Found 1 detections above threshold (50.0%)
   🔍 Detection 470: ✓ PASS - score=52.2%, size=293x294px (min: 85px)
   ✅ Found 1 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 52.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=293px, Quality=52.2%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 1022ms, ready: true, quality: 52.2%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 52,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T10:02:04.381Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=4aadf118-5ed1-4d5c-9705-ecf5d6528757',
  'content-length': '127547',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 127341 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=70.0%, Sharpness=15.2%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (267ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 85.2%, 79.5%, 74.4%, 66.0%, 42.0%, 36.5%, 32.6%, 25.1%, 22.2%, 16.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [64.681, 84.469, 74.413, 90.707])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 384: ✓ PASS - score=74.4%, size=341x410px (min: 85px)
   🔍 Detection 386: ✓ PASS - score=85.2%, size=247x410px (min: 85px)
   🔍 Detection 424: ✓ PASS - score=66.0%, size=343x315px (min: 85px)
   🔍 Detection 426: ✓ PASS - score=79.5%, size=247x314px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 56.8%, scores: 85.2% vs 79.5%)
   🔄 Suppressed duplicate detection (IoU: 49.0%, scores: 85.2% vs 74.4%)
   🔄 Suppressed duplicate detection (IoU: 34.3%, scores: 85.2% vs 66.0%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 85.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=247px, Quality=85.2%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 989ms, ready: true, quality: 85.2%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 85,
  issues: [],
  feedback: 'Perfect! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T10:02:06.596Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=7ee2a23a-2b29-4453-a915-9367a61f5076',
  'content-length': '167535',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 167329 bytes
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=1944x2592, Brightness=70.4%, Sharpness=18.8%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 32ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (323ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 84.0%, 83.3%, 67.2%, 62.1%, 49.9%, 47.6%, 30.9%, 22.0%, 14.7%, 11.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [63.085, 84.265, 71.377, 89.003])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 384: ✓ PASS - score=67.2%, size=307x431px (min: 85px)
   🔍 Detection 386: ✓ PASS - score=62.1%, size=210x430px (min: 85px)
   🔍 Detection 424: ✓ PASS - score=83.3%, size=309x337px (min: 85px)
   🔍 Detection 426: ✓ PASS - score=84.0%, size=212x336px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 45.6%, scores: 84.0% vs 83.3%)
   🔄 Suppressed duplicate detection (IoU: 30.2%, scores: 84.0% vs 67.2%)
   🔄 Suppressed duplicate detection (IoU: 58.8%, scores: 84.0% vs 62.1%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 84.0%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=212px, Quality=84.0%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 1123ms, ready: true, quality: 84.0%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 84,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T10:02:11.055Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=86c9b826-4529-4fdc-b0ab-72a763277789',
  'content-length': '66785',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 66580 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=9.6, Sharpness=1.9%
   ✅ Image enhanced: sharpness improved from 1.9% to 15.3%
   📊 After: Variance=76.3, Sharpness=15.3%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=86.1%, Sharpness=15.3%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (264ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 71.6%, 65.7%, 61.0%, 53.7%, 45.6%, 38.8%, 38.5%, 32.6%, 28.7%, 21.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [61.326, 81.688, 65.972, 85.428])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 424: ✓ PASS - score=71.6%, size=407x661px (min: 85px)
   🔍 Detection 426: ✓ PASS - score=61.0%, size=318x652px (min: 85px)
   🔍 Detection 464: ✓ PASS - score=65.7%, size=407x568px (min: 85px)
   🔍 Detection 466: ✓ PASS - score=53.7%, size=327x568px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 74.0%, scores: 71.6% vs 65.7%)
   🔄 Suppressed duplicate detection (IoU: 61.3%, scores: 71.6% vs 61.0%)
   🔄 Suppressed duplicate detection (IoU: 50.0%, scores: 71.6% vs 53.7%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 71.6%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=407px, Quality=71.6%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2127ms, ready: true, quality: 71.6%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 72,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T10:02:14.271Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=b3c9dbdd-afc7-496e-b894-d2aee768715a',
  'content-length': '85016',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 84811 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=19.3, Sharpness=3.9%
   ✅ Image enhanced: sharpness improved from 3.9% to 33.0%
   📊 After: Variance=165.0, Sharpness=33.0%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=84.9%, Sharpness=33.0%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 30ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (320ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 78.2%, 70.2%, 63.1%, 51.7%, 51.1%, 41.4%, 39.2%, 36.1%, 27.7%, 17.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.854, 79.955, 63.979, 83.578])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 456: ✓ PASS - score=70.2%, size=436x696px (min: 85px)
   🔍 Detection 458: ✓ PASS - score=51.7%, size=341x687px (min: 85px)
   🔍 Detection 496: ✓ PASS - score=78.2%, size=440x605px (min: 85px)
   🔍 Detection 498: ✓ PASS - score=63.1%, size=340x603px (min: 85px)
   🔍 Detection 536: ✓ PASS - score=51.1%, size=452x514px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 74.9%, scores: 78.2% vs 70.2%)
   🔄 Suppressed duplicate detection (IoU: 56.7%, scores: 78.2% vs 63.1%)
   🔄 Suppressed duplicate detection (IoU: 46.3%, scores: 78.2% vs 51.7%)
   🔄 Suppressed duplicate detection (IoU: 80.2%, scores: 78.2% vs 51.1%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 78.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=440px, Quality=78.2%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2145ms, ready: true, quality: 78.2%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 78,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T10:02:17.517Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=15eac80c-1642-41f0-97f9-8352329bf102',
  'content-length': '102284',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 102078 bytes
   🔧 Blurry image detected: Applying moderate enhancement...
   📊 Before: Variance=33.9, Sharpness=6.8%
   ✅ Image enhanced: sharpness improved from 6.8% to 48.6%
   📊 After: Variance=242.8, Sharpness=48.6%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=85.5%, Sharpness=48.6%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 25ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (275ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 80.2%, 67.5%, 65.1%, 49.3%, 49.2%, 42.7%, 36.6%, 32.0%, 20.8%, 18.2%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.051, 80.297, 64.619, 84.004])
   📊 Found 3 detections above threshold (50.0%)
   🔍 Detection 420: ✓ PASS - score=67.5%, size=410x673px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=80.2%, size=410x571px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=65.1%, size=313x570px (min: 85px)
   ✅ Found 3 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 72.8%, scores: 80.2% vs 67.5%)
   🔄 Suppressed duplicate detection (IoU: 54.6%, scores: 80.2% vs 65.1%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 80.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=410px, Quality=80.2%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2131ms, ready: true, quality: 80.2%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 80,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T10:02:20.058Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=0715ac9c-d99d-4a73-8cdf-9d293aa7f975',
  'content-length': '74246',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 74041 bytes
   🔧 Very blurry image detected: Applying aggressive (very blurry) enhancement...
   📊 Before: Variance=11.8, Sharpness=2.4%
   ✅ Image enhanced: sharpness improved from 2.4% to 20.3%
   📊 After: Variance=101.3, Sharpness=20.3%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=84.7%, Sharpness=20.3%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 28ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (287ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 78.5%, 57.5%, 55.8%, 55.2%, 52.9%, 34.4%, 33.1%, 32.6%, 30.5%, 19.7%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.150, 77.332, 61.697, 80.548])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=57.5%, size=444x670px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=52.9%, size=561x576px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=78.5%, size=446x575px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=55.2%, size=349x581px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=55.8%, size=450x488px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 77.6%, scores: 78.5% vs 57.5%)
   🔄 Suppressed duplicate detection (IoU: 68.4%, scores: 78.5% vs 55.8%)
   🔄 Suppressed duplicate detection (IoU: 59.4%, scores: 78.5% vs 55.2%)
   🔄 Suppressed duplicate detection (IoU: 65.2%, scores: 78.5% vs 52.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 78.5%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=446px, Quality=78.5%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2113ms, ready: true, quality: 78.5%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 79,
  issues: [],
  feedback: 'Excellent! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T10:02:23.203Z - POST /api/staff/validate-preview
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /validate-preview
📥 Full URL: /validate-preview
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=03eae147-bf03-4d9a-9894-744d3faa5e86',
  'content-length': '96945',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================
🔍 Preview validation request received
   📦 Image size: 96740 bytes
   🔧 Blurry image detected: Applying moderate enhancement...
   📊 Before: Variance=25.3, Sharpness=5.1%
   ✅ Image enhanced: sharpness improved from 5.1% to 37.2%
   📊 After: Variance=186.1, Sharpness=37.2%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=1944x2592, Brightness=84.3%, Sharpness=37.2%
   🏦 Canonical preprocessing: 1944x2592 → 1944x2592 (scale: 1.000x, 1.000x)
   🔧 Resizing for SCRFD detection: 1944x2592 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.329, cropOffset=(0.0, 106.7)
   ✅ Detection preprocessing complete: 1944x2592 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (284ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 71.9%, 71.5%, 63.9%, 62.9%, 33.3%, 32.5%, 32.4%, 30.8%, 26.3%, 24.8%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [57.982, 77.230, 61.561, 80.431])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=63.9%, size=507x631px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=71.9%, size=398x640px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=62.9%, size=512x539px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=71.5%, size=401x534px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 73.2%, scores: 71.9% vs 71.5%)
   🔄 Suppressed duplicate detection (IoU: 60.1%, scores: 71.9% vs 63.9%)
   🔄 Suppressed duplicate detection (IoU: 50.4%, scores: 71.9% vs 62.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 71.9%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=398px, Quality=71.9%, Count=1, Landmarks=No
👤 Starting gender detection...
👤 detectGender called - detection: { hasLandmarks: false, landmarksKeys: 'none' }
⚠️ No landmarks available for gender detection
👤 ✅ Gender detected: UNKNOWN (confidence: 50.0%)
⚡ Preview validation: 2110ms, ready: true, quality: 71.9%, issues: 0
   ✅ Preview validation complete: {
  ready: true,
  quality: 72,
  issues: [],
  feedback: 'Good! Ready to capture ✓',
  gender: 'UNKNOWN',
  genderConfidence: 0.5
}
📥 2025-12-01T10:02:46.939Z - POST /api/staff/register
   📦 Body keys:
   📦 Files: none
📥 ========== INCOMING REQUEST TO /api/staff ==========
📥 Method: POST
📥 Path: /register
📥 Full URL: /register
📥 Headers: {
  'content-type': 'multipart/form-data; boundary=79b7e103-14c1-422e-9f8e-27b25aec9b24',
  'content-length': '661216',
  'user-agent': 'okhttp/4.12.0'
}
📥 Body keys: none
📥 Files: none
📥 ===================================================

📦 [MULTER] Files parsed: 6 field(s)
📦 [MULTER] Field "image1": 1 file(s)
   📦 File 1: photo1.jpg, 79590 bytes, image/jpeg
📦 [MULTER] Field "image2": 1 file(s)
   📦 File 1: photo2.jpg, 84291 bytes, image/jpeg
📦 [MULTER] Field "image3": 1 file(s)
   📦 File 1: photo3.jpg, 102939 bytes, image/jpeg
📦 [MULTER] Field "image4": 1 file(s)
   📦 File 1: photo4.jpg, 74456 bytes, image/jpeg
📦 [MULTER] Field "image5": 1 file(s)
   📦 File 1: photo5.jpg, 121706 bytes, image/jpeg
📦 [MULTER] Field "idImage": 1 file(s)
   📦 File 1: id_document.jpg, 195695 bytes, image/jpeg
📦 [MULTER] req.body keys: name, surname, idNumber, phoneNumber, role, hostCompanyId, department, location, clockInTime, clockOutTime, breakStartTime, breakEndTime
🚀 ========== REGISTRATION ROUTE HANDLER CALLED ==========
🚀 This log should appear IMMEDIATELY when request arrives
🚀 ======================================================
🚀 ========== REGISTRATION REQUEST RECEIVED ==========
   📥 Request method: POST
   📥 Request URL: /register
   📥 Request body keys: [
  'name',           'surname',
  'idNumber',       'phoneNumber',
  'role',           'hostCompanyId',
  'department',     'location',
  'clockInTime',    'clockOutTime',
  'breakStartTime', 'breakEndTime'
]
   📥 Request files: [ 'image1', 'image2', 'image3', 'image4', 'image5', 'idImage' ]
   📥 Number of image files: 6
   📦 Detailed files info:
      image1: 1 file(s)
         File 1: photo1.jpg, 79590 bytes
      image2: 1 file(s)
         File 1: photo2.jpg, 84291 bytes
      image3: 1 file(s)
         File 1: photo3.jpg, 102939 bytes
      image4: 1 file(s)
         File 1: photo4.jpg, 74456 bytes
      image5: 1 file(s)
         File 1: photo5.jpg, 121706 bytes
      idImage: 1 file(s)
         File 1: id_document.jpg, 195695 bytes
   📋 Extracted form data: {
  name: 'France Witness',
  surname: 'Mokoena',
  idNumber: '0212315697087',
  role: 'Intern',
  department: '69232b9486294f1572e54fff',
  hostCompanyId: '6922e68dbfdc65105e5c5bcf',
  location: 'FERREIRA_STREET_MBOMBELA',
  customAddress: undefined,
  clockInTime: '07:29',
  clockOutTime: '04:30',
  breakStartTime: '13:00',
  breakEndTime: '14:00',
  extraHoursStartTime: undefined,
  extraHoursEndTime: undefined
}
✅ Location from dataset: 20 Ferreira Street, Mbombela (-25.475297, 30.982345)
   📸 Processing 5 images for registration (enterprise-grade accuracy)
📸 Processing registration for France Witness Mokoena (ID: 0212315697087)
   Role: Intern, Phone: 0767789235, Location: 20 Ferreira Street, Mbombela
   Location coordinates: -25.475297, 30.982345
   ⚡ ENTERPRISE: Processing 5 face images SEQUENTIALLY (ONNX Runtime requires sequential inference)...
   📋 Validating 5 images before processing...
   📸 Image 1: buffer size = 79590 bytes, mimetype = image/jpeg
   📸 Image 2: buffer size = 84291 bytes, mimetype = image/jpeg
   📸 Image 3: buffer size = 102939 bytes, mimetype = image/jpeg
   📸 Image 4: buffer size = 74456 bytes, mimetype = image/jpeg
   📸 Image 5: buffer size = 121706 bytes, mimetype = image/jpeg
   ✅ All images validated
   ⚡ Processing image 1/5 (sequential)...
   📦 Image 1 buffer size: 79590 bytes
   🚀 Calling generateEmbedding for image 1...

📸 [REGISTER] Processing image 1/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 79590 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=85.4%, Sharpness=15.2%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 24ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (252ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 73.3%, 73.0%, 57.3%, 57.0%, 40.0%, 39.9%, 29.1%, 23.4%, 18.4%, 14.6%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [58.449, 78.101, 62.581, 81.676])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=73.3%, size=202x229px (min: 85px)
   🔍 Detection 382: ✓ PASS - score=73.0%, size=157x231px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=57.0%, size=198x190px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=57.3%, size=159x192px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 59.7%, scores: 73.3% vs 73.0%)
   🔄 Suppressed duplicate detection (IoU: 44.1%, scores: 73.3% vs 57.3%)
   🔄 Suppressed duplicate detection (IoU: 67.8%, scores: 73.3% vs 57.0%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 73.3%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=202px, Quality=73.3%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 73.3%
   🏦 Cropping face: normalized (0.067, 0.220, 0.252, 0.215) → pixels (53, 234, 201, 229)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (11ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (261ms). Outputs: 683
✅ 512-d embedding generated in 752ms (0.8s)

✅ [REGISTER] Image 1 processed successfully
   ✅ Image 1 processed - Quality: 73.3%
   ⚡ Processing image 2/5 (sequential)...
   📦 Image 2 buffer size: 84291 bytes
   🚀 Calling generateEmbedding for image 2...

📸 [REGISTER] Processing image 2/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 84291 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=84.2%, Sharpness=16.0%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (266ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 76.0%, 68.3%, 65.1%, 58.8%, 50.6%, 40.2%, 32.3%, 29.0%, 26.0%, 21.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.757, 79.915, 63.985, 83.445])
   📊 Found 5 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=50.6%, size=189x300px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=76.0%, size=190x266px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=68.3%, size=148x268px (min: 85px)
   🔍 Detection 460: ✓ PASS - score=65.1%, size=193x227px (min: 85px)
   🔍 Detection 462: ✓ PASS - score=58.8%, size=152x229px (min: 85px)
   ✅ Found 5 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 57.7%, scores: 76.0% vs 68.3%)
   🔄 Suppressed duplicate detection (IoU: 76.1%, scores: 76.0% vs 65.1%)
   🔄 Suppressed duplicate detection (IoU: 48.5%, scores: 76.0% vs 58.8%)
   🔄 Suppressed duplicate detection (IoU: 80.3%, scores: 76.0% vs 50.6%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 76.0%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=190px, Quality=76.0%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 76.0%
   🏦 Cropping face: normalized (0.079, 0.233, 0.237, 0.250) → pixels (63, 248, 189, 266)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (6ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (284ms). Outputs: 683
✅ 512-d embedding generated in 745ms (0.7s)

✅ [REGISTER] Image 2 processed successfully
   ✅ Image 2 processed - Quality: 76.0%
   ⚡ Processing image 3/5 (sequential)...
   📦 Image 3 buffer size: 102939 bytes
   🚀 Calling generateEmbedding for image 3...

📸 [REGISTER] Processing image 3/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 102939 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=84.2%, Sharpness=27.6%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 27ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (286ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 80.2%, 70.5%, 65.4%, 51.3%, 48.4%, 43.9%, 33.5%, 33.2%, 24.2%, 19.1%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [59.308, 78.844, 63.646, 82.312])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 378: ✓ PASS - score=51.3%, size=195x273px (min: 85px)
   🔍 Detection 380: ✓ PASS - score=70.5%, size=157x276px (min: 85px)
   🔍 Detection 418: ✓ PASS - score=65.4%, size=198x238px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=80.2%, size=155x238px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 73.6%, scores: 80.2% vs 70.5%)
   🔄 Suppressed duplicate detection (IoU: 62.2%, scores: 80.2% vs 65.4%)
   🔄 Suppressed duplicate detection (IoU: 49.3%, scores: 80.2% vs 51.3%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 80.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=155px, Quality=80.2%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 80.2%
   🏦 Cropping face: normalized (0.115, 0.257, 0.194, 0.223) → pixels (91, 273, 155, 237)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (11ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (267ms). Outputs: 683
✅ 512-d embedding generated in 792ms (0.8s)

✅ [REGISTER] Image 3 processed successfully
   ✅ Image 3 processed - Quality: 80.2%
   ⚡ Processing image 4/5 (sequential)...
   📦 Image 4 buffer size: 74456 bytes
   🚀 Calling generateEmbedding for image 4...

📸 [REGISTER] Processing image 4/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 74456 bytes
🏦 Applying canonical preprocessing...
   🔧 Blurry image detected: Applying moderate enhancement...
   📊 Before: Variance=54.4, Sharpness=10.9%
   ✅ Image enhanced: sharpness improved from 10.9% to 77.9%
   📊 After: Variance=389.7, Sharpness=77.9%
   ✅ Enhanced image: Using relaxed blur threshold (36)
   ✅ Quality gates passed: Size=800x1066, Brightness=85.6%, Sharpness=77.9%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 25ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (264ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 77.4%, 71.2%, 61.3%, 50.9%, 45.5%, 40.2%, 34.9%, 22.5%, 21.2%, 17.4%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [60.174, 80.323, 64.414, 83.621])
   📊 Found 4 detections above threshold (50.0%)
   🔍 Detection 380: ✓ PASS - score=77.4%, size=170x231px (min: 85px)
   🔍 Detection 382: ✓ PASS - score=71.2%, size=132x232px (min: 85px)
   🔍 Detection 420: ✓ PASS - score=61.3%, size=171x194px (min: 85px)
   🔍 Detection 422: ✓ PASS - score=50.9%, size=134x195px (min: 85px)
   ✅ Found 4 faces with score > 50% (threshold: 50%)
   🔄 Suppressed duplicate detection (IoU: 56.0%, scores: 77.4% vs 71.2%)
   🔄 Suppressed duplicate detection (IoU: 67.6%, scores: 77.4% vs 61.3%)
   🔄 Suppressed duplicate detection (IoU: 43.4%, scores: 77.4% vs 50.9%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 77.4%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=170px, Quality=77.4%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ Face detected - Confidence: 77.4%
   🏦 Cropping face: normalized (0.073, 0.220, 0.213, 0.217) → pixels (58, 234, 170, 231)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 Preprocessing complete (6ms), generating 512-d embedding...
   🔧 Feeds object created with key: "input.1"
   📦 Feeds object keys: input.1
   📦 Feed value is Tensor: true
   📦 Feed value shape: [1, 3, 112, 112]
   📦 Feed value type: float32

🚀 [RECOGNITION] Calling recognitionModel.run() now...
   ✅ Inference complete (269ms). Outputs: 683
✅ 512-d embedding generated in 971ms (1.0s)

✅ [REGISTER] Image 4 processed successfully
   ✅ Image 4 processed - Quality: 77.4%
   ⚡ Processing image 5/5 (sequential)...
   📦 Image 5 buffer size: 121706 bytes
   🚀 Calling generateEmbedding for image 5...

📸 [REGISTER] Processing image 5/5
🧮 ====== STARTING EMBEDDING GENERATION (BANK-GRADE) ======
   📦 Image buffer size: 121706 bytes
🏦 Applying canonical preprocessing...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=63.9%, Sharpness=30.8%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting faces with SCRFD (canonical image)...
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (267ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 7.8%, 7.6%, 7.4%, 7.1%, 6.9%, 6.7%, 6.2%, 6.2%, 6.0%, 5.9%
   🔍 Detection threshold: 50.0%
   🔍 Detected box format: pixel_center_size (first box values: [68.766, 94.318, 79.502, 104.689])
   📊 Found 0 detections above threshold (50.0%)
   ✅ Found 0 faces with score > 50% (threshold: 50%)
   🔍 After NMS filtering: 0 unique face(s)
❌ Error generating embedding: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.

❌ ========== ERROR PROCESSING IMAGE 5 ==========
❌ Error message: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
❌ Error name: Error
❌ Error stack: Error: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
    at detectFaces (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2137:11)
    at async generateEmbedding (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2671:24)
    at async C:\Clock-in\FaceClockBackend\routes\staff.js:309:26
❌ ===============================================
   ❌ ========== ERROR PROCESSING IMAGE 5 ==========
   ❌ Error message: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
   ❌ Error name: Error
   ❌ Error stack: Error: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.
    at detectFaces (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2137:11)
    at async generateEmbedding (C:\Clock-in\FaceClockBackend\utils\faceRecognitionONNX.js:2671:24)
    at async C:\Clock-in\FaceClockBackend\routes\staff.js:309:26
   ❌ Full error object: {"stack":"Error: No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.\n    at detectFaces (C:\\Clock-in\\FaceClockBackend\\utils\\faceRecognitionONNX.js:2137:11)\n    at async generateEmbedding (C:\\Clock-in\\FaceClockBackend\\utils\\faceRecognitionONNX.js:2671:24)\n    at async C:\\Clock-in\\FaceClockBackend\\routes\\staff.js:309:26","message":"No face detected. Please ensure your face is visible, well-lit, and facing the camera directly."}
   ❌ ===============================================
⚠️ Registration proceeding with 4/5 embeddings (minimum: 3). This is still acceptable for enterprise-grade accuracy.
   ⚡⚡⚡ Sequential processing completed in 3762ms - 4 embeddings generated
   📊 Average face quality: 76.7% (Image 1: 73.3%, Image 2: 76.0%, Image 3: 80.2%, Image 4: 77.4%)
   🏦 Centroid template computed from 4/4 embeddings (weights: 0.219, 0.227, 0.252, 0.303, norm: 0.976)
   🏦 Centroid template computed from 4 embeddings
   🆔 Processing ID document image (195695 bytes)...

📸 [REGISTER] Processing ID document image (REQUIRED)
🆔 ====== EXTRACTING ID DOCUMENT EMBEDDING ======
   📦 ID image buffer size: 195695 bytes
🏦 Applying canonical preprocessing for ID document...
   ✅ High-quality camera: Using standard threshold (60)
   ✅ Quality gates passed: Size=800x1066, Brightness=68.0%, Sharpness=61.3%
   🏦 Canonical preprocessing: 800x1066 → 800x1066 (scale: 1.000x, 1.000x)
   ✅ Canonical preprocessing complete: 800x1066 → 800x1066
🔍 Detecting face in ID document (using relaxed threshold for ID photos)...
   🔧 Using relaxed detection threshold: 30% (instead of 50%) for ID document
   🔧 Resizing for SCRFD detection: 800x1066 → 640x640 (square)
   ✅ Detection tensor created: shape=[1, 3, 640, 640], size=1228800 elements
   🔧 Coordinate conversion: scale=0.800, cropOffset=(0.0, 106.4)
   ✅ Detection preprocessing complete: 800x1066 → 640x640 (square) in 26ms
   📝 About to queue inference - Input name: "blob", Tensor shape: [1, 3, 640, 640]
   🔧 Inside promise - Model input name: "blob"
   🔧 Inside promise - Captured tensor exists: true
   🔧 Inside promise - Captured tensor is Tensor: true
   ✅ Detection complete (287ms). Outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
   ℹ️ SCRFD scores already appear to be probabilities (0-1 range) - skipping extra sigmoid to avoid double-normalization
   📊 Box output shape: [1, 800, 4]
   📊 Score output shape: [1, 800, 1]
   📊 Landmark output shape: [1, 800, 10]
   📊 Parsing up to 800 potential detections (800 anchors, 4 box features, 1 score features)
   🔍 Top 10 detection scores: 79.2%, 77.5%, 66.9%, 56.1%, 55.1%, 45.8%, 40.8%, 24.3%, 16.5%, 12.0%
   🔍 Detection threshold: 30.0%
   🔍 Detected box format: pixel_center_size (first box values: [63.072, 83.635, 70.533, 88.436])
   📊 Found 7 detections above threshold (30.0%)
   🔍 Detection 382: ✓ PASS - score=45.8%, size=134x161px (min: 85px)
   🔍 Detection 384: ✓ PASS - score=77.5%, size=106x160px (min: 85px)
   🔍 Detection 386: ✗ REJECT - score=55.1%, size=66x162px (min: 85px)
      ⚠️ Rejected: width too small (66 < 85)
      📐 Box detection: [87.2, 26.0, 140.0, 155.7] (640x640 space)
      📐 Box canonical: [109.0, 165.5, 175.0, 327.7] (800x1066 space)
      🔧 Conversion: scale=0.800, cropOffset=(0.0, 106.4)
   🔍 Detection 422: ✓ PASS - score=56.1%, size=135x123px (min: 85px)
   🔍 Detection 424: ✓ PASS - score=79.2%, size=106x121px (min: 85px)
   🔍 Detection 426: ✗ REJECT - score=66.9%, size=66x123px (min: 85px)
      ⚠️ Rejected: width too small (66 < 85)
      📐 Box detection: [87.2, 71.5, 139.8, 169.7] (640x640 space)
      📐 Box canonical: [109.0, 222.4, 174.8, 345.1] (800x1066 space)
      🔧 Conversion: scale=0.800, cropOffset=(0.0, 106.4)
   🔍 Detection 464: ✓ PASS - score=40.8%, size=107x85px (min: 85px)
   ✅ Found 5 faces with score > 30% (threshold: 30%)
   🔄 Suppressed duplicate detection (IoU: 54.4%, scores: 79.2% vs 77.5%)
   🔄 Suppressed duplicate detection (IoU: 55.9%, scores: 79.2% vs 56.1%)
   🔄 Suppressed duplicate detection (IoU: 36.4%, scores: 79.2% vs 45.8%)
   🔄 Suppressed duplicate detection (IoU: 53.3%, scores: 79.2% vs 40.8%)
   🔍 After NMS filtering: 1 unique face(s)
✅ Single face confirmed after NMS filtering (score: 79.2%)
   ⚠️ Facial landmarks not available from SCRFD output. This may indicate the model output format changed.
   💡 Continuing without landmark validation, but matching accuracy may be reduced.
   ✅ Quality gates passed: Face size=106px, Quality=79.2%, Count=1, Landmarks=No
   ✅ Face detection complete: 1 face(s) found
✅ ID face detected - Confidence: 79.2%
   🏦 Cropping face: normalized (0.060, 0.209, 0.132, 0.113) → pixels (47, 223, 105, 120)
   ✅ Face crop validated: 112x112x3, 37632 pixels
   ✅ Tensor created: shape=[1, 3, 112, 112], size=37632 elements
🧮 ID preprocessing complete (20ms), generating 512-d embedding...
✅ ID inference complete (281ms). Outputs: 683
✅ 512-d ID embedding generated in 301ms
   Quality: 79.2%, Sharpness: 75.0%

✅ [REGISTER] ID document image processed successfully
   ✅ ID embedding generated with quality: 79.2%
✅ Staff registered: France Witness Mokoena - ID: 0212315697087, Role: Intern
   Face quality: 76.7% (Image 1: 73.3%, Image 2: 76.0%, Image 3: 80.2%, Image 4: 77.4%)
   Total embeddings: 4 (ENTERPRISE-GRADE)
   ⚡⚡⚡ TOTAL REGISTRATION TIME: 5055ms (DB save: 473ms)
🔄 Invalidating staff cache...

"john"
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Staff = require("../models/Staff");
const ClockLog = require("../models/ClockLog");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/Employees";

// --------------------------------------
// HELPERS
// --------------------------------------
async function connectDB() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected\n");
}

async function closeDB() {
  await mongoose.connection.close();
  console.log("🔌 Database connection closed");
}

// --------------------------------------
// COMMAND: VIEW ALL STAFF
// --------------------------------------
async function viewAllStaff() {
  await connectDB();

  const staffList = await Staff.find();
  console.log(`📊 Found ${staffList.length} staff member(s):\n`);

  staffList.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (ID: ${s._id}, UserID: ${s.userId || "N/A"})`);
  });

  await closeDB();
}

// --------------------------------------
// COMMAND: DELETE ALL STAFF
// --------------------------------------
async function deleteAllStaff(includeLogs) {
  await connectDB();

  const count = await Staff.countDocuments();
  console.log(`📊 Found ${count} staff to delete`);

  if (count === 0) {
    console.log("ℹ️ No staff to delete.");
    return closeDB();
  }

  console.log("\n⚠️ WARNING: This will delete ALL staff members!");
  console.log("❌ This action CANNOT be undone!\n");

  const result = await Staff.deleteMany({});
  console.log(`🗑️ Deleted ${result.deletedCount} staff`);

  if (includeLogs) {
    const logs = await ClockLog.deleteMany({});
    console.log(`🗑️ Deleted ${logs.deletedCount} clock logs`);
  }

  console.log("✅ Done.");
  await closeDB();
}

// --------------------------------------
// COMMAND: DELETE STAFF BY ID
// --------------------------------------
async function deleteStaffById(id) {
  await connectDB();

  const staff = await Staff.findById(id);

  if (!staff) {
    console.log("⚠️ No staff found with that ID.");
    return closeDB();
  }

  console.log(`🗑️ Deleting: ${staff.name} (ID: ${staff._id})`);
  await Staff.findByIdAndDelete(id);

  console.log("✅ Staff deleted.");
  await closeDB();
}

// --------------------------------------
// COMMAND: DELETE STAFF BY NAME
// --------------------------------------
async function deleteStaffByName(name) {
  await connectDB();

  const regex = new RegExp(name, "i");
  const matches = await Staff.find({ name: regex });

  if (matches.length === 0) {
    console.log("⚠️ No matching staff found.");
    return closeDB();
  }

  console.log(`📊 Found ${matches.length} match(es):\n`);
  matches.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (ID: ${s._id})`);
  });

  console.log("\n🗑️ Deleting them...");
  const result = await Staff.deleteMany({ name: regex });

  console.log(`✅ Deleted ${result.deletedCount} staff`);
  await closeDB();
}

// --------------------------------------
// PARSE COMMAND-LINE INPUT
// --------------------------------------
async function run() {
  const args = process.argv.slice(2);

  if (args.includes("--view")) return viewAllStaff();

  if (args.includes("--delete-all"))
    return deleteAllStaff(args.includes("--include-logs"));

  const idIndex = args.indexOf("--delete-id");
  if (idIndex !== -1) {
    const id = args[idIndex + 1];
    if (!id) return console.log("❌ Missing ID.");
    return deleteStaffById(id);
  }

  const nameIndex = args.indexOf("--delete-name");
  if (nameIndex !== -1) {
    const name = args[nameIndex + 1];
    if (!name) return console.log("❌ Missing name.");
    return deleteStaffByName(name);
  }

  console.log(`
❌ Invalid command.

Available commands:
  --view
  --delete-all [--include-logs]
  --delete-id <id>
  --delete-name "<name>"

Examples:
  node staffManager.js --view
  node staffManager.js --delete-all
  node staffManager.js --delete-id 64fa2c12ab9f
  node staffManager.js --delete-name "john"
`);
}

run();
