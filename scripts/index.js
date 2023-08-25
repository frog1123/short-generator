const fs = require('fs');
const { exec } = require('child_process');
const chalk = require('chalk');
const gtts = require('better-node-gtts').default;
const { performance } = require('perf_hooks');

fs.readFile('./config.json', 'utf8', (err, data) => {
  if (err) console.log(`${chalk.red('✘')} ${err}`);
  obj = JSON.parse(data);

  const VIDEO_SOURCE = obj['video_source'];
  const AUDIO_SOURCE = obj['audio_source'];
  const SUBTITLE_SOURCE = obj['subtitle_source'];
  const str = obj['text'];
  const primaryColor = '&H03fcff';

  // const delay = ms => new Promise(res => setTimeout(res, ms));
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

  // const args = process.argv.slice(2);

  const generateSubtitles = async () => {
    const startTime = performance.now();

    var re = /(?<!\w\.\w.)(?<![A-Z]\.)(?<![A-Z][a-z]\.)(?<=\.|\?)/g;
    const splitText = str.split(re);

    let textToInsert = '';
    let prevCurrent = [];
    splitText.forEach((item, index) => {
      if (index === 0) prevCurrent = [0, item.length / 15];
      else prevCurrent = [prevCurrent[1], prevCurrent[1] + item.length / 15];
      if (item[0] === ' ') item = item.substring(1);

      textToInsert += `${index + 1}\n${secondsFormatted(prevCurrent[0])} --> ${secondsFormatted(prevCurrent[1])}\n${item}\n\n`;
    });
    write(textToInsert);
    const endTime = performance.now();

    console.log(`${chalk.green('✔')} generated srt file in ${SUBTITLE_SOURCE} (${(endTime - startTime).toFixed(3)}ms)`);
  };

  const generateAudio = async () => {
    const startTime = performance.now();
    await gtts.save('audio/audio.mp3', str).then(() => {
      const endTime = performance.now();
      console.log(`${chalk.green('✔')} generated audio file in ${AUDIO_SOURCE} (${(endTime - startTime).toFixed(3)}ms)`);
    });
  };

  const generateVideo = async () => {
    const startTime = performance.now();
    var re = /(?<!\w\.\w.)(?<![A-Z]\.)(?<![A-Z][a-z]\.)(?<=\.|\?)/g;
    const splitText = str.split(re);
    const duration = splitText.length * 5 + 6;

    exec(
      `ffmpeg \
        -y \
        -i ${VIDEO_SOURCE} \
        -i ${AUDIO_SOURCE} \
        -map 0:v:0 -map 1:a:0 \
        -vf "subtitles=${SUBTITLE_SOURCE}:force_style='Alignment=10,PrimaryColour=${primaryColor},Italic=1,Spacing=0.8'" \
        -t ${duration} \
        outputs/output.mp4`,
      err => {
        const endTime = performance.now();
        if (err === null) console.log(`${chalk.green('✔')} generated video file in ${VIDEO_SOURCE} (${(endTime - startTime).toFixed(3)}ms)`);
        else console.log(`${chalk.red('✘')} ${err}`);
      }
    );
  };

  generateSubtitles()
    .then(() => generateAudio())
    .then(() => generateVideo());
});
