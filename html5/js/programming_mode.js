/*
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/*
This file contains the main JavaScript code for the KubeInvaders game.
It handles the initialization of the game, interaction with the Kubernetes cluster,
and various game functionalities such as chaos engineering actions, metrics retrieval,
and user interactions.
*/

function replaceDivWithContent(divId, content) {
    document.getElementById(divId).innerHTML = content;
}

function getChaosProgTextAreaValue() {
  return editor.getValue();
}

/* Programming Mode Functions */
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

/* TODO: this is very bad... change asap :D */
loadPresetsCodeJson = `{
  "SSH": "aW1wb3J0IHBhcmFtaWtvCgojIERlZmluZSBzZXJ2ZXJzIGFycmF5CnNlcnZlcnMgPSBbJ3NlcnZlcjEnLCAnc2VydmVyMicsICdzZXJ2ZXIzJ10KCmZvciBzZXJ2ZXIgaW4gc2VydmVyczoKICAgIHB1YmxpY19rZXkgPSBwYXJhbWlrby5SU0FLZXkoZGF0YT1iJ3lvdXItcHVibGljLWtleS1zdHJpbmcnKQogICAgc3NoID0gcGFyYW1pa28uU1NIQ2xpZW50KCkKICAgIHNzaC5zZXRfbWlzc2luZ19ob3N0X2tleV9wb2xpY3kocGFyYW1pa28uQXV0b0FkZFBvbGljeSgpKQogICAgc3NoLmNvbm5lY3QoaG9zdG5hbWU9J3lvdXItc2VydmVyLW5hbWUnLCB1c2VybmFtZT0neW91ci11c2VybmFtZScsIHBrZXk9cHVibGljX2tleSkKICAgIHN0ZGluLCBzdGRvdXQsIHN0ZGVyciA9IHNzaC5leGVjX2NvbW1hbmQoJ3lvdXItY29tbWFuZCcpCiAgICBwcmludChzdGRvdXQucmVhZCgpKQogICAgc3NoLmNsb3NlKCkK"
}`;

function loadPreset(tool, lang) {
    let decodedStringAtoB = "";
    console.log("[GET-PRESETS] Loaded preset for " + tool + " with lang " + lang);

    globalState.set('latest_preset_name', tool);
    globalState.set('latest_preset_lang', lang);
    console.log("[GET-PRESETS] |" + lang + "|");

    if (lang == "k-inv") {
        loadSavedPreset(tool, lang, $('#chaosProgramTextArea').text());
        if (tool.toLowerCase() == "default") {
            document.getElementById("resetToDefaultButton").style.display = "none";
            document.getElementById("deleteChaosProgramButton").style.display = "none";
        } else {
            document.getElementById("resetToDefaultButton").style.display = "none";
            document.getElementById("deleteChaosProgramButton").style.display = "block";
        }
    } else {
        console.log("[GET-PRESETS] foo Loaded preset for " + tool + " with lang " + lang);
        console.log("[GET-PRESET] loadPresetsCodeJson " + loadPresetsCodeJson);
        loadPresetsCodeParsed = JSON.parse(loadPresetsCodeJson);
        decodedStringAtoB = atob(loadPresetsCodeParsed[tool]);
        loadSavedPreset(tool, lang, decodedStringAtoB);
        document.getElementById("resetToDefaultButton").style.display = "block";
        document.getElementById("deleteChaosProgramButton").style.display = "none";
    }
    $("#presetLang").val(lang);
    $("#presetName").val(tool);
    $('#setLoadTestModal').modal('show');
    globalState.set('modal_opened', true);
    globalState.set('log_tail_switch', false);
    globalState.set('log_tail_div.style.display', "none");
    globalState.set('log_tail_screen.style.display', "none");
    $("#logConsoleButton").text("Start Logs Tail");
    if (globalState.get('programming_mode_switch') == false) {
        startProgrammingMode();
    }
}

