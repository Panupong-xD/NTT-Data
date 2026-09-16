#!/bin/bash
echo "กำลังเปิด Google Chrome แบบปิดการตรวจ CORS..."
open -na "Google Chrome" --args --user-data-dir="/tmp/chrome-no-cors-swu" --disable-web-security --disable-site-isolation-trials
echo "เปิดเสร็จสิ้น กรุณาเปิดเว็บ http://localhost:3002 ในหน้าต่าง Chrome ที่เปิดขึ้นมาใหม่นี้"
