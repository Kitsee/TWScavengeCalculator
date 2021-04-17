// ==UserScript==
// @name         Kits's Scavenge Calculator
// @description  Provides an in-game calculator utility for scavenging within the Tribal Wars online game. Credit for some of the code and most of the maths goes to Daniel Van Den Berg (daniel.dmvandenberg.nl)
// @version      1.2.0
// @author       Kits (Github: Kitsee)
// @grant        none
// @updateURL    https://github.com/Kitsee/TWScavengeCalculator/raw/master/TWScavengeCalculator.user.js
// @downloadURL  https://github.com/Kitsee/TWScavengeCalculator/raw/master/TWScavengeCalculator.user.js
// @supportURL   https://github.com/Kitsee/TWScavengeCalculator/issues
// @include      https://*.tribalwars.*/game.php?*screen=place*mode=scavenge*
// ==/UserScript==

'use strict';

let unitCapacities = {
    spear: 25,
    sword: 15,
    axe: 10,
    archer: 10,
    light: 80,
    marcher: 50,
    heavy: 50,
    knight: 100
}

function main()
{
    if (window.location.href.indexOf('screen=place&mode=scavenge') < 0) {
        window.location.assign(game_data.link_base_pure + "place&mode=scavenge");
    }
    else
    {
        var xhttp = new XMLHttpRequest();
        xhttp.open("GET", `https://${game_data.world}.tribalwars.co.uk/interface.php?func=get_config`);
        xhttp.onreadystatechange = function() {
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                let xmlDoc = (new DOMParser()).parseFromString(xhttp.responseText,"text/xml");

                window.TribalWars.worldSpeed = xmlDoc.querySelector("config speed").innerHTML * 1;
                console.log("World Speed:", window.TribalWars.worldSpeed);

                constructInterface();
                //constructTable();
            }
        }
        xhttp.send();
    }
}

