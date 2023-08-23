const fs = require('fs');

const subtitleFile = 'subtitles/subtitle.srt';
const delay = ms => new Promise(res => setTimeout(res, ms));
const write = text => fs.writeFileSync(subtitleFile, text, err => console.log(err));
const secondsFormatted = sec => {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSeconds = sec % 60;

  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const formattedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds},000`;
};

var re = /(?<!\w\.\w.)(?<![A-Z]\.)(?<![A-Z][a-z]\.)(?<=\.|\?)/g;
var str = 'I visited a bar in Kansas. At the entrance I see, "Welcome to the bar!" While leaving that place I see message, "Good night!". I wondered how they changed the name.';

const splitText = str.split(re);
console.log(splitText);

let textToInsert = '';
splitText.forEach((item, index) => {
  textToInsert += `${index + 1}\n${secondsFormatted(index * 5)} --> ${secondsFormatted(index * 5 + 5)}\n${item}\n\n`;
});
write(textToInsert);
