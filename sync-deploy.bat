@echo off
setlocal EnableExtensions
chcp 65001 >nul

title CHAM CONG - CAP NHAT APPS SCRIPT
set "PROJECT_DIR=D:\cham_cong"
set "DEPLOYMENT_ID=AKfycbzdMM-3xoEi1O5wJ3enPHBga3Y464J6rrt9RV7Sv978DocXXX5rgIE9AmHjI_22EY-o"
set "REPORT_URL=https://script.google.com/macros/s/AKfycbzdMM-3xoEi1O5wJ3enPHBga3Y464J6rrt9RV7Sv978DocXXX5rgIE9AmHjI_22EY-o/exec?page=baocao"
set "LOG_FILE=%~dp0NHAT_KY_CAP_NHAT_CHAM_CONG.txt"

echo ========================================
echo       CHAM CONG - CAP NHAT APPS SCRIPT
echo ========================================
echo.
echo Bat dau: %date% %time%
echo Nhat ky: %LOG_FILE%
echo. > "%LOG_FILE%"
echo Bat dau: %date% %time%>> "%LOG_FILE%"

if not exist "%PROJECT_DIR%\Code.gs" (
  call :FAIL "Khong tim thay thu muc du an: %PROJECT_DIR%"
  goto :END
)

cd /d "%PROJECT_DIR%"
if errorlevel 1 (
  call :FAIL "Khong mo duoc thu muc du an: %PROJECT_DIR%"
  goto :END
)

where git >nul 2>&1
if errorlevel 1 (
  call :FAIL "Khong tim thay Git tren may."
  goto :END
)

where clasp >nul 2>&1
if errorlevel 1 (
  call :FAIL "Khong tim thay clasp tren may."
  goto :END
)

echo [1/3] Lay ban moi tu GitHub...
echo [1/3] Lay ban moi tu GitHub...>> "%LOG_FILE%"
git pull origin main >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :FAIL "Buoc 1/3 loi: chua lay duoc ban moi tu GitHub."
  goto :END
)

echo [2/3] Day Code.gs va giao dien len Apps Script...
echo [2/3] Day Code.gs va giao dien len Apps Script...>> "%LOG_FILE%"
clasp push >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :FAIL "Buoc 2/3 loi: chua day duoc len Apps Script."
  goto :END
)

echo [3/3] Cap nhat DUNG link bao cao dang dung...
echo [3/3] Cap nhat dung link bao cao dang dung...>> "%LOG_FILE%"
clasp deploy -i "%DEPLOYMENT_ID%" -d "Cap nhat %date% %time%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :FAIL "Buoc 3/3 loi: Code da duoc day len nhung link web CHUA duoc cap nhat."
  goto :END
)

echo XONG: %date% %time%>> "%LOG_FILE%"
echo.
echo ========================================
echo       DA CAP NHAT XONG DUNG LINK BAO CAO
 echo ========================================
echo Mo link nay roi bam Ctrl+Shift+R:
echo %REPORT_URL%
echo.
echo Nhat ky da luu tai:
echo %LOG_FILE%
goto :END

:FAIL
echo LOI: %~1
echo LOI: %~1>> "%LOG_FILE%"
echo.
echo ========================================
echo       CHUA CAP NHAT XONG - XEM NHAT KY
 echo ========================================
echo %LOG_FILE%

:END
echo.
pause
exit /b
