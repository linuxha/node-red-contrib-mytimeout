#!/bin/bash

# This is my test suite I use to test node-red-contrib-mytimeout
# It contains a bunch of tests that use a spefic set of flows
# and MQTT topics to publish and subscribe to to make sure I get
# the expected results.
# Of course, WIP (Work In Progress)

err_msg=()                                 # empty
declare -A err_msg2=()                     # empty
n=0

results="results.txt"

# Inputs:
#   Name: MyTimeout
#   Output Topic: zTopic
#   Timer on payload: on (safe)
#   Warning state payload: warn
#   Timer off payload: off (unsafe)
#   Countdown (sec): 5
#   Warning (sec): 2
#   [x] debug loggin
#   [ ] Ignore input case
basePath="home/test"
wcTopic="${basePath}/#"
msgTopic="${basePath}/msgTopic"
cmdInTopic="${basePath}/base-test-cmdIn"
cmdOutTopic="${basePath}/base-test-cmdOut"
ticksTopic="${basePath}/base-test-ticksOut"

# ------------------------------------------------------------------------------

# push item to the end of the array (LIFO)
err_push() {
    err_msg=("${err_msg[@]}" "[${1}]=\"${2}\"" ) 
    err_msg2["${1}"]="${2}"
}

quiet=1
# This is the mock up of the test I want RFW to do on each one of these requirements
# I really need to sit down anw write these requirements
sub() {
    wcTopic="${1}"
    timeOut="${2}"
    file="${3}"

    # timeout <duration> <cmd> <args ...>
    # mosquitto_sub ${OPTS} -v -t ${topic} | tee ${results} &
    # Timeout must be n+1
    if [ ${timeOut} == 0 ]; then
        timeOut=1
    fi

    if [ ${quiet} == 0 ]; then
        timeout ${timeOut} mosquitto_sub ${OPTS} -v -t ${wcTopic} | \
            awk '{ print strftime("%F_%T.%s"), "" $0; fflush(); }' | \
            tee ${file} &
    else
        timeout ${timeOut} mosquitto_sub ${OPTS} -v -t ${wcTopic} | \
            awk '{ print strftime("%F_%T.%s"), "" $0; fflush(); }' > ${file} &
    fi
}

pub() {
    topic="${1}"
    msg="${2}"

    mosquitto_pub -t "${topic}" -m "${msg}"
}

drain() {
    mosquitto_pub -n -r -t "${1}"
}

# ------------------------------------------------------------------------------
# drain the topics
list='${basePath}/wu-08831
      ${msgTopic}
      ${cmdOutTopic}
      ${ticksTopic}
      ${basePath}/countdown-out-b-txt
      ${basePath}/countdown-out-a-txt
      ${basePath}/countdown-out-c-txt
      ${basePath}/countdown-out-D-txt
      ${basePath}/countdown-out-d-txt
      ${basePath}/countdown-out-msg.payload-txt'

# Is this a good idea?
for i in ${list}
do
    drain "${i}"
done

# Basic test with checks for the number of commands output and
# the number of ticks output
# checks occur after the timeout of the mosquitto_sub wild card
# so a wait occurs with this function
myTest() {
    local testNom="${Array[1]}"
    local desc="${Array[0]}"
    local wcTopic="${Array[2]}"
    local file="${Array[3]}"
    local cmdInTopic="${Array[4]}"
    local msg="${Array[5]}"
    local cmdCount="${Array[6]}"
    local tickCount="${Array[7]}"
    local cmdOutTopic="${Array[8]}"

    echo -e "\n\n"

    mkdir -p ${testNom}

    sub ${wcTopic} ${tickCount} ${file}

    #echo "Array: <${Array[*]}> / <${Array[@]}>"
    pub "${msgTopic}" "Name: ${testNom}"

    echo "${testNom}: Description(${testNom}): ${desc}"
    pub "${msgTopic}" "Desc: ${desc}"

    # @FIXME: Don't try to use ${msg} it gets the description instead
    echo "${testNom}: Command: <${Array[5]}>"
    pub "${cmdInTopic}" "${Array[5]}"

    wait "%1"

    echo "${testNom}: --------------------------------------------------------------------------------"

    result=$(grep "${cmdOutTopic}" ${file} | wc -l)
    if [ $result -ne ${cmdCount} ]; then
        echo "${testNom}: Command check failed (${result} != ${cmdCount})"
        err_push "${testNom}a" "${desc}: Command check failed (${result} != ${cmdCount})"
        #exit 1
    else
        echo "${testNom}: Command check passed"
    fi

    result=$(grep "${ticksTopic}" ${file} | wc -l)
    if [ $result -ne ${tickCount} ]; then
        echo "${testNom}: Ticks check failed (${result} != ${tickCount})"
        err_push "${testNom}b" "${desc}: Ticks check failed (${result} != ${tickCount})"
        #exit 1
    else
        echo "${testNom}: Ticks check passed"
    fi

    echo "${testNom}: --------------------------------------------------------------------------------"
    echo "${testNom}: All passed"
}

