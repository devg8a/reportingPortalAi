let apiEndpoint: string = '';
const hostname: string = window.location.hostname;
const isLive: boolean = window.location.hostname !== 'localhost';

if (hostname === 'v2reports.group8a.com') {
    apiEndpoint = 'https://apireports.group8a.com';
} else if (hostname === 'localhost') {
    apiEndpoint = 'http://localhost:3002';
}

export { apiEndpoint, isLive };
