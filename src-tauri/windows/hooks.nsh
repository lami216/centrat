!define EFC_HOOK_DIR "${__FILEDIR__}"

!macro NSIS_HOOK_POSTINSTALL
  SetOutPath "$INSTDIR"
  Delete "$INSTDIR\efc-logo-*.ico"
  File /oname=efc-logo-${VERSION}.ico "${EFC_HOOK_DIR}\..\icons\icon.ico"
  Delete "$DESKTOP\${PRODUCTNAME}.lnk"
  CreateShortcut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\efc-logo-${VERSION}.ico" 0
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