function constructInterface(){
    let mainTable = document.querySelector("#contentContainer");
    let contentRoot = null;
    if(mainTable){
        //Desktop Mode
        let mainTableBody = mainTable.childNodes[1];
        mainTable.style["border-spacing"] = "10px";
        mainTable.style["border-collapse"] = "separate";

        let tr = document.createElement("tr");
        tr.id = "scavenge_calculator";
        mainTableBody.insertBefore(tr, mainTableBody.childNodes[0]);

        let td = document.createElement("td");
        td.id = "content_value";
        td.className = "content-border calc-root";
        tr.appendChild(td);
        contentRoot = td;
    }
    else{
        //Mobile Mode
        let mobileRoot = document.querySelector("#mobileContent");
        let stdContent = document.querySelector("#content_value");

        contentRoot = document.createElement("div");
        mobileRoot.insertBefore(contentRoot,stdContent);

    }

    const html = `\
<h3>Scavenging Calculator</h3>\
<div class="candidate-squad-container">\
    <table class="candidate-squad-widget vis" style="width: 490px">\
        <tbody id="calcTableBody">\
            <tr>\
                 <th style="width:80px"></th>\
                 <th>Enable</th>\
                 <th>Available</th>\
                 <th>LL</th>\
                 <th>HH</th>\
                 <th>CC</th>\
                 <th>GG</th>\
            </tr>\
            <tr>\
                 <th>Mission Enable</th>\
                 <td></td>\
                 <td></td>\
                 <td>\
                     <input type="checkbox" id="calc_mission_enabled_0" class="calc-mission-enabled input-persist">
                 </td>\
                 <td>\
                     <input type="checkbox" id="calc_mission_enabled_1" class="calc-mission-enabled input-persist">
                 </td>\
                 <td>\
                     <input type="checkbox" id="calc_mission_enabled_2" class="calc-mission-enabled input-persist">
                 </td>\
                 <td>\
                     <input type="checkbox" id="calc_mission_enabled_3" class="calc-mission-enabled input-persist">
                 </td>\
            </tr>\
        </tbody>\
    </table>
</div>\
`;
    contentRoot.insertAdjacentHTML( 'beforeend', html );

    const tableBody = document.querySelector("#calcTableBody");
    const unitNames = Array.from(document.querySelectorAll(".unit_link")).map((e)=>{return e.getAttribute("data-unit");});
    const unitCounts = Array.from(document.querySelectorAll(".units-entry-all")).reduce((a,e) => ({...a, [e.getAttribute("data-unit")]:parseInt(e.textContent.substring(1,e.textContent.length-1))}), {});
    console.log("Unit Names", unitNames);
    console.log("Unit Counts", unitCounts);

    for (let unitName of unitNames){
        const html = `\
<tr>\
    <th>
        <a href="#" class="" data-unit="${unitName}">
            <img src="https://dsuk.innogamescdn.com/asset/27dd28b8/graphic/unit/unit_${unitName}.png" style="text-align:center;">
            <a>  ${unitName}</a>
        </a>
    </th>
    <td>\
        <input type="checkbox" id="calc_unit_enabled_${unitName}" class="calc-unit-enabled input-persist">
    </td>\
    <td>\
        <a id="calc_unit_available_${unitName}" class="calc-unit-available">${unitCounts[unitName]}
    </td>\
    <td>\
        <a id="calc_output_${unitName}_0" class="calc-output-mission-0" unitname="${unitName}">0
    </td>\
    <td>\
        <a id="calc_output_${unitName}_1" class="calc-output-mission-1" unitname="${unitName}">0
    </td>\
    <td>\
        <a id="calc_output_${unitName}_2" class="calc-output-mission-2" unitname="${unitName}">0
    </td>\
    <td>\
        <a id="calc_output_${unitName}_3" class="calc-output-mission-3" unitname="${unitName}">0
    </td>\
</tr>\
`
        tableBody.insertAdjacentHTML( 'beforeend', html );
    }

    const html2 = `\
<tr>\
    <th>
        <a>Res/Hour</a>
    </th>
    <td colspan="2">\
        <a class="calc-output-res-hour">0</a>
    </td>\
</tr>\
<tr>\
    <th>
        <a>Res/Run</a>
    </th>
    <td colspan="2">\
        <a class="calc-output-res-run">0</a>
    </td>\
</tr>\
<tr>\
    <th>
        <a>Run Time</a>
    </th>
    <td colspan="2" >\
        <a class="calc-output-run-time">0</a>
    </td>\
</tr>\
<tr>\
    <th>
        <a>Time Limit</a>
    </th>
    <td colspan="2" >\
        <select id="cal_time_limit">\
            <option value="15">15 Mins</option>\
            <option value="30">30 Mins</option>\
            <option value="45">45 Mins</option>\
            <option value="60">1 Hour</option>\
            <option value="90">1.5 Hours</option>\
            <option value="120">2 Hours</option>\
            <option value="180">3 Hours</option>\
            <option value="240">4 Hours</option>\
            <option value="300">5 Hours</option>\
            <option value="360">6 Hours</option>\
            <option value="420">7 Hours</option>\
            <option value="480">8 Hours</option>\
            <option value="540">9 Hours</option>\
            <option value="600">10 Hours</option>\
            <option value="720">12 Hours</option>\
            <option value="840">14 Hours</option>\
            <option value="960">16 Hours</option>\
            <option value="1080">18 Hours</option>\
            <option value="1200">20 Hours</option>\
            <option value="-1" selected="1">Unlimited</option>\
        </select>\
    </td>\
</tr>\
`
    tableBody.insertAdjacentHTML( 'beforeend', html2 );

    const html3 = `\
<a href="#" id="calc_button_calculate" class="btn">Calculate</a>\
<a href="#" id="calc_button_calculateSend" class="btn">Calculate & Send</a>\
<pre class="calc-request-results"> </pre>
`
    contentRoot.insertAdjacentHTML( 'beforeend', html3 );

    document.querySelector("#calc_button_calculate").addEventListener("click",()=>{
        calculateUnits();
    });

    document.querySelector("#calc_button_calculateSend").addEventListener("click",()=>{
        calculateUnits();
        sendScavRequests();
    });

    const inputs = Array.from(document.querySelectorAll(".input-persist"));
    for(let input of inputs){
         doMakePersistentInput(input);
    }
}

