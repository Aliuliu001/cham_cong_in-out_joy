@echo off
setlocal EnableExtensions
chcp 65001 >nul

title KIEM TRA AN TOAN - CAP NHAT CHAM CONG
set "PROJECT_DIR=D:\CLASP\cham_cong__THU_SAI"
set "LOG_FILE=%~dp0NHAT_KY_KIEM_TRA_LAUNCHER.txt"

echo ========================================
echo KIEM TRA AN TOAN - KHONG DAY APPS SCRIPT
echo ========================================
echo.
echo File nay CO TINH dung thu muc sai de thu man hinh co dung lai khong.
echo Khong goi Git, khong goi clasp, khong dua Code len Google.
echo. > "%LOG_FILE%"
echo Bat dau: %date% %time%>> "%LOG_FILE%"

if not exist "%PROJECT_DIR%\Code.gs" (
  echo LOI: Khong tim thay Code.gs tai %PROJECT_DIR%
  echo LOI: Khong tim thay Code.gs tai %PROJECT_DIR%>> "%LOG_FILE%"
  echo.
  echo PASS: Da dung an toan truoc khi chay bat ky buoc cap nhat nao.
  echo Nhat ky: %LOG_FILE%
  echo.
  pause
  exit /b
)

echo LOI: Bai kiem tra khong dung nhu du kien. DUNG LAI.
echo LOI: Bai kiem tra khong dung nhu du kien. DUNG LAI.>> "%LOG_FILE%"
pause
exit /b
