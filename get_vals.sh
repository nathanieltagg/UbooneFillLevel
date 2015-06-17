#!/bin/bash
echo -e "Content-type: text/html\r\n"

theVars="uB_Cryo_IFIX_1_0/TE190 uB_Cryo_IFIX_1_0/TE194 uB_Cryo_IFIX_1_0/LT124 uB_Cryo_IFIX_1_0/LT122_Ar uB_Cryo_IFIX_1_0/LT122_GAL uB_Cryo_IFIX_1_0/LT122_m uB_Cryo_IFIX_1_0/LT122_m3"
if [ -f "/home/uboonesmc/setup_SMC_EPICS.sh" ]; then
  source /home/uboonesmc/setup_SMC_EPICS.sh
  caget -a -f3 $theVars

else
echo "uB_Cryo_IFIX_1_0/TE190         2015-06-17 13:38:09.130451 98.200"
echo "uB_Cryo_IFIX_1_0/TE194         2015-06-17 13:38:09.211922 104.600"
echo "uB_Cryo_IFIX_1_0/LT124         2015-06-17 13:38:03.419006 -0.200"
echo "uB_Cryo_IFIX_1_0/LT122_Ar      2015-06-17 13:38:03.309847 9.589"
echo "uB_Cryo_IFIX_1_0/LT122_GAL     2015-06-17 13:38:03.338043 947.337"
echo "uB_Cryo_IFIX_1_0/LT122_m       2015-06-17 13:41:22.765553 0.270"
fi