function runChaosProgram() {
  
  chaosProgram = getChaosProgTextAreaValue();
  const regex = /^chaos-codename:\s+(.*)$/m;
  const match = chaosProgram.match(regex);

  if (match) {
    codename = match[1];
    console.log(codename);
  } else {
    console.log("Valore chaos-codename non trovato");
  }

  var oReq = new XMLHttpRequest();
  oReq.open("POST", globalState.get('k8s_url') + "/kube/chaos/programming_mode?id=" + globalState.get('random_code'), true);
  oReq.onreadystatechange = function () {
      if (this.readyState === XMLHttpRequest.DONE && this.status == 200) {
        now = new Date().toLocaleString().replace(',','')
        if (this.responseText.includes("Invalid")) {
            replaceDivWithContent('alert_placeholder_programming_mode', globalState.get('alert_div') + this.responseText + ' </div>');
            globalState.set('chaos_program_valid', false);
        }
        else {
            replaceDivWithContent('alert_placeholder_programming_mode', globalState.get('alert_div') + '[PROGRAMMING_MODE] Chaos program ' + codename + ' loaded at ' + now + ' </div>');  
            globalState.set('chaos_program_valid', true);
        }  
    } 
    else if (this.readyState === XMLHttpRequest.DONE && this.status != 200) {
        replaceDivWithContent('alert_placeholder_programming_mode', globalState.get('alert_div') + "[PROGRAMMING_MODE] Invalid chaos program code, please check yaml syntax or kubeinvaders logs</div>");
    }
  };
  oReq.setRequestHeader("Content-Type", "application/json");
  console.log("Sending this program: " + getChaosProgTextAreaValue());
  oReq.send(getChaosProgTextAreaValue());
}

function savePreset(action) {
  console.log("[SAVE-PRESET-CHAOSPROGRAM] Saving item...");
  let presetName = "";
  let presetLang = "";
  let presetBody = "";

  presetBody = $("#currentLoadTest").val();
  console.log("[SAVE-PRESET-CHAOSPROGRAM] Saving " + presetBody);

  if (action == "save-chaos-program") {
      presetLang = "k-inv";
      presetName = codename + "-" + rand_id();
      globalState.set('latest_preset_lang', "k-inv");
      console.log("[SAVE-PRESET-CHAOSPROGRAM] lang: " + presetLang + " name:" + presetName);
      presetBody =  $('#chaosProgramTextArea').text();
      document.getElementById("resetToDefaultButton").style.display = "none";
      document.getElementById("deleteChaosProgramButton").style.display = "block";
  }
  else if (latest_preset_lang == "k-inv") {
      presetLang = "k-inv";
      presetName = codename;
      globalState.set('latest_preset_lang', "k-inv");
      console.log("[SAVE-PRESET-CHAOSPROGRAM] lang: " + presetLang + " name:" + codename);
      presetBody = $('#currentLoadTest').val();
      document.getElementById("resetToDefaultButton").style.display = "none";
      document.getElementById("deleteChaosProgramButton").style.display = "block";
  }
  else {
      presetLang = globalState.get('latest_preset_lang');
      presetName = globalState.get('latest_preset_name');    
      document.getElementById("resetToDefaultButton").style.display = "block";
      document.getElementById("deleteChaosProgramButton").style.display = "none";
  }

  //console.log("Saving preset. name:" + presetName + ", lang:" + presetName + ", body: " + presetBody);
  var oReq = new XMLHttpRequest();

  oReq.open("POST", globalState.get('k8s_url') + "/chaos/loadpreset/save?name=" + presetName + "&lang=" + presetLang, true);

  oReq.onreadystatechange = function () {
      if (this.readyState === XMLHttpRequest.DONE && this.status === 200 && (action == "apply" || action == "save-chaos-program")) {
          if (globalState.get('latest_preset_lang') == "k-inv") {
              if ($('#currentLoadTest').val() != "") {
                  presetBody = $('#currentLoadTest').val();
              }               
              //document.getElementById("chaosProgramTextArea").text = presetBody;
          } 
          else {
              presetBody = $('#chaosProgramTextArea').text(`chaos-codename: ${codename}
jobs:
${presetName}-job:
  additional-labels:
      chaos-controller: kubeinvaders
      chaos-lang: ${presetLang}
      chaos-type: loadtest
      chaos-codename: ${codename}
  image: docker.io/luckysideburn/chaos-exec:v1.0.4
  command: bash
  args:
  - start.sh
  - ${presetLang}
  - code=${btoa(presetBody).trim()}

experiments:
- name: ${presetName}-exp
job: ${presetName}-job
loop: 5`);
          }
      }
  };;

  oReq.setRequestHeader("Content-Type", "application/json");
  oReq.send(presetBody);
  closeSetLoadTestModal();
  
  if (action != "save-chaos-program") {
      let presetNameCapitalized = presetName.charAt(0).toUpperCase() + presetName.slice(1);
      var buttonId = "load" + presetNameCapitalized.trim();
      // document.getElementById(buttonId).classList.remove('btn-light');
      // document.getElementById(buttonId).classList.add('btn-light-saved');
  }
  else {
      console.log("[SAVE-PRESET-CHAOSPROGRAM] Creating new button for lang: " + presetLang + " name:" + presetName);
      createChaosProgramButton(presetName, 'k-inv'); 
  }

  getSavedPresets();

  if (action == "apply" && globalState.get('programming_mode_switch') == false){
      startProgrammingMode();
  }
}

