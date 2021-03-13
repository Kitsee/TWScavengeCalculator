// ==UserScript==
// @name         Kits's Scavenge Calculator
// @description  Provides an in-game calculator utility for scavenging within the Tribal Wars online game. Credit for some of the code and most of the maths goes to Daniel Van Den Berg (daniel.dmvandenberg.nl)
// @version      1.0.1
// @author       Kits (Github: Kitsee)
// @grant        none
// @updateURL    https://github.com/Kitsee/TWScavengeCalculator/raw/master/TWScavengeCalculator.user.js
// @downloadURL  https://github.com/Kitsee/TWScavengeCalculator/raw/master/TWScavengeCalculator.user.js
// @supportURL   https://github.com/Kitsee/TWScavengeCalculator/issues
// @include      https://*.tribalwars.*/game.php?*screen=place*mode=scavenge*
// ==/UserScript==

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

function fnGain(iCap, r, iMaxDuration) {
    return {
        0:Math.round(r[0] * iCap * 0.10),
        1:Math.round(r[1] * iCap * 0.25),
        2:Math.round(r[2] * iCap * 0.50),
        3:Math.round(r[3] * iCap * 0.75)
    };
}

function fnDuration(iCap, r, iMaxDuration) {
    const worldSpeed = 1; //TODO: i shouldnt be hard coded
    let durationFactor = Math.pow(worldSpeed * 1, -0.55);

    return {
        0:r[0] == 0 ? 0 : ((Math.pow(Math.pow(r[0] * iCap, 2) * 100 * Math.pow(0.10, 2), 0.45) + 1800) * durationFactor),
        1:r[1] == 0 ? 0 : ((Math.pow(Math.pow(r[1] * iCap, 2) * 100 * Math.pow(0.25, 2), 0.45) + 1800) * durationFactor),
        2:r[2] == 0 ? 0 : ((Math.pow(Math.pow(r[2] * iCap, 2) * 100 * Math.pow(0.50, 2), 0.45) + 1800) * durationFactor),
        3:r[3] == 0 ? 0 : ((Math.pow(Math.pow(r[3] * iCap, 2) * 100 * Math.pow(0.75, 2), 0.45) + 1800) * durationFactor)
    };
}