# Same as myTest but no wait for background mosquitto_sub process and
# no checks (which occur after the subscription has timed out)
myTestNoWait() {
    local testNom="${Array[1]}"
    local desc="${Array[0]}"
    local wcTopic="${Array[2]}"
    local file="${Array[3]}"
    local cmdInTopic="${Array[4]}"
    local msg="${Array[5]}"
    local cmdCount="${Array[6]}"
    local tickCount="${Array[7]}"
    local cmdOutTopic="${Array[8]}"

    echo -e "\n\n"
    #echo "msg:   ${msg}"
    #echo "Count: ${cmdCount}"
    #echo "tick:  ${tickCount}"

    mkdir -p ${testNom}

    sub ${wcTopic} ${tickCount} ${file}

    #echo "Array: <${Array[*]}> / <${Array[@]}>"
    pub "${msgTopic}" "Name: ${testNom}"

    echo "${testNom}: Description(${testNom}): ${desc}"
    pub "${msgTopic}" "Desc: ${desc}"

    # @FIXME: Don't try to use ${msg} it gets the description instead
    echo "${testNom}: Command: <${Array[5]}>"
    pub "${cmdInTopic}" "${Array[5]}"
}

# ==============================================================================

# Inputs:
#   Name: MyTimeout
#   Output Topic: zTopic
#   Timer on payload: on (safe)
#   Warning state payload: warn
#   Timer off payload: off (unsafe)
#   Countdown (sec): 5
#   Warning (sec): 2
#   [x] debug loggin
#   [ ] Ignore input case
#

# -[ Test01 ]-------------------------------------------------------------------
testNom="Test01"
desc="Base test, send on"
n=$[$n+1]
file="${testNom}/${results}"
msg="on"
#Array =( [1]=one [2]=two [3]=three [4]=four [5]=five [101]=zero )
#   [1]=${testNom}
#   [2]=${wcTopic}
#   [3]=${file}
#   [4]=${cmdInTopic}
#   [5]=${msg}
#   [6]=${cmdCount}
#   [7]=${tickCount} # ticks+1
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=3
    [7]=6
    [8]="${cmdOutTopic}"
)

myTest $Array

# -[ Test02 ]-------------------------------------------------------------------
# send '{"payload": "", "warning": "0" }'
# timer should not issue an 'on' message
# countdown should start from 5 and countdown to 0 (??? really should be 4 - 0)
# should not issue a warning message
# should issue an off message
testNom="Test02"
desc="Test with empty payload '' and no warning msg"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "", "warning": "0", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=1
    [7]=6
    [8]="${cmdOutTopic}"
)

myTest $Array

# -[ Test03 ]-------------------------------------------------------------------
testNom="Test03"
desc="Test with timeout override (integer)"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": 10, "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=3
    [7]=11
    [8]="${cmdOutTopic}"
)

myTest "${Array[*]}"

# -[ Test04 ]-------------------------------------------------------------------
testNom="Test04"
desc="Test with short timeout override and extra attribute"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": 3, "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=3
    [7]=4
    [8]="${cmdOutTopic}"
)

myTest "${Array[*]}"
# Need further tests here