function drawChaosProgramFlow() {
    chaosProgram = getChaosProgTextAreaValue();

    var oReq = new XMLHttpRequest();
    oReq.open("POST", k8s_url + "/chaos/programs/json-flow", true);

    oReq.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    if (IsJsonString(this.responseText)){

                            if (this.responseText.includes("Invalid")) {
                                $('#alert_placeholder_programming_mode').replaceWith(alert_div + this.responseText + ' </div>');
                                globalState.set('chaos_program_valid', false);
                                return;
                            } 
                            
                            var flow = JSON.parse(this.responseText);
                            var flow_html = "";
                            let i = 0;
                            var times = "";
                            $('#chaosProgramFlow').html("");

                            while (i < flow["experiments"].length) {
                                    if (flow["experiments"][i]["loop"] == 1){
                                            times = "once";
                                    }
                                    else if (flow["experiments"][i]["loop"] == 2) {
                                            times = "twice"
                                    }
                                    else {
                                            times = flow["experiments"][i]["loop"] + " times"
                                    }
                                    if (globalState.get('current_color_mode') == "light") {
                                            flow_html = flow_html + '<div class="row"><div class="alert alert-light alert-kinv" id="' +  random_code + Math.floor(Math.random() * 9999) +'" role="alert" style="border-color: #000000; border-width: 1.5px;">Do ' + flow["experiments"][i]["name"] + ' ' + times + '</div></div>';
                                    }
                                    else {
                                            flow_html = flow_html + '<div class="row"><div class="alert alert-light alert-kinv" id="' +  random_code + Math.floor(Math.random() * 9999) +'" role="alert" style="border-color: #ffffff; color: #1ed931; background-color: #0a0a0a; border-width: 1.5px;">Do ' + flow["experiments"][i]["name"] + ' ' + times + '</div></div>';
                                    }
                                    search_job = globalState.get('codename') + ":" + flow["experiments"][i]["name"]

                                    flow_html = flow_html + '<img src="images/down-arrow.png" width="30" height="30" style="margin-bottom: 2%;">';

                                    for (let [key, value] of globalState.get('chaos_jobs_status')) {
                                            if (key.search(search_job) != -1 ) {
                                                    if (globalState.get('current_color_mode') == "light") {
                                                            flow_html = flow_html + '<div class="row"><div class="alert alert-light alert-kinv" id="' +  random_code + Math.floor(Math.random() * 9999) +'" role="alert" style="border-color: #000000; border-width: 1.5px;">[' + key.split(":")[2] + '] Status: ' + value + '</div></div>';
                                                    } else {
                                                            flow_html = flow_html + '<div class="row"><div class="alert alert-light alert-kinv" id="' +  random_code + Math.floor(Math.random() * 9999) +'" role="alert" style="border-color: #ffffff; color: #1ed931; background-color: #0a0a0a; border-width: 1.5px;">[' + key.split(":")[2] + '] Status: ' + value + '</div></div>';
                                                    }
                                            }
                                    }
                                    i++;
                            }
                            $('#chaosProgramFlow').html(flow_html);
                    }
                    else {
                            $('#chaosProgramFlow').html(this.responseText);  
                    }
            }
    };

    oReq.setRequestHeader("Content-Type", "application/json");
    oReq.send(chaosProgram);
}

