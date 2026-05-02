import webpush from 'web-push';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_KEY || 'BH8BfV6Oo4RrVZeHHf2hHE-zbh4AXzWvspmV8Pv37hWgDrgnOr3T7kiB2J0D7uSiWCEG_-9S2sr4t8CZE-NGy3k';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'p4m60v-Xa5Dhj-iOge6Fd-j-Lsrcfxv8U27oTsedOUk';

webpush.setVapidDetails(
  'mailto:support@bikecaretracker.com',
  publicVapidKey,
  privateVapidKey
);

export { webpush, publicVapidKey };
