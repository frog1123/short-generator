const fs = require('fs');
const { exec } = require('child_process');
const chalk = require('chalk');
const gtts = require('better-node-gtts').default;
const { performance } = require('perf_hooks');
const path = require('path');
const getMP3Duration = require('get-mp3-duration');

let done = false;
const loadingMessage = args => {
  const startTime = performance.now();
  const P = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let x = 0;
  setInterval(() => {
    if (done) return;
    const endTime = performance.now();
    process.stdout.write(`${'\r' + chalk.blue(P[x++])} generating your video ${args.length > 0 ? `[flags: ${args}]` : ''} (${((endTime - startTime) / 1000).toFixed(3)}s)`);
    x = x % P.length;
  }, 50);
};

const write = (text, where) => fs.writeFileSync(`${where}/subtitles.srt`, text, err => console.log(`${chalk.red('✘')} ${err}`));

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

fs.readFile('./config.json', 'utf8', async (err, data) => {
  if (err) console.log(`${chalk.red('✘')} ${err}`);
  obj = JSON.parse(data);

  const VIDEO_SOURCE = obj['video_source'];
  const AUDIO_OUTPUT = obj['audio_output'];
  const SUBTITLE_OUTPUT = obj['subtitle_output'];
  const TEXT_SOURCE = obj['text_source'];
  const OUTPUT_SOURCE = obj['output_source'];
  const video_offset = parseFloat(obj['video_offset']);
  const tempo = obj['tempo'];

  let preTextColor = obj['text_color'];
  preTextColor = preTextColor.slice(1);
  const textColor = `&H${preTextColor[4]}${preTextColor[5]}${preTextColor[2]}${preTextColor[3]}${preTextColor[0]}${preTextColor[1]}`;
  // &H blue green red

  const args = process.argv.slice(2);
  let useLib = false;
  let useSar = false;
  if (args.includes('-l')) useLib = true;
  if (args.includes('-sar')) useSar = true;

  const generate = () => {
    const startTime = performance.now();
    loadingMessage(args);

    fs.readdir(AUDIO_OUTPUT, (err, files) => {
      if (err) throw err;
      for (const file of files) {
        if (!file.endsWith('.mp3')) return;
        fs.unlink(path.join(AUDIO_OUTPUT, file), err => {
          if (err) throw err;
        });
      }
    });

    fs.readFile(TEXT_SOURCE, 'utf8', async (err, data) => {
      const regex = /(?<!\w\.\w.)(?<![A-Z]\.)(?<![A-Z][a-z]\.)(?<=\.|\?)/g;
      // const regex = /(?<=\w[.!?])\s+(?=\w)|(?<=\w[.!?])\s*$|(?<=\w,)\s+|(?<=\w,)\s*$/;
      let preSplitText = data.split(regex);
      let splitText = [];

      for (let i = 0; i < preSplitText.length; i++) {
        preSplitText[i] = preSplitText[i].replace(/[,.]/g, '').replace(/\r?\n/g, ' ');
        const words = preSplitText[i].split(' ');
        const groups = [];

        let maxWords = words.length;
        if (words.length > 8) maxWords = Math.ceil(words.length / 2);
        if (words.length > 15) maxWords = Math.ceil(words.length / 3);
        if (words.length > 20) maxWords = Math.ceil(words.length / 4);
        if (words.length > 30) maxWords = Math.ceil(words.length / 5);
        if (words.length > 40) maxWords = Math.ceil(words.length / 6);

        for (let j = 0; j < words.length; j += 5) {
          let group = words.slice(j, j + 5).join(' ');
          if (group[0] === ' ') group = group.substring(1);
          if (group !== '') groups.push(group);
        }
        splitText.push(...groups);
      }

      let audioDurations = {};
      let totalDuration;

      splitText.forEach(async (item, index) => {
        await gtts.save(`${AUDIO_OUTPUT}/audio_${index + 1}.mp3`, item);
        // --
        exec(
          `ffmpeg \
            -i ${AUDIO_OUTPUT}/audio_${index + 1}.mp3 \
            -af "atempo=${tempo},areverse,atrim=start=0,silenceremove=start_periods=1:start_silence=0.1:start_threshold=0.02,areverse,atrim=start=0,silenceremove=start_periods=1:start_silence=0.1:start_threshold=0.02" \
            ${AUDIO_OUTPUT}/audio_m${index + 1}.mp3`,
          err => {
            if (err !== null) console.log(`${chalk.red('✘')} ${err}`);
            const buffer = fs.readFileSync(`${AUDIO_OUTPUT}/audio_m${index + 1}.mp3`);
            const duration = getMP3Duration(buffer);

            audioDurations[(index + 1).toString()] = duration;
            if (Object.keys(audioDurations).length === splitText.length) {
              let textToInsert = '';
              let prevCurrent = [];
              for (i = 0; i < splitText.length; i++) {
                if (i === 0) prevCurrent = [0.05, (audioDurations[(i + 1).toString()] / 1000) * 0.935];
                else prevCurrent = [prevCurrent[1], prevCurrent[1] + (audioDurations[(i + 1).toString()] / 1000) * 0.935];

                console.log(i, prevCurrent, audioDurations[(i + 1).toString()] / 1000);

                totalDuration = prevCurrent[1] + 0.5;

                textToInsert += `${i + 1}\n${secondsFormatted(prevCurrent[0])} --> ${secondsFormatted(prevCurrent[1])}\n${splitText[i]}\n\n`;
              }
              write(textToInsert, SUBTITLE_OUTPUT);

              let audioFileList = '';
              for (i = 0; i < splitText.length; i++) audioFileList += `-i ${AUDIO_OUTPUT}/audio_m${i + 1}.mp3 `;

              exec(`ffmpeg ${audioFileList}-filter_complex "[0:a][1:a]concat=n=${splitText.length}:v=0:a=1[outa]" -map "[outa]" ${AUDIO_OUTPUT}/audio_final.mp3`, err => {
                if (err) console.log(`${chalk.red('✘')} ${err}`);

                const generateVideo = () =>
                  exec(
                    `ffmpeg \
                    -y \
                    -i ${useSar || video_offset > 0 ? `${OUTPUT_SOURCE}/output_1.mp4` : VIDEO_SOURCE} \
                    -i ${AUDIO_OUTPUT}/audio_final.mp3 \
                    -map 0:v:0 -map 1:a:0 ${useLib ? '-c:v libx265' : ''} \
                    -vf "subtitles=${`${SUBTITLE_OUTPUT}/subtitles.srt`}:force_style='Alignment=10,PrimaryColour=${textColor},Italic=1,Spacing=0.8'" \
                    -t ${totalDuration} \
                    ${OUTPUT_SOURCE}/output.mp4`,
                    err => {
                      if (err !== null) {
                        console.log(`${chalk.red('✘')} ${err}`);
                        return;
                      }
                      const endTime = performance.now();
                      fs.stat(`${OUTPUT_SOURCE}/output.mp4`, (err, stats) => {
                        done = true;
                        process.stdout.write(`\r${chalk.green('✔')} generated output to ${OUTPUT_SOURCE}/output.mp4 in ${((endTime - startTime) / 1000).toFixed(3)}s (${formatBytes(stats.size)})`);
                        console.log('');
                        process.exit();
                      });
                    }
                  );

                if (useSar || video_offset > 0) {
                  fs.readdir(OUTPUT_SOURCE, (err, files) => {
                    if (err) throw err;
                    for (const file of files) {
                      if (!file.endsWith('.mp4')) return;
                      fs.unlink(path.join(OUTPUT_SOURCE, file), err => {
                        if (err) throw err;
                      });
                    }
                  });
                  exec(`ffmpeg -i ${VIDEO_SOURCE}${useSar ? ' -vf crop=607.50:1080:656.25:0' : ''} -ss ${video_offset} -t ${totalDuration} ${OUTPUT_SOURCE}/output_1.mp4 `, err => {
                    generateVideo();
                  });
                } else {
                  generateVideo();
                }
              });
            }
          }
        );
      });
    });
  };

  generate();
});