function getSavedPresets() {
    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    if ((this.responseText.trim() != "nil") && (this.responseText.trim() != "")) {
                            var savedPresets = this.responseText.split(",");
                            for (i = 0; i < savedPresets.length; i++) {
                                    var currentPresetName = savedPresets[i].split("_")[1];
                                    currentPresetName = currentPresetName.charAt(0).toUpperCase() + currentPresetName.slice(1);
                                    var buttonId = "load" + currentPresetName.trim();
                                    if (document.getElementById(buttonId) == null){
                                            globalState.set('latest_preset_lang', "k-inv");
                                            createChaosProgramButton(currentPresetName.trim(), globalState.get('latest_preset_lang'));                      
                                    }
                            }
                    }
            }
    };
    oReq.open("GET", k8s_url + "/chaos/loadpreset/savedpresets");
    oReq.send();
}

function loadSavedPreset(tool, lang, defaultpreset) {
    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    if (this.responseText.trim() != "nil") {
                            $("#currentLoadTest").val(this.responseText.trim());
                    } else {
                            $("#currentLoadTest").val(defaultpreset);
                    }
            }
    };
    oReq.open("GET", k8s_url + "/chaos/loadpreset?name=" + tool + "&lang=" + lang);
    oReq.send();
    var now = new Date().toLocaleString().replace(',', '');
    $('#alert_placeholder_programming_mode').replaceWith(alert_div + '[' + now + '] Open preset for ' + tool + '</div>');
    globalState.set('latest_preset_name', tool);
    globalState.set('latest_preset_lang', lang);
}

function resetPreset(kind) {
    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    let capitalizedPreset = globalState.get('latest_preset_name').charAt(0).toUpperCase() + globalState.get('latest_preset_name').slice(1);
                    let buttonId = "load" + capitalizedPreset;
                    // document.getElementById(buttonId).classList.remove('btn-light-saved');
                    // document.getElementById(buttonId).classList.add('btn-light');
                    closeSetLoadTestModal();
                    getSavedPresets();
                    if (kind == 'k-inv') {
                            console.log("[DELETE-K-INV-PROGRAM] " + globalState.get('latest_preset_name') + " deleted");
                            deleteChaosProgramButton(globalState.get('latest_preset_name'));
                    }
                    else {
                            console.log("[RESET-PRESETS] " + globalState.get('latest_preset_name') + " restored with default preset");
                    }
                    var now = new Date().toLocaleString().replace(',','')
                    $('#alert_placeholder_programming_mode').replaceWith(alert_div + '[' + now + '] ' + globalState.get('latest_preset_name') + ' preset has been restored with default code</div>');
                    //$('#alert_placeholder').replaceWith(alert_div + '[' + now + '] ' + globalState.get('latest_preset_name') + ' preset has been restored with default code</div>');
            }
    };;
    if (kind == 'k-inv') {
            console.log("[RESET-PRESETS] Deleting " + globalState.get('latest_preset_name') + " lang " + globalState.get('latest_preset_lang'));
    }
    oReq.open("POST", k8s_url + "/chaos/loadpreset/reset?name="+ globalState.get('latest_preset_name').toLowerCase() + "&lang="+ globalState.get('latest_preset_lang'));
    oReq.send({});
}
