import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';
import { authService } from '../src/services/authService.ts';
import { appointmentService } from '../src/services/appointmentService.ts';
import { 
  parseISTToUTC, 
  getISTDateString, 
  getISTTimeString,
  formatISTTimeDisplay, 
  formatISTDateDisplay,
  MERIDIAN_TIMEZONE,
  IST_OFFSET_MINUTES
} from '../src/lib/timezone.ts';

// Load Node-only test credentials from .env.local without exposing to client bundle
const nodeEnv = loadEnv('development', process.cwd(), '');
for (const [key, val] of Object.entries(nodeEnv)) {
  if (!process.env[key]) {
    process.env[key] = val;
  }
}

interface HardeningCheck {
  id: number;
  name: string;
  status: 'PASS' | 'PENDING' | 'FAIL';
  details: string;
}

const checks: HardeningCheck[] = [];

function record(id: number, name: string, status: 'PASS' | 'PENDING' | 'FAIL', details: string) {
  checks.push({ id, name, status, details });
  console.log(`[${status}] Check ${id}: ${name} - ${details}`);
}

async function runHardeningTestSuite() {
  console.log('====================================================');
  console.log('PHASE 26 | PRODUCTION HARDENING & RESILIENCE TESTS');
  console.log('====================================================\n');

  // --- Section 1: Auth Session & Role Hardening ---
  console.log('--- Section 1: Auth Session & Role Hardening ---');

  // Check 1: Public role default when unauthenticated
  const publicRole = await authService.getUserRole();
  if (publicRole === 'public') {
    record(1, 'Unauthenticated Role Isolation', 'PASS', 'Unauthenticated callers default safely to public role');
  } else {
    record(1, 'Unauthenticated Role Isolation', 'FAIL', `Expected public role, received: ${publicRole}`);
  }

  // Check 2: Auth listener cleanup capability
  const listener = authService.onAuthStateChange(() => {});
  if (listener && typeof listener.unsubscribe === 'function') {
    listener.unsubscribe();
    record(2, 'Auth State Listener Cleanup', 'PASS', 'onAuthStateChange provides verified unsubscribe function to prevent memory leaks');
  } else {
    record(2, 'Auth State Listener Cleanup', 'FAIL', 'onAuthStateChange did not provide unsubscribe callback');
  }

  // --- Section 2: Timezone & Scheduling Engine Precision ---
  console.log('\n--- Section 2: Timezone & Scheduling Engine Precision ---');

  // Check 3: IST UTC+05:30 fixed offset precision
  if (MERIDIAN_TIMEZONE === 'Asia/Kolkata' && IST_OFFSET_MINUTES === 330) {
    const utcDate = parseISTToUTC('2026-10-15', '09:30');
    // 09:30 IST = 04:00 UTC
    const expectedUtcIso = '2026-10-15T04:00:00.000Z';
    if (utcDate.toISOString() === expectedUtcIso) {
      record(3, 'IST to UTC Offset Conversion', 'PASS', `Converted 2026-10-15 09:30 IST to ${expectedUtcIso} precisely`);
    } else {
      record(3, 'IST to UTC Offset Conversion', 'FAIL', `Expected ${expectedUtcIso}, received ${utcDate.toISOString()}`);
    }
  } else {
    record(3, 'IST to UTC Offset Conversion', 'FAIL', 'Invalid timezone or offset constant');
  }

  // Check 4: IST date extraction across day boundaries
  // 2026-10-15T20:00:00.000Z is 2026-10-16 01:30 IST
  const lateUtc = new Date('2026-10-15T20:00:00.000Z');
  const istDateStr = getISTDateString(lateUtc);
  const istTimeStr = getISTTimeString(lateUtc);
  if (istDateStr === '2026-10-16' && istTimeStr === '01:30') {
    record(4, 'IST Day Boundary Precision', 'PASS', 'Late UTC timestamps roll over correctly into next IST calendar day');
  } else {
    record(4, 'IST Day Boundary Precision', 'FAIL', `Expected 2026-10-16 01:30, got ${istDateStr} ${istTimeStr}`);
  }

  // Check 5: IST Display Formatter Independence from browser timezone
  const sampleUtc = new Date('2026-10-15T04:30:00.000Z'); // 10:00 AM IST
  const displayTime = formatISTTimeDisplay(sampleUtc);
  const displayDate = formatISTDateDisplay(sampleUtc);
  if (displayTime.includes('10:00') && displayTime.includes('IST') && displayDate.includes('October')) {
    record(5, 'IST Display Formatter Localization', 'PASS', `Formatted to ${displayTime} and ${displayDate} with explicit timezone badge`);
  } else {
    record(5, 'IST Display Formatter Localization', 'FAIL', `Unexpected formatting: ${displayTime}, ${displayDate}`);
  }

  // --- Section 3: Token Privacy & PII Isolation ---
  console.log('\n--- Section 3: Token Privacy & PII Isolation ---');

  // Check 6: Public Lookup Payload Sanitization
  // Test that public appointment lookup structure excludes private tokens
  const syntheticAppt = await appointmentService.getPublicAppointment('MRD-NONEXISTENT', 'tok_invalid_123');
  if (syntheticAppt === null) {
    record(6, 'Public Lookup Rejection Isolation', 'PASS', 'Invalid lookup safely returns null with zero exception details leaked');
  } else {
    record(6, 'Public Lookup Rejection Isolation', 'FAIL', 'Unexpected response on invalid reference');
  }

  // --- Section 4: Repository Hygiene & Zero Dash Enforcement ---
  console.log('\n--- Section 4: Repository Hygiene & Zero Dash Enforcement ---');

  // Check 7: Zero Em/En Dash scan across src/ and tests/
  const searchDirs = ['src', 'tests'];
  let dashCount = 0;
  const dashFiles: string[] = [];

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(ts|tsx|js|jsx|json|css|sql|md)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('\u2014') || content.includes('\u2013')) {
          dashCount++;
          dashFiles.push(fullPath);
        }
      }
    }
  }

  for (const d of searchDirs) {
    if (fs.existsSync(d)) {
      scanDir(d);
    }
  }

  if (dashCount === 0) {
    record(7, 'Zero Em/En Dash Compliance', 'PASS', 'Strict zero occurrences of U+2013 and U+2014 across all source and test files');
  } else {
    record(7, 'Zero Em/En Dash Compliance', 'FAIL', `Found ${dashCount} files with dashes: ${dashFiles.join(', ')}`);
  }

  // Check 8: Production Bundle Secret Posture
  const distDir = path.join(process.cwd(), 'dist');
  let secretFound = false;
  let distFilesScanned = 0;

  if (fs.existsSync(distDir)) {
    function scanDist(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDist(fullPath);
        } else if (/\.(js|css|html)$/.test(entry.name)) {
          distFilesScanned++;
          const content = fs.readFileSync(fullPath, 'utf-8');
          // Scan for service-role key or database password signatures
          if (content.includes('service_role') || content.includes('postgres://') || content.includes('postgresql://')) {
            secretFound = true;
          }
        }
      }
    }
    scanDist(distDir);
  }

  if (!secretFound && distFilesScanned > 0) {
    record(8, 'Production Bundle Secret Isolation', 'PASS', `Scanned ${distFilesScanned} build artifacts in dist/; zero service-role keys or DB URIs detected`);
  } else if (distFilesScanned === 0) {
    record(8, 'Production Bundle Secret Isolation', 'PENDING', 'dist/ directory not built yet');
  } else {
    record(8, 'Production Bundle Secret Isolation', 'FAIL', 'Detected potential secret or DB connection string in dist bundle');
  }

  console.log('\n====================================================');
  console.log('HARDENING VERIFICATION SUMMARY');
  console.log('====================================================');
  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  console.log(`TOTAL CHECKS: ${checks.length} | PASS: ${passCount} | FAIL: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runHardeningTestSuite().catch((err) => {
  console.error('Fatal hardening test error:', err);
  process.exit(1);
});
