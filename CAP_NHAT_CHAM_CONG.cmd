@echo off
setlocal EnableExtensions
chcp 65001 >nul

title CAP NHAT CHAM CONG - DANG CHAY
set "PROJECT_DIR=D:\CLASP\cham_cong"
set "EXPECTED_SCRIPT_ID=1FUf9yVSki_-dSpM4UfBsdsBuDf2pSdaKNq66ioSYIr12BQfe_qLJolex"
set "DEPLOYMENT_ID=AKfycbzdMM-3xoEi1O5wJ3enPHBga3Y464J6rrt9RV7Sv978DocXXX5rgIE9AmHjI_22EY-o"
set "REPORT_URL=https://script.google.com/macros/s/AKfycbzdMM-3xoEi1O5wJ3enPHBga3Y464J6rrt9RV7Sv978DocXXX5rgIE9AmHjI_22EY-o/exec?page=baocao"
set "LOG_FILE=%~dp0NHAT_KY_CAP_NHAT_CHAM_CONG.txt"
set "DEPLOYMENTS_FILE=%TEMP%\cham_cong_deployments_%RANDOM%.txt"

call :START_LOG

if not exist "%PROJECT_DIR%\Code.gs" (
  call :FAIL "Khong tim thay Code.gs tai %PROJECT_DIR%"
  goto :END
)
if not exist "%PROJECT_DIR%\.clasp.json" (
  call :FAIL "Khong tim thay .clasp.json tai %PROJECT_DIR%"
  goto :END
)
if not exist "%PROJECT_DIR%\.claspignore" (
  call :FAIL "Khong tim thay .claspignore. Dung lai de tranh day file test."
  goto :END
)

cd /d "%PROJECT_DIR%"
if errorlevel 1 (
  call :FAIL "Khong mo duoc thu muc ma: %PROJECT_DIR%"
  goto :END
)

findstr /c:"%EXPECTED_SCRIPT_ID%" "%PROJECT_DIR%\.clasp.json" >nul
if errorlevel 1 (
  call :FAIL ".clasp.json khong phai du an Cham cong can cap nhat."
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

git diff --quiet
if errorlevel 1 (
  call :FAIL "Thu muc dang co sua doi chua luu len GitHub. Em dung lai de tranh ghi de mat sua doi."
  goto :END
)

echo.
echo [1/4] Dang tai Code moi nhat tu GitHub...
echo [1/4] Dang tai Code moi nhat tu GitHub...>> "%LOG_FILE%"
git pull --ff-only origin main >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :FAIL "Buoc 1/4 loi: chua lay duoc Code moi tu GitHub."
  goto :END
)

echo [2/4] Dang kiem tra dung ban Apps Script...
echo [2/4] Dang kiem tra dung ban Apps Script...>> "%LOG_FILE%"
call clasp deployments > "%DEPLOYMENTS_FILE%" 2>&1
set "CLASP_DEPLOYMENTS_ERROR=%ERRORLEVEL%"
type "%DEPLOYMENTS_FILE%" >> "%LOG_FILE%"
if not "%CLASP_DEPLOYMENTS_ERROR%"=="0" (
  call :FAIL "Buoc 2/4 loi: khong doc duoc danh sach trien khai Apps Script."
  goto :END
)
findstr /c:"%DEPLOYMENT_ID%" "%DEPLOYMENTS_FILE%" >nul
if errorlevel 1 (
  call :FAIL "Khong tim thay deployment dang dung. Dung lai de tranh cap nhat nham link."
  goto :END
)

echo [3/4] Dang day Code vao Google Sheet...
echo [3/4] Dang day Code vao Google Sheet...>> "%LOG_FILE%"
call clasp push >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :FAIL "Buoc 3/4 loi: chua day duoc Code len Apps Script."
  goto :END
)

echo [4/4] Dang cap nhat link web dang dung...
echo [4/4] Dang cap nhat link web dang dung...>> "%LOG_FILE%"
call clasp deploy -i "%DEPLOYMENT_ID%" -d "Cap nhat %date% %time%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :FAIL "Buoc 4/4 loi: Code da day len nhung link web CHUA duoc cap nhat."
  goto :END
)

echo XONG: %date% %time%>> "%LOG_FILE%"
echo.
echo ========================================
echo XONG! DA CAP NHAT CHAM CONG
 echo ========================================
echo Mo link nay roi bam Ctrl+Shift+R:
echo %REPORT_URL%
echo.
echo Nhat ky: %LOG_FILE%
goto :END

:START_LOG
echo ========================================
echo CAP NHAT CHAM CONG - DANG CHAY
echo ========================================
echo Thu muc: %PROJECT_DIR%
echo.
echo. > "%LOG_FILE%"
echo Bat dau: %date% %time%>> "%LOG_FILE%"
echo Thu muc ma: %PROJECT_DIR%>> "%LOG_FILE%"
exit /b

:FAIL
echo.
echo LOI: %~1
echo LOI: %~1>> "%LOG_FILE%"
echo.
echo ========================================
echo CHUA CAP NHAT XONG - XEM NHAT KY
 echo ========================================
echo %LOG_FILE%
exit /b

:END
if exist "%DEPLOYMENTS_FILE%" del "%DEPLOYMENTS_FILE%" >nul 2>&1
echo.
pause
exit /b
