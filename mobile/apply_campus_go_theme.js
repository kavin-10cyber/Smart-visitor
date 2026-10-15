const fs = require('fs');
const path = require('path');

const targetFiles = [
  'App.js',
  'src/screens/LoginScreen.js',
  'src/screens/AdminPortal.js',
  'src/screens/SecurityPortal.js',
  'src/screens/EventPortal.js',
  'src/components/AdminIcons.js',
  'src/components/QRScanner.js',
  'src/components/QRCodeDisplay.js',
  'src/components/admin/AddEventModal.js',
  'src/components/admin/CalendarPicker.js',
  'src/components/admin/IssueScheduledTokenModal.js',
  'src/components/admin/NotificationsModal.js',
  'src/components/admin/ProfileMenuModal.js',
  'src/components/admin/QRPreviewModal.js',
  'src/components/admin/RescheduleModal.js',
  'src/components/admin/VisitorCard.js',
  'src/components/admin/VisitorDetailsModal.js',
  'src/components/admin/VisitorHistoryModal.js',
  'src/components/common/LiveHeaderClock.js',
  'src/components/security/SecurityModals.js',
];

const colorReplacements = [
  // Primary Navy Brand System
  [/#6C5CE7/gi, '#0B2A5B'],
  [/#8B78FF/gi, '#35D49A'],
  [/#5642DE/gi, '#071D40'],
  [/#4D3BC2/gi, '#071D40'],
  
  // Soft surfaces & light blue tints
  [/#F4F0FF/gi, '#F1F5FA'],
  [/#E5DDFF/gi, '#DCE5F0'],
  [/#EEF0F6/gi, '#DCE5F0'],
  [/#F7F8FC/gi, '#F7F9FC'],
  [/#F8FAFC/gi, '#F7F9FC'],
  
  // Text & Typography hierarchy
  [/#14172C/gi, '#10233F'],
  [/#141624/gi, '#071D40'],
  [/#667085/gi, '#52657D'],
  [/#94A3B8/gi, '#7B8CA3'],

  // Purple categories converted to Campus-Go Brand surfaces
  [/#F2EBFE/gi, '#F1F5FA'],
  [/#7C3AED/gi, '#123B73'],
  [/#DDD6FE/gi, '#DCE5F0'],
];

let updatedCount = 0;

for (const relPath of targetFiles) {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  for (const [regex, replacement] of colorReplacements) {
    content = content.replace(regex, replacement);
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    updatedCount++;
    console.log(`Updated colors in: ${relPath}`);
  }
}

console.log(`Successfully updated ${updatedCount} files to Campus-Go color system.`);