function calculateUnits(){
    let calculateUnitsMissions = (availableMissions) => {
        let units = [];
        let totalCapacity = 0;
        let allUnitsElements = Array.from(document.querySelectorAll(".units-entry-all")).map((e)=>{return e;});
        let unitsEnabled = Array.from(document.querySelectorAll(".calc-unit-enabled")).map((e)=>{return e.checked;});

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

        var desiredMissionCapacity = {
            0: Math.round(totalCapacity * r[0]),
            1: Math.round(totalCapacity * r[1]),
            2: Math.round(totalCapacity * r[2]),
            3: Math.round(totalCapacity * r[3])
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

        var fillMission = (missionIdx) => {
            let result = [];
            let totalCap = 0;

            var iRes = fnGain(desiredMissionCapacity[missionIdx], [1,1,1,1], Infinity)[missionIdx];
            var iHour = fnDuration(desiredMissionCapacity[missionIdx], [1,1,1,1], Infinity)[missionIdx];
            var iRPH = iHour == 0 ? 0 : iRes / iHour * 60 * 60;

            stats.ResPerRun += iRes;
            stats.ResPerHour += iRPH;
            stats.RunTime = Math.max(stats.RunTime,iHour);

            for(let unit of units)
            {
                totalCap += fill(missionIdx, unit);
            }
        }

        fillMission(3);
        fillMission(2);
        fillMission(1);
        fillMission(0);

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
    let missionMask = (missionsEnabled[3] << 3) + (missionsEnabled[2] << 2) + (missionsEnabled[1] << 1) + missionsEnabled[0];
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
            thisUnit.name = outputElement.unitName;
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
}



function constructTable(){
    let table = document.querySelector("#scavenge_screen table.candidate-squad-widget");

    //add padding to existing table
    let paddingCol = document.createElement("td");
    paddingCol.colSpan = 2;
    table.firstChild.childNodes[0].insertBefore(paddingCol,table.firstChild.childNodes[0].firstChild);
    table.firstChild.childNodes[1].insertBefore(paddingCol.cloneNode(true),table.firstChild.childNodes[1].firstChild);

    //Construct table
    let tableBody = document.createElement("tbody");
    table.appendChild(tableBody);

    //Request result
    let requestResult = document.createElement("pre");
    requestResult.innerText = " ";
    requestResult.className = "calc-request-results";
    table.parentElement.appendChild(requestResult);

    //table header
    let headerRow = table.firstChild.firstChild.cloneNode(true)
    headerRow.removeChild(headerRow.lastChild);
    headerRow.lastChild.colSpan = 3;
    headerRow.lastChild.innerText = " ";
    for(let colHeader of headerRow.childNodes){
        if(colHeader.firstChild != null){
            colHeader.firstChild.className = ""; //remove the "unit_link" class from the new header
        }
    }
    tableBody.appendChild(headerRow);

    //rows
    let tableRows = [];
    for(let i = 0; i < 5; i++){
        let row = document.createElement("tr");
        tableBody.appendChild(row);
        tableRows[i] = row;
    }

    //Misson Name & Enabled column
    let missonNames = [null,"LL","HH","CC","GG"];
    for(let i = 0; i < 5; i++){
        let col = document.createElement("td");
        tableRows[i].appendChild(col);

        if(missonNames[i] != null){
            let rowHeader = document.createElement("th");
            rowHeader.innerText = missonNames[i];
            col.appendChild(rowHeader);

            let col2 = document.createElement("td");
            tableRows[i].appendChild(col2);

            let chkCheckbox = document.createElement("input");
            chkCheckbox.type = "checkbox";
            chkCheckbox.className = "calc-mission-enabled";
            chkCheckbox.id = `calc_mission_enabled_${i-1}`;
            doMakePersistentInput(chkCheckbox);
            col2.appendChild(chkCheckbox);
        }
        else{
            col.colSpan = 2;
        }
    }


    //unit columns
    let unitNames = Array.from(document.querySelectorAll(".unit_link")).map((e)=>{return e.getAttribute("data-unit");});
    console.log("Unit Names",unitNames);
    for (let unitName of unitNames){

        //unit enable checkbox
        let eCol = document.createElement("td");
        tableRows[0].appendChild(eCol);

        let chkCheckbox = document.createElement("input");
        eCol.appendChild(chkCheckbox);
        chkCheckbox.type = "checkbox";
        chkCheckbox.className = "calc-unit-enabled";
        chkCheckbox.unitName = unitName;
        chkCheckbox.id = `calc_unit_enabled_${unitName}`;
        doMakePersistentInput(chkCheckbox);

        //output fields
        for(let i = 0; i < 4; i++){
            let col = document.createElement("td");
            tableRows[i+1].appendChild(col);

            let output = document.createElement("a");
            col.appendChild(output);
            output.className = `calc-output-mission-${i}`;
            output.id = `calc_output_${unitName}_${i}`;
            output.unitName = unitName;
            output.innerText = "0";
        }
    }

    //Command Buttons
    //Generate Numbers Button
    let genButCol = document.createElement("td");
    tableRows[3].appendChild(genButCol);
    genButCol.colSpan = 2;

    let genButton = document.createElement("a");
    genButCol.appendChild(genButton);
    genButton.innerText = "Generate";
    genButton.addEventListener("click",()=>{
        calculateUnits();
    });

    //Gen & Send Button
    let genSendButCol = document.createElement("td");
    tableRows[4].appendChild(genSendButCol);
    genSendButCol.colSpan = 2;

    let genSendBut = document.createElement("a");
    genSendButCol.appendChild(genSendBut);
    genSendBut.innerText = "Generate & Send";
    genSendBut.addEventListener("click",()=>{
        calculateUnits();
        sendScavRequests();
    });

    //Totals Outputs
    let totalsSettings = [
        {text:"Res/Hour:", class:"calc-output-res-hour"},
        {text:"Res/Run:", class:"calc-output-res-run"},
        {text:"Run Time:", class:"calc-output-run-time"},
        ];
    let rowIdx = 0;
    for(let thisSettings of totalsSettings){
        let titleCol = document.createElement("td");
        titleCol.innerText = thisSettings.text;
        tableRows[rowIdx].appendChild(titleCol);

        let valueCol = document.createElement("td");
        valueCol.className = thisSettings.class;
        tableRows[rowIdx].appendChild(valueCol);

        rowIdx++;
    }
}


// MAIN
(async function() {
    'use strict';
    await new Promise(resolve => setTimeout(resolve, 800)); //allow the page to load.

    constructTable();
})();
