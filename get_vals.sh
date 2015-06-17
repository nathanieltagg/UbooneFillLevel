#!/bin/bash
echo -e "Content-type: text/html\r\n"

theVars="uB_Cryo_IFIX_1_0/TE190 uB_Cryo_IFIX_1_0/TE194 uB_Cryo_IFIX_1_0/LT124 uB_Cryo_IFIX_1_0/LT122_Ar uB_Cryo_IFIX_1_0/LT122_GAL uB_Cryo_IFIX_1_0/LT122_m uB_Cryo_IFIX_1_0/LT122_m3"
if [ -f "/home/uboonesmc/setup_SMC_EPICS.sh" ]; then
  source /home/uboonesmc/setup_SMC_EPICS.sh
  caget -a -f3 $theVars

else
  echo "uB_Cryo_IFIX_1_0/TE190         2015-06-16 16:52:04.229338 100.00"
  echo "uB_Cryo_IFIX_1_0/TE194         2015-06-16 16:52:04.310855 106.40"
  echo "uB_Cryo_IFIX_1_0/LT124         2015-06-16 16:52:03.467802 -0.20"
  echo "uB_Cryo_IFIX_1_0/LT122         2015-06-16 16:52:03.413548 13.40"
fi
