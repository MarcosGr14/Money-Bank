import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const MKT = path.join(ROOT, 'marketing');
const rawStageArgument = process.argv.find((argument) => argument.startsWith('--raw-stage='));
const RAW_STAGE = rawStageArgument
  ? path.resolve(ROOT, rawStageArgument.slice('--raw-stage='.length))
  : null;
const jobs = [
  {
    label: 'Comercial',
    dir: 'commercial',
    raw: 'raw-commercial.webm',
    script: 'commercial-script-es.md',
    subtitles: 'commercial-subtitles.srt',
    output: 'moneybank-commercial-es.mp4',
    expected: [70, 80],
  },
  {
    label: 'Tutorial',
    dir: 'tutorial',
    raw: 'raw-tutorial.webm',
    script: 'tutorial-script-es.md',
    subtitles: 'tutorial-subtitles.srt',
    output: 'moneybank-tutorial-es.mp4',
    expected: [65, 75],
  },
];

function probe(filePath) {
  return JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-show_streams', '-show_format', '-of', 'json', filePath,
  ], { encoding: 'utf8' }));
}

function duration(stream, format) {
  const value = Number(stream?.duration ?? format?.duration);
  if (!Number.isFinite(value) || value <= 0) throw new Error('ffprobe did not report a positive stream duration.');
  return value;
}

function rawRecordingPath(job) {
  return RAW_STAGE
    ? path.join(RAW_STAGE, job.dir, job.raw)
    : path.join(MKT, job.dir, job.raw);
}

