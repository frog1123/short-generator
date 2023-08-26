const fs = require('fs');
const { exec } = require('child_process');
const chalk = require('chalk');
const gtts = require('better-node-gtts').default;
const { performance } = require('perf_hooks');
const path = require('path');
const getMP3Duration = require('get-mp3-duration');

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

  const args = process.argv.slice(2);
  let useLib = false;
  let subtitleDebug = false;
  if (args[0] === '-l') useLib = true;

  const write = text => fs.writeFileSync(SUBTITLE_SOURCE, text, err => console.log(`${chalk.red('✘')} ${err}`));
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

  const generateAudioAndSubtitles = () => {
    fs.readdir('./audio', (err, files) => {
      if (err) throw err;

      for (const file of files) {
        fs.unlink(path.join('./audio', file), err => {
          if (err) throw err;
        });
      }
    });

    fs.readFile(TEXT_SOURCE, 'utf8', async (err, data) => {
      var re = /(?<!\w\.\w.)(?<![A-Z]\.)(?<![A-Z][a-z]\.)(?<=\.|\?)/g;
      const splitText = data.split(re);

      let audioDurations = {};

      const startTime = performance.now();
      splitText.forEach(async (item, index) => {
        await gtts.save(`audio/audio_${index + 1}.mp3`, item);
        const buffer = fs.readFileSync(`audio/audio_${index + 1}.mp3`);
        const duration = getMP3Duration(buffer);

        audioDurations[(index + 1).toString()] = duration;
        if (Object.keys(audioDurations).length === splitText.length) {
          let textToInsert = '';
          let prevCurrent = [];
          for (i = 0; i < splitText.length; i++) {
            if (i === 0) prevCurrent = [0, audioDurations[(i + 1).toString()] / 1000];
            else prevCurrent = [prevCurrent[1], prevCurrent[1] + audioDurations[(i + 1).toString()] / 1000];

            textToInsert += `${i + 1}\n${secondsFormatted(prevCurrent[0])} --> ${secondsFormatted(prevCurrent[1])}\n${splitText[i]}\n\n`;
          }
          write(textToInsert);

          let audioFileList = '';
          for (i = 0; i < splitText.length; i++) audioFileList += `-i audio/audio_${i + 1}.mp3 `;

          exec(`ffmpeg ${audioFileList}-filter_complex "[0:a][1:a]concat=n=${splitText.length}:v=0:a=1[outa]" -map "[outa]" audio/audio_final.mp3`, err => {
            if (err) console.log(err);
            exec(
              `ffmpeg \
                -y \
                -i ${VIDEO_SOURCE} \
                -i ${'audio/audio_final.mp3'} \
                -map 0:v:0 -map 1:a:0 ${useLib ? '-c:v libx265' : ''} \
                -vf "subtitles=${SUBTITLE_SOURCE}:force_style='Alignment=10,PrimaryColour=${primaryColor},Italic=1,Spacing=0.8'" \
                -t ${audioDurations[splitText.length.toString()]} \
                ${OUTPUT_SOURCE}`,
              err => {
                if (err !== null) {
                  console.log(err);
                  return;
                }
                const endTime = performance.now();
                console.log(`done in ${(endTime - startTime).toFixed(3)}ms`);
              }
            );
          });
        }
      });
    });
  };

  generateAudioAndSubtitles();
});