result=$(grep "${cmdOutTopic}" ${file} | grep '"extraAttr":"Extra attributes"'| wc -l)
echo "${testNom}: Extra attributes: $result / ${Array[6]}"
if [ $result -ne ${Array[6]} ]; then
    echo "${testNom}: Extra attributes check failed (${result} != ${Array[6]})"
    err_push "${testNom}c" "${desc}: Command extra attributes failed (${result} != ${Array[6]})"
    #exit 1
else
    echo "${testNom}: Command check passed"
fi

# -[ Test05 ]-------------------------------------------------------------------
testNom="Test05"
desc="Test off"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "off", "timeout": 3, "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=1
    [7]=1
    [8]="${cmdOutTopic}"
)

myTest "${Array[*]}"

# -[ Test06 ]-------------------------------------------------------------------
testNom="Test06"
desc="Test stop"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "stop", "timeout": 3, "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=0
    [7]=0
    [8]="${cmdOutTopic}"
)

myTest "${Array[*]}"

# -[ Test07 ]-------------------------------------------------------------------
testNom="Test07"
desc="Test on with no warning (warning value as an integer)"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": 3, "warning": 0, "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=2
    [7]=4
    [8]="${cmdOutTopic}"
)

myTest "${Array[*]}"

# -[ Test08 ]-------------------------------------------------------------------
testNom="Test08"
desc="Test on on"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": 10, "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=3
    [7]=11
    [8]="${cmdOutTopic}"
)

myTestNoWait "${Array[*]}"
sleep 2
echo "${testNom}: Command: <${Array[5]}>"
pub "${cmdInTopic}" "${Array[5]}"

wait %1

echo "${testNom}: --------------------------------------------------------------------------------"
# Tests
result=$(grep "${cmdOutTopic}" ${file} | wc -l)
echo "${testNom}: Cmds: $result / ${Array[6]}"
if [ $result -ne ${Array[6]} ]; then
    echo "${testNom}: Command check failed (${result} != ${Array[6]})"
    err_push "${testNom}a" "${desc}: Command check failed (${result} != ${Array[6]})"
    #exit 1
else
    echo "${testNom}: Command check passed"
fi


result=$(grep "${ticksTopic}" ${file} | wc -l)
echo "${testNom}: Ticks: $result / ${tickCount}"
if [ $result -ne ${tickCount} ]; then
    echo "${testNom}: Ticks check failed (${result} != ${tickCount})"
    err_push "${testNom}b" "${desc}: Ticks check failed (${result} != ${tickCount})"
    #exit 1
else
    echo "${testNom}: Ticks check passed"
fi

echo "${testNom}: --------------------------------------------------------------------------------"

# -[ Test09 ]-------------------------------------------------------------------
testNom="Test09"
desc="Test on/on with floats"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": "10.5", "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=4
    [7]=13
    [8]="${cmdOutTopic}"
)

myTestNoWait "${Array[*]}"
sleep 2
echo "${testNom}: Command: <${Array[5]}>"
pub "${cmdInTopic}" "${Array[5]}"

wait %1
# and etra stop to make sure
pub "${cmdInTopic}" "stop"

echo "${testNom}: --------------------------------------------------------------------------------"
# Tests
result=$(grep "${cmdOutTopic}" ${file} | wc -l)
echo "${testNom}: Cmds: $result / ${Array[6]}"
if [ $result -ne ${Array[6]} ]; then
    echo "${testNom}: Command check failed (${result} != ${Array[6]})"
    err_push "${testNom}a" "${desc}: Command check failed (${result} != ${Array[6]})"
    #exit 1
else
    echo "${testNom}: Command check passed"
fi


result=$(grep "${ticksTopic}" ${file} | wc -l)
echo "${testNom}: Ticks: $result / ${tickCount}"
if [ $result -ne ${tickCount} ]; then
    echo "${testNom}: Ticks check failed (${result} != ${tickCount})"
    err_push "${testNom}b" "${desc}: Ticks check failed (${result} != ${tickCount})"
    #exit 1
else
    echo "${testNom}: Ticks check passed"
fi

echo "${testNom}: --------------------------------------------------------------------------------"

