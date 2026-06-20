const ffmpegPath = require('ffmpeg-static');
const { execSync } = require('child_process');
const path = require('path');

const input = path.join(__dirname, '../../docs/demo.mp4');
const output = path.join(__dirname, '../../docs/demo_fixed.mp4');

console.log(`Using ffmpeg at: ${ffmpegPath}`);
try {
    execSync(`"${ffmpegPath}" -y -i "${input}" -c:v libx264 -pix_fmt yuv420p "${output}"`, { stdio: 'inherit' });
    console.log("Successfully re-encoded to demo_fixed.mp4");
} catch (e) {
    console.error("Encoding failed:", e);
}
