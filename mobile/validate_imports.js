const fs = require('fs');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s+((?:[^{}\n]+,?\s*)?(?:\{[^}]+\})?)\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    const clause = m[1].trim();
    const source = m[2].trim();
    
    // Resolve relative path
    if (source.startsWith('.')) {
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      let resolved = dir + '/' + source;
      if (!fs.existsSync(resolved)) {
        if (fs.existsSync(resolved + '.js')) resolved = resolved + '.js';
        else if (fs.existsSync(resolved + '/index.js')) resolved = resolved + '/index.js';
      }
      
      if (fs.existsSync(resolved)) {
        const sourceCode = fs.readFileSync(resolved, 'utf8');
        
        // Check default import
        if (clause.startsWith('{') === false) {
          const defaultName = clause.split(',')[0].trim();
          if (defaultName && !defaultName.startsWith('{')) {
            const hasDefault = /export\s+default\s+/.test(sourceCode);
            if (!hasDefault) {
              console.log(`[DEFAULT IMPORT MISMATCH] In ${filePath}: imported default "${defaultName}" from "${source}", but "${resolved}" does NOT export default!`);
            }
          }
        }
        
        // Check named imports
        if (clause.includes('{')) {
          const namedPart = clause.substring(clause.indexOf('{') + 1, clause.indexOf('}'));
          const items = namedPart.split(',').map(s => s.trim()).filter(Boolean);
          for (const item of items) {
            const clean = item.split(' as ')[0].trim();
            const exportRegex1 = new RegExp(`export\\s+(?:function|const|let|var|class)\\s+${clean}\\b`);
            const exportRegex2 = new RegExp(`export\\s*\\{[^}]*\\b${clean}\\b[^}]*\\}`);
            if (!exportRegex1.test(sourceCode) && !exportRegex2.test(sourceCode)) {
              console.log(`[NAMED IMPORT MISMATCH] In ${filePath}: named import "${clean}" not exported in "${resolved}"!`);
            }
          }
        }
      } else {
        console.log(`[FILE NOT FOUND] In ${filePath}: cannot find "${source}"`);
      }
    }
  }
}

const allFiles = [
  './App.js',
  './src/screens/LoginScreen.js',
  './src/screens/AdminPortal.js',
  './src/screens/EventPortal.js',
  './src/screens/SecurityPortal.js',
  './src/components/admin/VisitorCard.js',
  './src/components/admin/VisitorDetailsModal.js',
  './src/components/admin/QRPreviewModal.js',
  './src/components/admin/IssueScheduledTokenModal.js',
  './src/components/admin/RescheduleModal.js',
  './src/components/admin/NotificationsModal.js',
  './src/components/admin/ProfileMenuModal.js',
  './src/components/admin/AddEventModal.js',
  './src/components/admin/VisitorHistoryModal.js',
  './src/components/admin/CalendarPicker.js',
  './src/components/security/SecurityModals.js',
  './src/components/common/LiveHeaderClock.js',
  './src/components/QRCodeDisplay.js',
  './src/components/AdminIcons.js',
];

allFiles.forEach(checkFile);
