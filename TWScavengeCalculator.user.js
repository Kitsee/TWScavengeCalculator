// ==UserScript==
// @name         Kits's Scavenge Calculator
// @version      0.0.1
// @author       Kits
// @grant        none
// @include      https://*.tribalwars.*/game.php?*screen=place*mode=scavenge*
// ==/UserScript==

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sendScavRequest(missionIdx, unitCounts, totalCapacity){
    //get village number
    let url = new URL(window.location);
    const villageNum = url.searchParams.get("village");
    const hash = window.csrf_token;

    let data = `\
squad_requests%5B0%5D%5Bvillage_id%5D=${villageNum}\
&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5Bspear%5D=${unitCounts.Sp}\
&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5Bsword%5D=${unitCounts.Sw}\
&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5Baxe%5D=${unitCounts.Ax}\
&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5Barcher%5D=${unitCounts.Ar}\
&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5Blight%5D=${unitCounts.LC}\
&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5Bmarcher%5D=${unitCounts.MA}\
&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5Bheavy%5D=${unitCounts.HC}\
&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5Bknight%5D=${unitCounts.Pa}\
&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bcarry_max%5D=${totalCapacity}\
&squad_requests%5B0%5D%5Boption_id%5D=${missionIdx}\
&squad_requests%5B0%5D%5Buse_premium%5D=false\
&h=${hash}`;

    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", `https://uk54.tribalwars.co.uk/game.php?village=${villageNum}&screen=scavenge_api&ajaxaction=send_squads` , false); //false == synchronous
    xhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xhttp.send(data);

}

function fnGain(iCap, r, iMaxDuration) {
    return {
        "FF":Math.round(r[0] * iCap * 0.10),
        "BB":Math.round(r[1] * iCap * 0.25),
        "SS":Math.round(r[2] * iCap * 0.50),
        "RR":Math.round(r[3] * iCap * 0.75)
    };
}

function getDurationFactor(){
    const worldSpeed = 1.5;
	return Math.pow(worldSpeed * 1, -0.55);
}

function fnDuration(iCap, r, iMaxDuration) {
    return {
        "FF":r[0] == 0 ? 0 : ((Math.pow(Math.pow(r[0] * iCap, 2) * 100 * Math.pow(0.10, 2), 0.45) + 1800) * getDurationFactor()),
        "BB":r[1] == 0 ? 0 : ((Math.pow(Math.pow(r[1] * iCap, 2) * 100 * Math.pow(0.25, 2), 0.45) + 1800) * getDurationFactor()),
        "SS":r[2] == 0 ? 0 : ((Math.pow(Math.pow(r[2] * iCap, 2) * 100 * Math.pow(0.50, 2), 0.45) + 1800) * getDurationFactor()),
        "RR":r[3] == 0 ? 0 : ((Math.pow(Math.pow(r[3] * iCap, 2) * 100 * Math.pow(0.75, 2), 0.45) + 1800) * getDurationFactor())
    };
}

function fnPadTime(num) {
    var s = "0" + num;
    return s.substr(s.length-2);
}

function mainFunc(SendRequests){
    let unitsAvailable = Array.from(document.querySelectorAll(".units-entry-all")).map((e)=>{return parseInt(e.textContent.substring(1,e.textContent.length-1));});
    let unitsEnabled = Array.from(document.querySelectorAll(".unitEnabled")).map((e)=>{return e.checked;});
    let unitsTotal = unitsAvailable.reduce((a,b)=>a+b, 0);
    var iUnits = {
        Sp: {cap: 25,cnt: unitsAvailable[0] * unitsEnabled[0]},
        Sw: {cap: 15,cnt: unitsAvailable[1] * unitsEnabled[1]},
        Ax: {cap: 10,cnt: unitsAvailable[2] * unitsEnabled[2]},
        Ar: {cap: 10,cnt: unitsAvailable[3] * unitsEnabled[3]},
        LC: {cap: 80,cnt: unitsAvailable[4] * unitsEnabled[4]},
        MA: {cap: 50,cnt: unitsAvailable[5] * unitsEnabled[5]},
        HC: {cap: 50,cnt: unitsAvailable[6] * unitsEnabled[6]},
        Pa: {cap:100,cnt: unitsAvailable[7] * unitsEnabled[7]},
    }

    var iCap = 0;
    for(const [unitName,unit] of Object.entries(iUnits)){
        iCap += unit.cap * unit.cnt;
    };

    let r = [7.5, 3, 1.5, 1];
    let iDiv = r[0] + r[1] + r[2] + r[3];
    r[0] /= iDiv;
    r[1] /= iDiv;
    r[2] /= iDiv;
    r[3] /= iDiv;

    var iCaps = {
        FF: Math.round(iCap * r[0]),
        BB: Math.round(iCap * r[1]),
        SS: Math.round(iCap * r[2]),
        RR: Math.round(iCap * r[3])
    }
   

    var fnFill = (raid, unit, field, result) => {
        let iCount = Math.min(iUnits[unit].cnt * 1, Math.floor(iCaps[raid] / iUnits[unit].cap));
        iCaps[raid] -= iCount * iUnits[unit].cap;
        iUnits[unit].cnt -= iCount;
        field.innerText = iCount;;
        result[unit] = iCount;
        return iCount * iUnits[unit].cap;
    }

    var fnFillRaid = (raid, output, stats) => {
        var fields = Array.from(document.querySelectorAll(`.unitOutput${output}`)).map((e)=>{return e;});
        let result = [];
        let totalCap = 0;

        var iRes = fnGain(iCaps[raid], [1,1,1,1], Infinity)[raid];
        var iHour = fnDuration(iCaps[raid], [1,1,1,1], Infinity)[raid];
        var iRPH = iHour == 0 ? 0 : iRes / iHour * 60 * 60;

        stats.ResPerRun += iRes;
        stats.ResPerHour += iRPH;
        stats.RunTime = Math.max(stats.RunTime,iHour);
        totalCap += fnFill(raid, "Pa", fields[7],result);
        totalCap += fnFill(raid, "LC", fields[4],result);
        totalCap += fnFill(raid, "HC", fields[6],result);
        totalCap += fnFill(raid, "MA", fields[5],result);
        totalCap += fnFill(raid, "Sp", fields[0],result);
        totalCap += fnFill(raid, "Sw", fields[1],result);
        totalCap += fnFill(raid, "Ax", fields[2],result);
        totalCap += fnFill(raid, "Ar", fields[3],result);

        if(SendRequests){
            sendScavRequest(output+1,result,totalCap);
        }
    }

    let stats = {
        ResPerRun:0,
        ResPerHour:0,
        RunTime:0,
    };
    fnFillRaid("RR", 3, stats);
    fnFillRaid("SS", 2, stats);
    fnFillRaid("BB", 1, stats);
    fnFillRaid("FF", 0, stats);

    window.resHourOutput.text = `${stats.ResPerHour.toFixed(0)} Res/Hour`;
    window.resRunOutput.text = `${stats.ResPerRun.toFixed(0)} Res/Run`;

    var timeString = `${fnPadTime(Math.floor(stats.RunTime / 60 / 60))}:${fnPadTime(Math.floor(stats.RunTime / 60) % 60)}:${fnPadTime(Math.floor(stats.RunTime) % 60)}`;
    window.runTimeOutput.text = timeString;
}