# -[ Test10 ]-------------------------------------------------------------------
testNom="Test10"
desc="Test on with no warning (warning value as a string)"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": 3, "warning": "0", "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=2
    [7]=4
    [8]="${cmdOutTopic}"
)

myTest "${Array[*]}"

# -[ Test11 ]-------------------------------------------------------------------
testNom="Test11"
desc="Test with timeout override (string)"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": "10", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=3
    [7]=11
    [8]="${cmdOutTopic}"
)

myTest "${Array[*]}"

# -[ Test12 ]-------------------------------------------------------------------
testNom="Test12"
desc="Test with 'junk' payload, timeout 3, warning '0'"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "junk", "timeout": 3, "warning": "0", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=2
    [7]=4
    [8]="${cmdOutTopic}"
)

myTest $Array

# -[ Test13 ]-------------------------------------------------------------------
testNom="Test13"
desc="Test on/off"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": "10.5", "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=2
    [7]=3
    [8]="${cmdOutTopic}"
)

myTestNoWait "${Array[*]}"
sleep 2
echo "${testNom}: Command: <${Array[5]}>"
pub "${cmdInTopic}" "off"

wait %1
# and etra stop to make sure
pub "${cmdInTopic}" "stop"

echo "${testNom}: --------------------------------------------------------------------------------"
# Tests
result=$(grep "${cmdOutTopic}" ${file} | wc -l)
echo "${testNom}: Cmds: $result / ${Array[6]}"
if [ $result -ne ${Array[6]} ]; then
    echo "${testNom}: Command check failed (${result} != ${Array[6]})"
    err_push "${testNom}a" "${desc}: Command check failed (${result} != ${Array[6]})"
    #exit 1
else
    echo "${testNom}: Command check passed"
fi


result=$(grep "${ticksTopic}" ${file} | wc -l)
echo "${testNom}: Tickss: $result / ${tickCount}"
if [ $result -ne ${tickCount} ]; then
    echo "${testNom}: Ticks check failed (${result} != ${tickCount})"
    err_push "${testNom}b" "${desc}: Ticks check failed (${result} != ${tickCount})"
    #exit 1
else
    echo "${testNom}: Ticks check passed"
fi

echo "${testNom}: --------------------------------------------------------------------------------"

# -[ Test14 ]-------------------------------------------------------------------
testNom="Test14"
desc="Test on/stop"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": "10.5", "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=2
    [7]=3
    [8]="${cmdOutTopic}"
)

myTestNoWait "${Array[*]}"
sleep 2
echo "${testNom}: Command: <${Array[5]}>"
pub "${cmdInTopic}" "stop"

wait %1
# and etra stop to make sure
pub "${cmdInTopic}" "stop"

echo "${testNom}: --------------------------------------------------------------------------------"
# Tests
result=$(grep "${cmdOutTopic}" ${file} | wc -l)
echo "${testNom}: Cmds: $result / ${Array[6]}"
if [ $result -ne ${Array[6]} ]; then
    echo "${testNom}: Command check failed (${result} != ${Array[6]})"
    err_push "${testNom}a" "${desc}: Command check failed (${result} != ${Array[6]})"
    #exit 1
else
    echo "${testNom}: Command check passed"
fi


result=$(grep "${ticksTopic}" ${file} | wc -l)
echo "${testNom}: Tickss: $result / ${tickCount}"
if [ $result -ne ${tickCount} ]; then
    echo "${testNom}: Ticks check failed (${result} != ${tickCount})"
    err_push "${testNom}b" "${desc}: Ticks check failed (${result} != ${tickCount})"
    #exit 1
else
    echo "${testNom}: Ticks check passed"
fi

echo "${testNom}: --------------------------------------------------------------------------------"

# -[ Test15 ]-------------------------------------------------------------------
testNom="Test15"
desc="Test on/cancel"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": "10.5", "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=1
    [7]=3
    [8]="${cmdOutTopic}"
)

myTestNoWait "${Array[*]}"
sleep 2
echo "${testNom}: Command: <${Array[5]}>"
pub "${cmdInTopic}" "cancel"