function calculateUnits(){
    let unitsEnabled = Array.from(document.querySelectorAll(".calc-unit-enabled")).map((e)=>{return e.checked;});
    let allUnitsElements = Array.from(document.querySelectorAll(".units-entry-all")).map((e)=>{return e;});
    let time_limit = parseInt(document.querySelector(`#cal_time_limit`).value);
    console.log("time limit:", time_limit);
    if(time_limit == -1){
        time_limit = Infinity;
    }
    else{
        time_limit = time_limit * 60;
    }
    let durationFactor = Math.pow(window.TribalWars.worldSpeed, -0.55);

    let calculateUnitsMissions = (availableMissions) => {
        let units = [];
        let totalCapacity = 0;

        let unitIdx = 0;
        for (let allUnitElement of allUnitsElements){
            let thisUnit = {};
            if(unitsEnabled[unitIdx]){
                thisUnit.enabled = true;
                thisUnit.count = parseInt(allUnitElement.textContent.substring(1,allUnitElement.textContent.length-1));
            }else{
                thisUnit.enabled = false;
                thisUnit.count = 0;
            }
            thisUnit.name = allUnitElement.getAttribute("data-unit");
            thisUnit.unitCapacity = unitCapacities[thisUnit.name];

            totalCapacity += thisUnit.count * thisUnit.unitCapacity;
            units.push(thisUnit);
            unitIdx++;
        }
        units.sort((a,b) => b.unitCapacity - a.unitCapacity);

        let r = [7.5, 3, 1.5, 1];

        //mission disable
        for(let i = 0; i < 4; i++){
            if(!availableMissions[i]){
                r[i] = 0;
            }
        }

        let iDiv = r[0] + r[1] + r[2] + r[3];
        r[0] /= iDiv;
        r[1] /= iDiv;
        r[2] /= iDiv;
        r[3] /= iDiv;

        var maxMissionCapacity = {0:Infinity,1:Infinity,2:Infinity,3:Infinity};;
        if(time_limit != Infinity){
            maxMissionCapacity = {
                0:r[0] == 0 ? 0 : Math.pow(Math.pow((time_limit / durationFactor) - 1800,1/0.45)/Math.pow(0.10, 2)/100,1/2),
                1:r[1] == 0 ? 0 : Math.pow(Math.pow((time_limit / durationFactor) - 1800,1/0.45)/Math.pow(0.25, 2)/100,1/2),
                2:r[2] == 0 ? 0 : Math.pow(Math.pow((time_limit / durationFactor) - 1800,1/0.45)/Math.pow(0.50, 2)/100,1/2),
                3:r[3] == 0 ? 0 : Math.pow(Math.pow((time_limit / durationFactor) - 1800,1/0.45)/Math.pow(0.75, 2)/100,1/2)
            };
        }

        var desiredMissionCapacity = {
            0: Math.round( Math.min(totalCapacity * r[0], maxMissionCapacity[0] )),
            1: Math.round( Math.min(totalCapacity * r[1], maxMissionCapacity[1] )),
            2: Math.round( Math.min(totalCapacity * r[2], maxMissionCapacity[2] )),
            3: Math.round( Math.min(totalCapacity * r[3], maxMissionCapacity[3] ))
        }

        var stats = {
            ResPerRun:0,
            ResPerHour:0,
            RunTime:0,
        };

        var fill = (missionIdx, unit) => {
            let allocatedUnitCount = Math.min(unit.count, Math.floor(desiredMissionCapacity[missionIdx] / unit.unitCapacity));
            desiredMissionCapacity[missionIdx] -= allocatedUnitCount * unit.unitCapacity;
            unit.count -= allocatedUnitCount;
            let outputElement = document.querySelector(`#calc_output_${unit.name}_${missionIdx}`);
            outputElement.innerText = allocatedUnitCount;
            return allocatedUnitCount * unit.unitCapacity;
        }

        var fillMission = (missionIdx, missionCapReturn) => {
            let result = [];
            let totalCap = 0;

            var resources = Math.round(desiredMissionCapacity[missionIdx] * missionCapReturn);
            var runTime = (Math.pow(Math.pow(desiredMissionCapacity[missionIdx], 2) * 100 * Math.pow(missionCapReturn, 2), 0.45) + 1800) * durationFactor;
            var RPH = runTime == 0 ? 0 : resources / runTime * 60 * 60;

            stats.ResPerRun += resources;
            stats.ResPerHour += RPH;
            stats.RunTime = Math.max(stats.RunTime,runTime);

            for(let unit of units)
            {
                totalCap += fill(missionIdx, unit);
            }
        }

        fillMission(3, 0.75);
        fillMission(2, 0.50);
        fillMission(1, 0.25);
        fillMission(0, 0.10);

        let fnPadTime = (num) => {
            var s = "0" + num;
            return s.substr(s.length-2);
        }

        let resHourElement = document.querySelector(".calc-output-res-hour");
        let resRunElement = document.querySelector(".calc-output-res-run");
        let runTimeElement = document.querySelector(".calc-output-run-time");
        resHourElement.innerText = `${stats.ResPerHour.toFixed(0)} (${(stats.ResPerHour/3).toFixed(0)})`;
        resRunElement.innerText = `${stats.ResPerRun.toFixed(0)} (${(stats.ResPerRun/3).toFixed(0)})`;
        runTimeElement.innerText = `${fnPadTime(Math.floor(stats.RunTime / 60 / 60))}:${fnPadTime(Math.floor(stats.RunTime / 60) % 60)}:${fnPadTime(Math.floor(stats.RunTime) % 60)}`;

        return stats.ResPerHour;
    }


    let missionsEnabled = Array.from(document.querySelectorAll(".calc-mission-enabled")).map((e)=>{return e.checked;});
    let missionsAvailable = Array.from(document.querySelectorAll(".status-specific")).map((e)=>{return e.children[0].className == "inactive-view";});
    console.log("Missions Available:", missionsAvailable);

    let missionMask = (missionsEnabled[3] << 3) + (missionsEnabled[2] << 2) + (missionsEnabled[1] << 1) + missionsEnabled[0];
    let availableMask = (missionsAvailable[3] << 3) + (missionsAvailable[2] << 2) + (missionsAvailable[1] << 1) + missionsAvailable[0];
    missionMask &= availableMask;
    let bestPerm = 0;
    let bestPermRate = 0;
    let donePerms = [];
    for(let perm = 1; perm < 16; perm++)
    {
        let finalPerm = perm & missionMask;

        if(!donePerms.includes(finalPerm) && finalPerm > 0){
            donePerms.push(finalPerm);
            let missionConfig = [
                (finalPerm >> 0) & 1 == 1,
                (finalPerm >> 1) & 1 == 1,
                (finalPerm >> 2) & 1 == 1,
                (finalPerm >> 3) & 1 == 1,
            ];
            let resourceRate = calculateUnitsMissions(missionConfig);
            console.log(perm, finalPerm,missionConfig, resourceRate);
            if(resourceRate > bestPermRate){
                bestPermRate = resourceRate;
                bestPerm = finalPerm;
            }
        }
    }

    let missionConfig = [
        (bestPerm >> 0) & 1 == 1,
        (bestPerm >> 1) & 1 == 1,
        (bestPerm >> 2) & 1 == 1,
        (bestPerm >> 3) & 1 == 1,
    ];
    calculateUnitsMissions(missionConfig);
    console.log("Best:", missionConfig);
}
   



