num=0
uuid=$(uuidgen)
while [ 1 ]; do
  printf -v numstr "%08d" $num;
  screencapture -D 2 -t jpg -x ~/Desktop/WBSScreenshots/$uuid-$numstr.jpg;
  num=$((num + 1));
  sleep 60;
done