wait %1
# and etra stop to make sure
pub "${cmdInTopic}" "stop"

echo "${testNom}: --------------------------------------------------------------------------------"
# Tests
result=$(grep "${cmdOutTopic}" ${file} | wc -l)
echo "${testNom}: Cmds: $result / ${Array[6]}"
if [ $result -ne ${Array[6]} ]; then
    echo "${testNom}: Command check failed (${result} != ${Array[6]})"
    err_push "${testNom}a" "${desc}: Command check failed (${result} != ${Array[6]})"
    #exit 1
else
    echo "${testNom}: Command check passed"
fi


result=$(grep "${ticksTopic}" ${file} | wc -l)
echo "${testNom}: Tickss: $result / ${tickCount}"
if [ $result -ne ${tickCount} ]; then
    echo "${testNom}: Ticks check failed (${result} != ${tickCount})"
    err_push "${testNom}b" "${desc}: Ticks check failed (${result} != ${tickCount})"
    #exit 1
else
    echo "${testNom}: Ticks check passed"
fi

# -[ Test16 ]-------------------------------------------------------------------
###
### WARNING this test is very different than the rest, not a good model
###
# A nasty little test
# The input and the output topics are the same. So this tests if my anti-positive
# feedback loop code works
# there will be 1 cmd in + 3 normal cmmds out + 3 objects out (same topic and
# special handling)
testNom="Test16"
desc="Base test, send on, same topic In/Out"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="home/test/sameTopic"
    [5]="${msg}"
    [6]=3
    [7]=6
    [8]="home/test/diffTopic"
)

myTestNoWait "${Array[*]}"
sleep 7
echo "${testNom}: Command: <${Array[5]}>"
wait %1
pub "${cmdInTopic}" "cancel"

# -[ Test17 ]-------------------------------------------------------------------
testNom="Test17"
desc="Test ON (ignore case test)"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "ON", "timeout": 3, "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=3
    [7]=4
    [8]="${cmdOutTopic}"
)

myTest "${Array[*]}"

# -[ Test18 ]-------------------------------------------------------------------
testNom="Test18"
desc="Test Warning wih floats"
n=$[$n+1]
file="${testNom}/${results}"
msg='{"payload": "on", "timeout": 8, "warning": 5.5, "extraAttr": "Extra attributes", "TestNo":"'${testNom}'" }'
Array=( 
    [0]="${desc}"
    [1]="${testNom}"
    [2]="${wcTopic}"
    [3]="${file}"
    [4]="${cmdInTopic}"
    [5]="${msg}"
    [6]=3
    [7]=9
    [8]="${cmdOutTopic}"
)

myTest "${Array[*]}"

echo "${testNom}: --------------------------------------------------------------------------------"
# Tests
echo "${testNom}: ${desc}"
result=$(grep "${Array[8]}" ${file} | wc -l)
echo "${testNom}: Cmds: $result / ${Array[6]}"
if [ $result -ne ${Array[6]} ]; then
    echo "${testNom}: Command check failed (${result} != ${Array[6]})"
    err_push "${testNom}a" "${desc}: Command check failed (${result} != ${Array[6]})"
    #exit 1
else
    echo "${testNom}: Command check passed"
fi

# Emergence stop if this doesn't work
pub "home/test/sameTopic" "cancel"

echo -[ End of Tests ]----------------------------------------------------------

echo -e "\nAll test have completed"
# -[ Final tally ]--------------------------------------------------------------
if [ ${#err_msg[*]} -ne 0 ]; then
    echo "Errors: ${#err_msg[*]}"
    # Method using plain arrays
    for index in ${!err_msg[*]}
    do
        printf "%4d: %s\n" "$index" "${err_msg[$index]}"
    done

    echo

    ###
    ### This works but the above keeps the messages in order
    ###

    ## Method using associative arrays
    #for index in ${!err_msg2[*]}
    #do
    #    printf "   %s: %s\n" "$index" "${err_msg2[$index]}"
    #done

    exit 1
else
    echo "All tests passed (no errors)"
fi

echo

exit 0
# -[ Fini ]---------------------------------------------------------------------
