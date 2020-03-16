printf "UUID: "
read uuid
printf "Name: "
read name
ffmpeg -framerate 24 -i ~/Desktop/WBSScreenshots/$uuid-%08d.jpg $name.mp4