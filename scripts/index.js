const fs = require('fs');
const { exec } = require('child_process');
const chalk = require('chalk');
const gtts = require('better-node-gtts').default;
const { performance } = require('perf_hooks');

// pnpm start -sd

fs.readFile('./config.json', 'utf8', async (err, data) => {
  if (err) console.log(`${chalk.red('✘')} ${err}`);
  obj = JSON.parse(data);

  const VIDEO_SOURCE = obj['video_source'];
  const AUDIO_SOURCE = obj['audio_source'];
  const SUBTITLE_SOURCE = obj['subtitle_source'];
  const TEXT_SOURCE = obj['text_source'];
  const OUTPUT_SOURCE = 'outputs/output.mp4';
  const primaryColor = '&H03fcff';
  let duration;

  const args = process.argv.slice(2);
  let useLib = false;
  let subtitleDebug = false;
  if (args[0] === '-l') useLib = true;
  if (args[0] === '-sd') subtitleDebug = true;

  const write = text => fs.writeFileSync(SUBTITLE_SOURCE, text, err => console.log(err));
  const secondsFormatted = sec => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const remainingSeconds = Math.floor(sec % 60);
    const remainingMilliseconds = ((sec % 60) % 1).toFixed(3).split('.')[1];

    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds},${remainingMilliseconds}`;
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  };

  const generateSubtitles = async () => {
    const startTime = performance.now();
    fs.readFile(TEXT_SOURCE, 'utf8', (err, data) => {
      var re = /(?<!\w\.\w.)(?<![A-Z]\.)(?<![A-Z][a-z]\.)(?<=\.|\?)/g;
      const splitText = data.split(re);

      let textToInsert = '';
      let prevCurrent = [];
      let revisedText = splitText;

      // splitText.forEach((item, index) => {
      //   console.log(item, item.split(' ').length, item.length > 10 ? 'Z' : '');

      //   revisedText.splice(index, 0, 'middle');
      // });

      splitText.forEach((item, index) => {
        if (index === 0) prevCurrent = [0, item.length / 15];
        else prevCurrent = [prevCurrent[1], prevCurrent[1] + item.length / 15];
        if (item[0] === ' ') item = item.substring(1);

        textToInsert += `${index + 1}\n${secondsFormatted(prevCurrent[0])} --> ${secondsFormatted(prevCurrent[1])}\n${item}\n\n`;
        if (index === splitText.length - 1) {
          duration = prevCurrent[1] + 4;
        }
      });
      write(textToInsert);
    });
    const endTime = performance.now();
    fs.stat(SUBTITLE_SOURCE, (err, stats) => console.log(`${chalk.green('✔')} generated subtitle file in ${SUBTITLE_SOURCE} (${formatBytes(stats.size)} | ${(endTime - startTime).toFixed(3)}ms)`));
  };

  const generateAudio = async () => {
    const startTime = performance.now();
    fs.readFile(TEXT_SOURCE, 'utf8', async (err, data) => {
      await gtts.save('audio/audio.mp3', data).then(() => generateVideo());
    });
    const endTime = performance.now();
    fs.stat(AUDIO_SOURCE, (err, stats) => console.log(`${chalk.green('✔')} generated audio file in ${AUDIO_SOURCE} (${formatBytes(stats.size)} | ${(endTime - startTime).toFixed(3)}ms)`));
  };

  const generateVideo = async () => {
    fs.readFile(SUBTITLE_SOURCE, 'utf8', (err, data) => {
      const startTime = performance.now();

      exec(
        `ffmpeg \
        -y \
        -i ${VIDEO_SOURCE} \
        -i ${AUDIO_SOURCE} \
        -map 0:v:0 -map 1:a:0 ${useLib ? '-c:v libx265' : ''} \
        -vf "subtitles=${SUBTITLE_SOURCE}:force_style='Alignment=10,PrimaryColour=${primaryColor},Italic=1,Spacing=0.8'" \
        -t ${duration} \
        ${OUTPUT_SOURCE}`,
        err => {
          const endTime = performance.now();
          if (err === null) fs.stat(VIDEO_SOURCE, (err, stats) => console.log(`${chalk.green('✔')} generated video file in ${OUTPUT_SOURCE} (${formatBytes(stats.size)} | ${(endTime - startTime).toFixed(3)}ms)`));
          else console.log(`${chalk.red('✘')} ${err}`);
        }
      );
    });
  };

  if (subtitleDebug) {
    console.log(`${chalk.blue('→')} subtitle debug is on`);
    generateSubtitles();
    return;
  }

  console.log(`${chalk.blue('→')} starting video generation...`);
  generateSubtitles().then(() => generateAudio());
});