function timestampSeconds(value) {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) throw new Error(`Invalid SRT timestamp: ${value}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function subtitleEnd(srtPath) {
  const blocks = fs.readFileSync(srtPath, 'utf8').trim().split(/\r?\n\s*\r?\n/);
  let previousEnd = -1;
  for (const block of blocks) {
    const line = block.split(/\r?\n/)[1];
    const match = line?.match(/^(\S+)\s+-->\s+(\S+)$/);
    if (!match) throw new Error(`Invalid subtitle cue in ${srtPath}`);
    const start = timestampSeconds(match[1]);
    const end = timestampSeconds(match[2]);
    if (start < previousEnd || end <= start) throw new Error(`Subtitle cues overlap or have invalid timing in ${srtPath}`);
    previousEnd = end;
  }
  return previousEnd;
}

function narrationFromMarkdown(markdownPath) {
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const match = markdown.match(/\*\*Locución completa \(ES\):\*\*\s+"([^"]+)"/s);
  if (!match) throw new Error(`Complete Spanish narration not found in ${markdownPath}`);
  return match[1];
}

function closeEnough(left, right, tolerance, description) {
  if (Math.abs(left - right) > tolerance) {
    throw new Error(`${description} differs by ${Math.abs(left - right).toFixed(2)} seconds (limit ${tolerance}s).`);
  }
}

// Check all source recordings before generating any artifacts, so a missing input
// cannot leave one rebuilt video beside one stale video.
for (const job of jobs) {
  const rawPath = rawRecordingPath(job);
  if (!fs.existsSync(rawPath)) {
    throw new Error(`Required raw recording is missing: ${rawPath}. Video-only mode will not recapture it.`);
  }
}

const results = [];
for (const job of jobs) {
  const dir = path.join(MKT, job.dir);
  const rawPath = rawRecordingPath(job);
  const srtPath = path.join(dir, job.subtitles);
  const scriptPath = path.join(dir, job.script);
  const wavPath = path.join(dir, job.output.replace(/\.mp4$/, '.wav'));
  const mp4Path = path.join(dir, job.output);
  const stagingPath = mp4Path.replace(/\.mp4$/, '.verified.tmp.mp4');
  const sourceProbe = probe(rawPath);
  const sourceVideo = sourceProbe.streams.find((stream) => stream.codec_type === 'video');
  const sourceDuration = duration(sourceVideo, sourceProbe.format);
  if (sourceVideo.width !== 1920 || sourceVideo.height !== 1080) {
    throw new Error(`${job.label} source recording is not 1920×1080.`);
  }
  if (sourceDuration < job.expected[0] || sourceDuration > job.expected[1]) {
    throw new Error(`${job.label} raw video duration ${sourceDuration.toFixed(2)}s is outside the expected range.`);
  }

  const narration = narrationFromMarkdown(scriptPath);
  execFileSync('espeak-ng', ['-v', 'es', '-s', '143', '-w', wavPath, narration], { stdio: 'inherit' });
  const wavProbe = probe(wavPath);
  const wavDuration = duration(wavProbe.streams.find((stream) => stream.codec_type === 'audio'));
  closeEnough(wavDuration, sourceDuration, 2, `${job.label} narration vs raw video`);
  const captionsEnd = subtitleEnd(srtPath);
  closeEnough(captionsEnd, sourceDuration, 2, `${job.label} final subtitle vs raw video`);

  const escapedSubtitlePath = srtPath.replaceAll('\\', '/').replaceAll("'", "\\'").replaceAll(':', '\\:');
  const filter = 'fps=25';
  execFileSync('ffmpeg', [
    '-y', '-i', rawPath, '-i', wavPath,
    '-map', '0:v:0', '-map', '1:a:0',
    '-vf', filter,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-r', '25',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
    '-movflags', '+faststart', stagingPath,
  ], { stdio: 'inherit' });

  const outputProbe = probe(stagingPath);
  const video = outputProbe.streams.find((stream) => stream.codec_type === 'video');
  const audio = outputProbe.streams.find((stream) => stream.codec_type === 'audio');
  if (!video || !audio || video.codec_name !== 'h264' || audio.codec_name !== 'aac') {
    throw new Error(`${job.label} MP4 must contain H.264 video and AAC audio.`);
  }
  if (video.width !== 1920 || video.height !== 1080) throw new Error(`${job.label} MP4 resolution is not 1920×1080.`);
  const frameRate = video.avg_frame_rate || video.r_frame_rate;
  if (frameRate !== '25/1') throw new Error(`${job.label} MP4 frame rate is ${frameRate}, expected 25/1.`);

  const videoDuration = duration(video);
  const audioDuration = duration(audio);
  const containerDuration = Number(outputProbe.format.duration);
  closeEnough(videoDuration, sourceDuration, 2, `${job.label} MP4 video vs raw video`);
  closeEnough(videoDuration, audioDuration, 2, `${job.label} MP4 audio/video streams`);
  closeEnough(containerDuration, sourceDuration, 2, `${job.label} MP4 container vs raw video`);
  closeEnough(captionsEnd, videoDuration, 2, `${job.label} subtitles vs encoded video`);

  results.push({
    label: job.label,
    sourceDuration,
    videoDuration,
    audioDuration,
    containerDuration,
    wavDuration,
    captionsEnd,
    mp4Path,
    stagingPath,
  });
}

for (const result of results) fs.renameSync(result.stagingPath, result.mp4Path);

if (!process.argv.includes('--preserve-readme')) {
  const readmePath = path.join(MKT, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf8');
  const report = [
    '## Duraciones y verificación de video',
    '',
    '| Entregable | Grabación fuente | Video MP4 | Audio MP4 | WAV locución | Contenedor | FFprobe |',
    '|---|---:|---:|---:|---:|---:|---|',
    ...results.map((result) => `| ${result.label} | ${result.sourceDuration.toFixed(2)} s | ${result.videoDuration.toFixed(2)} s | ${result.audioDuration.toFixed(2)} s | ${result.wavDuration.toFixed(2)} s | ${result.containerDuration.toFixed(2)} s | H.264, AAC, 1920×1080, 25 FPS; flujos y duración verificados |`),
    '',
    'Los MP4 se codifican desde los WebM originales. Se conservan los WebM y los WAV de locución para futuras reexportaciones.',
    '',
  ].join('\n');
  if (readme.includes('## Duraciones y verificación de video')) {
    readme = readme.replace(/## Duraciones y verificación de video[\s\S]*?(?=## Regeneración)/, report);
  } else {
    readme = readme.replace('## Regeneración', `${report}\n## Regeneración`);
  }
  fs.writeFileSync(readmePath, readme, 'utf8');
}

for (const result of results) {
  console.log(`${result.label}: fuente=${result.sourceDuration.toFixed(2)}s, video=${result.videoDuration.toFixed(2)}s, audio=${result.audioDuration.toFixed(2)}s, contenedor=${result.containerDuration.toFixed(2)}s; ffprobe OK`);
}