function sendScavRequests(){
    const gameData = window.TribalWars.getGameData();
    const hash = gameData.csrf;
    const world = gameData.world;
    const villageId = gameData.village.id;
    
    const resultsElement = document.querySelector(".calc-request-results");
    const resultNames = ["LL","HH","CC","GG"];

    let resultStrings = [];

    let updateResults = () => {
        resultsElement.innerText = "Request Results:\n";
        let idx = 0;
        for(const string of resultStrings){
            resultsElement.innerText += `${resultNames[idx]}: ${string}\n`;
            idx++;
        }
		resultsElement.innerText += "please refresh the page";
    }

    let handleResponse = (missionIdx, response) => {
        if(response.squad_responses[0].success){
             resultStrings[missionIdx]="Successful";
        }
        else{
            resultStrings[missionIdx]="Failed, Error: " + response.squad_responses[0].error;
        }
        updateResults();
    };

    let sendMissionRequest = (missionIdx) => {
        let unitCounts = [];
        let totalCapacity = 0;
        let outputElements = Array.from(document.querySelectorAll(`.calc-output-mission-${missionIdx}`)).map((e)=>{return e;});

        for(let outputElement of outputElements){
            let thisUnit = {};
            thisUnit.name = outputElement.getAttribute("unitname");
            thisUnit.count = parseInt(outputElement.innerText);
            totalCapacity += thisUnit.count * unitCapacities[thisUnit.name];
            unitCounts.push(thisUnit);

        }
        if(totalCapacity){
            let data = `squad_requests%5B0%5D%5Bvillage_id%5D=${villageId}`;

            for(let unit of unitCounts){
                data += `&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5B${unit.name}%5D=${unit.count}`;
            }

            data += `&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bcarry_max%5D=${totalCapacity}&squad_requests%5B0%5D%5Boption_id%5D=${missionIdx+1}&squad_requests%5B0%5D%5Buse_premium%5D=false&h=${hash}`;

            var xhttp = new XMLHttpRequest();
            xhttp.open("POST", `https://${world}.tribalwars.co.uk/game.php?village=${villageId}&screen=scavenge_api&ajaxaction=send_squads`);
            xhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");

            xhttp.onreadystatechange = function() {
                if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    handleResponse(missionIdx, JSON.parse(xhttp.responseText));
                }
            }
            xhttp.send(data);
            resultStrings[missionIdx]="Sent";
        }
        else
        {
            resultStrings[missionIdx]="Not Sent";
        }
    }


    for(let i =0; i< 4; i++){
        sendMissionRequest(i);
    }
    updateResults();
}





function doMakePersistentInput(eInput) {
    if (!eInput.id){
        console.warn(`doMakePersistentInput called on element without id.`, eInput);
        debugger;
        return;
    }
    let sStoredState = window.localStorage[`persistent_input_${eInput.id}`];
    eInput.setValue = (sInput)=>{ window.localStorage[`persistent_input_${eInput.id}`] = sInput;};
    eInput.doRestore = ()=>{eInput.value = sStoredState;};
    eInput.getValue = ()=>{return eInput.value;};
    switch (eInput.type){
        case "checkbox":
            eInput.doRestore = ()=>{eInput.checked = sStoredState == "true" ? true : false;};
            eInput.getValue = ()=>{return eInput.checked;};
            break;
    }
    eInput.addEventListener("change",(e)=>{
        eInput.setValue(e.target.getValue());
    });
    eInput.doRestore();
}


main();