// MAIN
(async function() {
    'use strict';
    await sleep(800);
    let sUniquePrefix = "8720e4c4-7d0d-11eb-9439-0242ac130002_";

    //Create unit checkboxes
    let tTableSquad = document.querySelector("#scavenge_screen table.candidate-squad-widget tbody");
    if (!tTableSquad){
        console.warn("failed to find squad element");
        debugger;
        return;
    }

    let rows = [];
    for(let i = 0; i < 5; i++){
        rows[i] = document.createElement("tr");
        tTableSquad.appendChild(rows[i]);
    }


    let aUnits = Array.from(document.querySelectorAll(".unit_link")).map((e)=>{return e.getAttribute("data-unit");});
    for (let sUnit of aUnits){

        //unit enable checkbox
        let eCol = document.createElement("td");
        rows[0].appendChild(eCol);

        let chkCheckbox = document.createElement("input");
        eCol.appendChild(chkCheckbox);
        chkCheckbox.setAttribute("type","checkbox");
        chkCheckbox.setAttribute("class","unitEnabled");
        chkCheckbox.id = `${sUniquePrefix}${sUnit}`;
        doMakePersistentInput(chkCheckbox);

        //output fields
        for(let i = 0; i < 4; i++){
            let col = document.createElement("td");
            rows[i+1].appendChild(col);

            let output = document.createElement("a");
            col.appendChild(output);
            output.setAttribute("class",`unitOutput${i}`);
            output.id = `${sUniquePrefix}${sUnit}_output${i}`;
            output.innerText = "0";
        }
    }


    //Generate Numbers Button
    let genButCol = document.createElement("td");
    rows[0].appendChild(genButCol);
    genButCol.colSpan = 2;

    let genButton = document.createElement("a");
    genButCol.appendChild(genButton);
    genButton.innerText = "Generate Numbers";
    genButton.addEventListener("click",()=>{
        mainFunc(false);
    });

    //Send Optimal Orders Button
    let eColSendToCalculator = document.createElement("td");
    rows[1].appendChild(eColSendToCalculator);
    eColSendToCalculator.colSpan = 2;

    let aSendToCalculator = document.createElement("a");
    eColSendToCalculator.appendChild(aSendToCalculator);
    aSendToCalculator.innerText = "Send Optimal Orders";
    aSendToCalculator.addEventListener("click",()=>{
        mainFunc(true);
    });

    //Res/hour output
    let resHourCol = document.createElement("td");
    rows[2].appendChild(resHourCol);
    resHourCol.colSpan = 2;

    let resHourOutput = document.createElement("a");
    resHourCol.appendChild(resHourOutput);
    resHourOutput.text = "0 Res/Hour";

    //Red/run output
    let resRunCol = document.createElement("td");
    rows[3].appendChild(resRunCol);
    resRunCol.colSpan = 2;

    let resRunOutput = document.createElement("a");
    resRunCol.appendChild(resRunOutput);
    resRunOutput.text = "0 Res/Run";

    //Run Time
    let runTimeCol = document.createElement("td");
    rows[4].appendChild(runTimeCol);
    runTimeCol.colSpan = 2;

    let runTimeOutput = document.createElement("a");
    runTimeCol.appendChild(runTimeOutput);
    runTimeOutput.text = "";


    window.resHourOutput = resHourOutput;
    window.resRunOutput = resRunOutput;
    window.runTimeOutput = runTimeOutput;

})();
