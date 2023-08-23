VIDEO_SOURCE="videos/video.mp4"
AUDIO_SOURCE="audio/audio.mp3"
SUBTITLE_SOURCE="subtitles/subtitle.srt"

# ffmpeg \
#   -i "$VIDEO_SOURCE" \
#   -i "$AUDIO_SOURCE" \
#   -c copy -map 0:v:0 -map 1:a:0 \
#   -vf "subtitles="$SUBTITLE_SOURCE":force_style='Alignment=0,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=5,MarginV=25'" \
#   outputs/output.mp4 

ffmpeg \
  -i "$VIDEO_SOURCE" \
  -i "$AUDIO_SOURCE" \
  -map 0:v:0 -map 1:a:0 \
  -vf "subtitles="$SUBTITLE_SOURCE":force_style='Alignment=0,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=5,MarginV=25'" \
  outputs/output.mp4 


# ffmpeg -i "$VIDEO_SOURCE" -i "$AUDIO_SOURCE" -c copy -map 0:v:0 -map 1:a:0 output.mp4